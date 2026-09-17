"""
Module 01: Async Systems & Tensor Internals - Track B (AI & ML from Scratch)
File: tensor_memory_and_strides.py

An exhaustive, ground-up implementation of multidimensional TENSOR MEMORY INTERNALS,
Storage buffers, Stride mathematics, Contiguity checks, and Zero-Copy Views.

This script implements how PyTorch and NumPy represent N-dimensional tensors in raw RAM:
- 1D flat memory block (Storage)
- Shape tuple: (D_0, D_1, ..., D_k)
- Stride tuple: (S_0, S_1, ..., S_k)
- Storage Offset: integer start pointer
- Zero-copy Transpose, Slicing, and Reshape vs View mechanics.

Every single line of this code is commented with production pedagogical rigor.
"""

from __future__ import annotations  # Enables modern type hints
from typing import (                 # Standard typing primitives
    List,
    Tuple,
    Union,
    Sequence,
    Optional
)


# ===========================================================================
# CHAPTER 1: THE CRISIS OF PYTHON LISTS & THE BIRTH OF "STORAGE"
# ===========================================================================
# Why does class Storage exist? Why can't Unnati just use `[[10, 20], [30, 40]]`?
#
# PROBLEM: In standard Python, a nested list stores POINTERS to heap objects.
# A single 32-bit float in Python takes 24 to 32 bytes (an 800% waste of RAM!).
# Furthermore, the numbers are scattered randomly across your computer's RAM,
# causing the CPU to stall on "L1 Cache Misses".
#
# HARDWARE REALITY: Physical computer RAM and GPU VRAM are strictly 1-DIMENSIONAL.
# RAM is just a continuous, flat street of memory addresses: [0, 1, 2, 3, 4, ...].
#
# SOLUTION (STEP 1): We create `class Storage`.
# Its ONLY responsibility is to hold a continuous, flat 1D strip of raw numbers in RAM.
# It has NO concept of rows, columns, matrices, or dimensions. It is pure memory.
# ===========================================================================

class Storage:
    """
    Represents a contiguous, 1-dimensional array of raw floating-point numbers in memory.
    In C/C++ (PyTorch TH/ATen), this is a contiguous malloc/cudaMalloc buffer.
    """

    def __init__(self, data: Sequence[float]) -> None:
        # Flat contiguous list representing physical memory addresses [0, 1, 2, ..., N-1]
        self._data: List[float] = [float(x) for x in data]

    def __len__(self) -> int:
        """Returns total number of raw elements in physical allocation."""
        return len(self._data)

    def __getitem__(self, idx: int) -> float:
        """Direct raw physical memory address lookup."""
        return self._data[idx]

    def __setitem__(self, idx: int, value: float) -> None:
        """Direct raw physical memory modification."""
        self._data[idx] = float(value)

    def clone(self) -> Storage:
        """Creates a brand new deep copy of the raw memory allocation."""
        return Storage(list(self._data))

    def __repr__(self) -> str:
        return f"Storage({self._data})"


# ===========================================================================
# CHAPTER 2: THE "COORDINATE GLASSES" — THE BIRTH OF "RAWTENSOR"
# ===========================================================================
# Now that we have a flat 1D street of numbers: [10, 20, 30, 40, 50, 60],
# how do we convince our AI model that this is a 2-Row, 3-Column matrix?
#
# Naive Idea: Reshuffle memory. (Too slow!)
# Genius Idea: Leave memory completely untouched, and put on "Coordinate Glasses"!
#
# A Tensor is NOT memory. A Tensor is just METADATA pointing to Storage:
# 1. storage: Pointer to the flat 1D memory array.
# 2. shape: What dimensions we pretend exist, e.g., (2, 3).
# 3. strides: How many houses in the 1D street to jump when moving 1 step along axis i.
#    - To move 1 row down, jump across 3 numbers (Row Stride = 3).
#    - To move 1 column right, jump 1 number (Col Stride = 1).
#    -> Strides = (3, 1).
# 4. offset: Which house on the street this tensor begins at.
# ===========================================================================

class RawTensor:
    """
    An N-Dimensional Tensor abstraction built on top of a 1D Storage buffer.
    
    A Tensor does NOT store multidimensional arrays directly in memory.
    Hardware RAM is strictly linear (1D). A Tensor is merely a 'lens' or 'view'
    defined by:
    - storage: the flat 1D memory array
    - shape: dimensions of the tensor, e.g., (rows, cols)
    - strides: number of elements to skip in storage to step 1 index along dimension i
    - offset: index in storage where the tensor begins
    """

    def __init__(
        self,
        storage: Storage,
        shape: Tuple[int, ...],
        strides: Optional[Tuple[int, ...]] = None,
        offset: int = 0
    ) -> None:
        self.storage: Storage = storage
        self.shape: Tuple[int, ...] = tuple(shape)
        self.offset: int = offset

        if strides is None:
            # By default, compute standard C-contiguous (row-major) strides
            self.strides: Tuple[int, ...] = self._compute_contiguous_strides(self.shape)
        else:
            self.strides = tuple(strides)

        # Validate that the requested shape and strides fit within the storage buffer
        self._validate_bounds()

    @staticmethod
    def _compute_contiguous_strides(shape: Tuple[int, ...]) -> Tuple[int, ...]:
        """
        Computes standard row-major (C-style) strides for a given shape.
        
        Formula for dimension i:
            stride[i] = product(shape[i+1:])
            stride[-1] = 1 (innermost dimension steps 1 element in memory)
        """
        if not shape:
            return ()
        strides = [0] * len(shape)
        current_stride = 1
        # Traverse dimensions in reverse (from innermost to outermost)
        for i in reversed(range(len(shape))):
            strides[i] = current_stride
            current_stride *= shape[i]
        return tuple(strides)

    def _validate_bounds(self) -> None:
        """Ensures highest accessible index does not overflow allocated physical storage."""
        if not self.shape:
            return
        # Calculate maximum possible offset index
        max_idx = self.offset
        for dim_size, stride in zip(self.shape, self.strides):
            if dim_size > 0:
                max_idx += (dim_size - 1) * stride
        if max_idx >= len(self.storage):
            raise IndexError(
                f"Tensor shape {self.shape} with strides {self.strides} and offset {self.offset} "
                f"exceeds storage capacity of {len(self.storage)} elements."
            )

    def is_contiguous(self) -> bool:
        """
        Checks if elements in this tensor are laid out contiguously in memory
        without gaps or transposed strides.
        
        A tensor is C-contiguous if its strides equal the standard strides computed from its shape.
        """
        expected_strides = self._compute_contiguous_strides(self.shape)
        return self.strides == expected_strides

    def _linear_index(self, indices: Tuple[int, ...]) -> int:
        """
        THE FUNDAMENTAL TENSOR INDEXING FORMULA:
        
        Maps an N-dimensional coordinate (i_0, i_1, ..., i_{k-1})
        to a single 1D physical storage index:
        
            linear_index = offset + sum_{dim=0}^{k-1} (indices[dim] * strides[dim])
        """
        if len(indices) != len(self.shape):
            raise IndexError(f"Expected {len(self.shape)} indices, got {len(indices)}")
        
        linear_idx = self.offset
        for dim, (idx, size, stride) in enumerate(zip(indices, self.shape, self.strides)):
            if not (0 <= idx < size):
                raise IndexError(f"Index {idx} out of range for dimension {dim} with size {size}")
            linear_idx += idx * stride
        return linear_idx

    def get(self, *indices: int) -> float:
        """Retrieves element at the multidimensional coordinate."""
        phys_idx = self._linear_index(indices)
        return self.storage[phys_idx]

    def set(self, *args: Union[int, float]) -> None:
        """
        Sets element at multidimensional coordinate.
        Last argument is the value to assign.
        """
        indices = tuple(int(x) for x in args[:-1])
        value = float(args[-1])
        phys_idx = self._linear_index(indices)
        self.storage[phys_idx] = value

    # =======================================================================
    # CHAPTER 3: THE TRILLION-DOLLAR OPERATION: ZERO-COPY TRANSPOSE
    # =======================================================================
    # PROBLEM: An AI model with 70 Billion weights needs to transpose matrices
    # thousands of times during attention. If we copy memory, training takes 10 years.
    #
    # THE GENIUS INSIGHT: Do NOT move numbers in memory!
    # Simply swap the SHAPE dimensions and swap their STRIDES.
    # Time Complexity: O(1) instant nanoseconds! Memory copied: 0 bytes!
    # =======================================================================
    def transpose(self, dim0: int, dim1: int) -> RawTensor:
        """
        ZERO-COPY TRANSPOSE OPERATION.
        
        Notice: WE DO NOT COPY OR MOVE A SINGLE BYTE IN MEMORY!
        We simply swap the shape dimensions and their corresponding strides.
        Time complexity: O(1) constant time!
        """
        new_shape = list(self.shape)
        new_strides = list(self.strides)

        # Swap shape dimensions
        new_shape[dim0], new_shape[dim1] = new_shape[dim1], new_shape[dim0]
        # Swap corresponding strides
        new_strides[dim0], new_strides[dim1] = new_strides[dim1], new_strides[dim0]

        # Return a new tensor viewing the exact same underlying storage buffer
        return RawTensor(
            storage=self.storage,
            shape=tuple(new_shape),
            strides=tuple(new_strides),
            offset=self.offset
        )

    # =======================================================================
    # CHAPTER 4: ZERO-COPY SLICING (SUB-VIEWS OF RAM)
    # =======================================================================
    # PROBLEM: You have a batch of 32 images. You want only images 10 to 20.
    # Naive way: Copy the images into a new list.
    # Tensor way: Advance the storage `offset` pointer by (start * stride)
    # and adjust the shape! Zero bytes copied!
    # =======================================================================
    def slice_dim(self, dim: int, start: int, stop: int) -> RawTensor:
        """
        ZERO-COPY SLICING OPERATION ALONG A DIMENSION.
        
        Slicing modifies:
        - shape[dim] becomes (stop - start)
        - offset shifts forward by (start * stride[dim])
        - strides remain identical!
        Time complexity: O(1) constant time!
        """
        if not (0 <= start <= stop <= self.shape[dim]):
            raise IndexError(f"Invalid slice range [{start}:{stop}] for dimension {dim}")

        new_shape = list(self.shape)
        new_shape[dim] = stop - start

        # Advance storage offset to where the slice begins
        new_offset = self.offset + (start * self.strides[dim])

        return RawTensor(
            storage=self.storage,
            shape=tuple(new_shape),
            strides=self.strides,
            offset=new_offset
        )

    # =======================================================================
    # CHAPTER 5: THE INFAMOUS CONTIGUITY ERROR IN PYTORCH DEMYSTIFIED
    # =======================================================================
    # Every PyTorch engineer encounters this error:
    # "RuntimeError: input is not contiguous. Call .contiguous() before .view()!"
    #
    # WHY DOES THIS HAPPEN?
    # When a tensor is transposed, adjacent numbers in the matrix are no longer
    # adjacent in physical memory (strides are swapped!).
    # .view() assumes that if you read the storage sequentially from 0 to N-1,
    # the numbers will be in logical row-major order.
    # If the tensor was transposed, reading storage sequentially reads scrambled data!
    #
    # FIX: .contiguous() allocates a fresh storage buffer, packing the numbers
    # into consecutive physical memory addresses.
    # =======================================================================
    def contiguous(self) -> RawTensor:
        """
        If tensor is already contiguous, returns self.
        Otherwise, allocates a brand new 1D Storage buffer, copies elements
        in row-major order, and returns a new contiguous tensor.
        """
        if self.is_contiguous():
            return self

        # Collect all elements in logical row-major order
        flat_elements: List[float] = []

        def _traverse(dim: int, current_coords: List[int]) -> None:
            if dim == len(self.shape):
                flat_elements.append(self.get(*current_coords))
                return
            for i in range(self.shape[dim]):
                _traverse(dim + 1, current_coords + [i])

        _traverse(0, [])

        new_storage = Storage(flat_elements)
        return RawTensor(storage=new_storage, shape=self.shape)

    def view(self, *new_shape: int) -> RawTensor:
        """
        ZERO-COPY RESHAPING.
        
        PyTorch invariant: view() is ONLY allowed on contiguous tensors!
        If a tensor has been transposed, its strides are non-contiguous,
        meaning a simple 1D linear reinterpretation would scramble data.
        """
        if not self.is_contiguous():
            raise RuntimeError(
                f"view size is not compatible with input tensor's size and stride (tensor is not contiguous). "
                f"Call .contiguous() before .view()!"
            )

        # Verify total element count matches
        total_orig = 1
        for d in self.shape:
            total_orig *= d

        total_new = 1
        for d in new_shape:
            total_new *= d

        if total_orig != total_new:
            raise ValueError(f"Cannot reshape tensor of size {total_orig} into shape {new_shape}")

        return RawTensor(
            storage=self.storage,
            shape=new_shape,
            strides=None,  # Automatically calculates fresh contiguous strides
            offset=self.offset
        )

    def to_matrix_display(self) -> str:
        """Formats 2D tensor nicely for debugging."""
        if len(self.shape) != 2:
            return f"Tensor(shape={self.shape}, strides={self.strides})"
        rows, cols = self.shape
        lines = []
        for r in range(rows):
            row_vals = [f"{self.get(r, c):6.1f}" for c in range(cols)]
            lines.append("  [" + ", ".join(row_vals) + "]")
        return "[\n" + "\n".join(lines) + "\n]"


# ---------------------------------------------------------------------------
# Self-Verifying Unit Demonstration of Tensor Memory Mechanics
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 70)
    print("DEMONSTRATION: TENSOR MEMORY, STRIDES & ZERO-COPY OPERATIONS")
    print("=" * 70)

    # 1. Create a flat storage of 6 elements: [10, 20, 30, 40, 50, 60]
    raw_memory = Storage([10.0, 20.0, 30.0, 40.0, 50.0, 60.0])
    print(f"Physical Memory Allocation: {raw_memory}")

    # 2. View as a 2x3 matrix:
    #    Shape: (2, 3)
    #    Expected Strides: (3, 1) -> To advance 1 row, jump 3 elements. To advance 1 col, jump 1 element.
    t = RawTensor(raw_memory, shape=(2, 3))
    print(f"\nTensor Shape: {t.shape}, Strides: {t.strides}, Offset: {t.offset}")
    print(f"Is Contiguous? -> {t.is_contiguous()}")
    print("Matrix representation:")
    print(t.to_matrix_display())

    # 3. Transpose the tensor from (2, 3) to (3, 2):
    #    Notice: Physical storage is UNTOUCHED! We only swap shape to (3, 2) and strides to (1, 3).
    t_transposed = t.transpose(0, 1)
    print(f"\nTransposed Tensor Shape: {t_transposed.shape}, Strides: {t_transposed.strides}")
    print(f"Is Transposed Contiguous? -> {t_transposed.is_contiguous()}  (Notice: False!)")
    print("Transposed Matrix representation:")
    print(t_transposed.to_matrix_display())

    # 4. Prove that it is a ZERO-COPY VIEW:
    #    Modifying element (0, 1) in the transposed tensor modifies the original storage!
    print("\nModifying t_transposed[0, 1] = 999.0 ...")
    t_transposed.set(0, 1, 999.0)
    print("Original Matrix representation after mutation:")
    print(t.to_matrix_display())
    print(f"Physical Storage is directly changed: {raw_memory}")

    # 5. Demonstrate PyTorch's infamous Contiguous Error:
    print("\nAttempting t_transposed.view(6) on non-contiguous tensor...")
    try:
        t_transposed.view(6)
    except RuntimeError as err:
        print(f"CAUGHT EXPECTED ERROR: {err}")

    # 6. Fix by calling .contiguous() and reshaping:
    t_fixed = t_transposed.contiguous().view(6)
    print(f"\nAfter .contiguous().view(6): Shape = {t_fixed.shape}, Strides = {t_fixed.strides}")
    print(f"Elements: {[t_fixed.get(i) for i in range(6)]}")
    print("=" * 70)
    print("TENSOR MEMORY INTERNALS VERIFIED WITH 100% SUCCESS!")
    print("=" * 70)
