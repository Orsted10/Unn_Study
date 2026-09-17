# Foundational Master Guide: Hardware, Operating Systems, Networking & Python Internals
## *Module 01 Prerequisites & Core Principles for Unnati*

---

> "Before you can build an asynchronous event loop or an HTTP server, you must understand what happens when electricity flows through silicon, how an operating system schedules instructions, how network wires carry bits across continents, and how Python executes code line by line."

---

## 1. Computer Hardware Architecture: The Physical Reality

Every line of backend code we write ultimately runs on physical hardware. Here is what exists inside the machine:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CENTRAL PROCESSING UNIT (CPU)                 │
│                                                                         │
│   ┌─────────────────────────── Core 0 ──────────────────────────────┐   │
│   │  [ Registers (rax, rbx, rip) ]    ~0.5 nanoseconds latency       │   │
│   │  [ Level 1 Cache (L1) - 32 KB ]   ~1 nanosecond latency          │   │
│   │  [ Level 2 Cache (L2) - 512 KB ]  ~4 nanoseconds latency         │   │
│   │  [ Arithmetic Logic Unit (ALU) ]  Executes math & bitwise logic │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                  │                                      │
│   ┌──────────────────────────────┴──────────────────────────────────┐   │
│   │  Shared Level 3 Cache (L3) - 16 MB to 64 MB (~10-20 ns latency) │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ Memory Bus (DDR4 / DDR5)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 RANDOM ACCESS MEMORY (RAM) - 16 GB to 128 GB            │
│                 Latency: ~60 to 100 nanoseconds                         │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ PCIe Bus / NVMe
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 SOLID STATE DRIVE (SSD) / HARD DRIVE (HDD)              │
│                 SSD Latency: ~50,000 ns (50 microseconds)               │
│                 HDD Latency: ~10,000,000 ns (10 milliseconds)           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.1 The Latency Numbers Every Backend Engineer Must Memorize
If a CPU register access (~0.5 ns) were scaled to **1 second**:
- **L1 Cache reference**: 2 seconds
- **L2 Cache reference**: 8 seconds
- **L3 Cache reference**: 40 seconds
- **Main RAM access**: **3 to 4 minutes!**
- **NVMe SSD I/O**: **1.5 days!**
- **HDD Seek time**: **8 months!**
- **Sending an internet packet from New York to London**: **5 years!**

### Why This Matters for Backend Architecture:
When your backend code waits for a database query over the network or waits for an incoming TCP socket read, the CPU is waiting for the equivalent of **5 years**.
If your server uses synchronous blocking threads, the CPU core sits completely idle, doing zero useful work during that entire time! Asynchronous programming exists so the CPU can execute millions of other instructions while waiting.

---

## 2. Operating System Internals: Kernel Space vs User Space

The CPU hardware enforces security levels called **Protection Rings** (Rings 0 through 3 in x86 architecture):

```
                     ┌──────────────────────────────┐
                     │          RING 3              │
                     │       User Space             │
                     │  (Your Python Code,          │
                     │   Databases, Web Browsers)   │
                     │   Cannot touch hardware!     │
                     └──────────────┬───────────────┘
                                    │ System Call
                                    │ (syscall instruction)
                                    ▼
                     ┌──────────────────────────────┐
                     │          RING 0              │
                     │       Kernel Space           │
                     │  (Linux / Windows Kernel)    │
                     │   Direct hardware access,    │
                     │   NIC drivers, Page tables   │
                     └──────────────────────────────┘
```

1. **User Space (Ring 3)**:
   - Where your Python scripts, FastAPI servers, and PostgreSQL processes run.
   - User space code is **sandboxed**. It cannot directly send a packet to the network card, read raw sectors from an SSD, or allocate physical RAM pins.
2. **Kernel Space (Ring 0)**:
   - The core of the operating system (the Linux Kernel or Windows NT Kernel).
   - Has unrestricted access to physical CPU instructions and device drivers.
3. **The System Call (Syscall)**:
   - Whenever your Python code wants to perform I/O (e.g., `socket.recv()`, `socket.send()`, `open()`), it must make a **System Call**.
   - The CPU switches from Ring 3 to Ring 0 (a context switch). The kernel validates your request, communicates with the network interface card (NIC), and switches back to Ring 3.

---

## 3. What is a File Descriptor (FD)?

In Unix and Linux, there is a famous philosophy: **"Everything is a file"**.
- A regular file on disk is an FD.
- A terminal keyboard input (`stdin`) is FD `0`.
- A terminal screen output (`stdout`) is FD `1`.
- An error stream (`stderr`) is FD `2`.
- **A network TCP socket is also an FD!** (e.g., FD `3`, FD `4`).
- An operating system pipe or IPC channel is an FD.

A **File Descriptor** is simply a non-negative integer (e.g., `3`, `4`, `15`) that acts as an index into the kernel's **Process File Descriptor Table**:

```
Process (Userspace)          Kernel Space
┌─────────────────┐          ┌───────────────────────────────────────────────┐
│ FD Table        │          │ Open File Table Entry                         │
│ Index 0 (stdin) ├─────────►│ Keyboard input stream                         │
│ Index 1 (stdout)├─────────►│ Screen video buffer                           │
│ Index 2 (stderr)├─────────►│ Screen video buffer                           │
│ Index 3 (socket)├─────────►│ TCP Socket Struct (IP: 127.0.0.1, Port: 8080) │
│ Index 4 (socket)├─────────►│ TCP Client Struct (Remote: 192.168.1.5:54321) │
└─────────────────┘          └───────────────────────────────────────────────┘
```

When Unnati writes:
```python
self.selector.register(client_sock, selectors.EVENT_READ)
```
Python is telling the OS kernel: *"Watch File Descriptor #4. The moment electricity arrives on the network cable and fills its receive buffer, wake me up!"*

---

## 4. Processes vs Threads vs Coroutines

| Dimension | OS Process | OS Thread | Async Coroutine |
|---|---|---|---|
| **Memory Isolation** | 100% Isolated address space | Shared memory within process | Shared memory within thread |
| **Creation Cost** | Heavy (Copies page tables, ~10-50 ms) | Medium (~1-2 ms) | Microscopic (~0.0001 ms, simple Python object) |
| **RAM Consumption** | ~20 MB - 100 MB per process | ~1 MB - 8 MB stack per thread | **~1 KB to 2 KB** per coroutine! |
| **Context Switch** | Slow (Flushes CPU TLB cache, ~1000 ns) | Medium (~100-500 ns) | Ultra-fast userspace jump (~10 ns) |
| **Scheduling** | Preemptive (OS Kernel interrupts) | Preemptive (OS Kernel interrupts) | **Cooperative** (Yields voluntarily via `await`) |
| **Concurrency Limit** | Hundreds | Thousands | **100,000 to 1,000,000+** |

### What is Preemptive vs Cooperative Multitasking?
- **Preemptive (Threads)**: The operating system scheduler has a hardware timer interrupt that fires every 1 to 10 milliseconds. The OS forcefully halts whatever thread is running, saves its CPU registers, and switches to another thread.
  - *The Danger*: A thread can be interrupted in the middle of modifying a shared variable, causing **Race Conditions** and requiring mutex locks, semaphores, and deadlocks.
- **Cooperative (Async Coroutines)**: The OS kernel does not schedule coroutines. Coroutines schedule themselves! A coroutine runs unimpeded until it reaches an explicit `await` keyword (e.g. `await socket.recv()`). It voluntarily yields control back to the Event Loop.
  - *The Advantage*: Since code between two `await` statements is guaranteed to run without interruption, entire categories of multithreading race conditions disappear!

---

## 5. The Python Global Interpreter Lock (GIL) Demystified

Why can't Python threads use all CPU cores at the same time?

### 5.1 CPython Memory Management and `ob_refcnt`
Inside CPython (the official C implementation of Python), every single Python object is represented by a C structure called `PyObject`:

```c
typedef struct _object {
    _PyObject_HEAD_EXTRA
    Py_ssize_t ob_refcnt;          /* Reference count */
    struct _typeobject *ob_type;   /* Pointer to object type */
} PyObject;
```
Every time a variable points to an object, `ob_refcnt` increases by 1. When a variable goes out of scope, `ob_refcnt` decreases by 1. When `ob_refcnt == 0`, the memory is immediately deallocated.

### 5.2 The Threading Dilemma
If two native OS threads running on Core 0 and Core 1 simultaneously modify `ob_refcnt` on the same object without locking:
- A race condition could cause `ob_refcnt` to decrement to 0 while an object is still in use (leading to a **Segmentation Fault** / memory corruption).
- Or `ob_refcnt` could fail to decrement, leaking memory forever.

To prevent this without putting slow fine-grained mutex locks around every single integer and string in the entire language, Guido van Rossum implemented the **Global Interpreter Lock (GIL)**:
> **The GIL Rule**: Exactly **ONE** native OS thread can execute Python bytecode at any given moment, even on a 64-core processor!

### 5.3 When is the GIL Released?
1. **During Network / Disk I/O**: When a thread calls `socket.recv()`, `time.sleep()`, or reads a file, CPython **releases the GIL** while waiting for the OS kernel!
2. **Inside Optimized C Extensions**: NumPy and PyTorch release the GIL during heavy C++/CUDA matrix calculations!
3. **Python 3.13 Free-Threaded Mode (PEP 703)**: In Python 3.13+, a new build option disables the GIL using mimalloc biased reference counting, allowing true multi-core Python threading.

### The Golden Rule for Backend & AI:
- **I/O-Bound Workloads** (Web servers, APIs, database querying, scraping): Use **Asyncio / Event Loops** (Single thread, high concurrency).
- **CPU-Bound Python Workloads** (Parsing massive JSON, heavy hashing): Use **Multiprocessing** (Separate processes with separate GILs).
- **Heavy Mathematical AI Training**: Use **PyTorch / C++ / CUDA** (Bypasses the GIL entirely).

---

## 6. Networking & The TCP/IP Protocol Suite

```
┌────────────────────────────────────────────────────────┐
│ 4. APPLICATION LAYER (HTTP/1.1, HTTP/2, gRPC, DNS)    │
│    Format: Human-readable text or Protobuf binary      │
├────────────────────────────────────────────────────────┤
│ 3. TRANSPORT LAYER (TCP, UDP)                          │
│    Port numbers (e.g. 80, 443, 8080), Reliable delivery│
├────────────────────────────────────────────────────────┤
│ 2. NETWORK / INTERNET LAYER (IP - IPv4 / IPv6)         │
│    Routing across routers, IP addresses (192.168.1.1)  │
├────────────────────────────────────────────────────────┤
│ 1. LINK / PHYSICAL LAYER (Ethernet, Wi-Fi, Fiber)      │
│    MAC Addresses, Electrical voltages, Light pulses    │
└────────────────────────────────────────────────────────┘
```

### 6.1 What is an IP Address and a Port?
- **IP Address (Host Identifier)**: Identifies the *machine* on the global network (e.g., `142.250.190.46` for Google).
- **Port Number (Process Identifier)**: Identifies which *specific application* on that machine should receive the packet:
  - Ports range from `0` to `65535` (a 16-bit unsigned integer).
  - Ports `0 - 1023`: **Well-Known System Ports** (Port 80 = HTTP, 443 = HTTPS, 22 = SSH, 53 = DNS). Requires root/admin permissions to bind.
  - Ports `1024 - 49151`: **Registered User Ports** (Port 5432 = PostgreSQL, 6379 = Redis, 8080 = Custom Web Servers).
  - Ports `49152 - 65535`: **Ephemeral Dynamic Ports** (Assigned automatically by the OS to outgoing client connections).

### 6.2 The TCP 3-Way Handshake (Connection Establishment)
TCP (Transmission Control Protocol) is a connection-oriented protocol that guarantees bytes arrive **in order, without loss, and without duplication**.

Before a single byte of HTTP data can be transmitted, the client and server perform the **Three-Way Handshake**:

```
   CLIENT                                                    SERVER
     │                                                         │
     │  1. SYN (Synchronize: "Let's connect, my Seq = 1000")   │
     ├────────────────────────────────────────────────────────►│ (State: LISTEN -> SYN-RCVD)
     │                                                         │
     │  2. SYN-ACK ("I agree! Ack = 1001, my Seq = 5000")      │
     │◄────────────────────────────────────────────────────────┤
     │                                                         │
     │  3. ACK ("Understood! Ack = 5001. We are CONNECTED!")   │
     ├────────────────────────────────────────────────────────►│ (State: ESTABLISHED)
     │                                                         │
     │           READY FOR HTTP REQUEST DATA                   │
```
In our `raw_socket_http_server.py`, the OS kernel handles Steps 1, 2, and 3 in the background backlog queue. When Step 3 finishes, the socket becomes readable, and `server_sock.accept()` returns the connected client socket!

### 6.3 What is a Byte and Character Encoding?
- **Bit**: A single binary digit: `0` or `1` (a transistor voltage state).
- **Byte**: Exactly 8 bits grouped together: `00000000` to `11111111` ($2^8 = 256$ possible values, integer $0$ to $255$).
- **ASCII (1963)**: Uses 7 bits (0 to 127) to represent English letters (`A` = 65, `a` = 97, space = 32, newline `\n` = 10, carriage return `\r` = 13).
- **ISO-8859-1 (Latin-1)**: Uses all 8 bits (0 to 255) to support Western European characters. HTTP headers historically use this format.
- **UTF-8 (1992)**: A variable-length Unicode encoding (1 to 4 bytes per character).
  - Standard English characters take 1 byte (identical to ASCII).
  - Greek, Arabic, Hindi take 2 to 3 bytes.
  - Emojis (e.g. 🚀, 🤖) take 4 bytes.

When writing low-level networking code:
- Text must be **encoded** to raw bytes before transmission: `"Hello".encode('utf-8') -> b'Hello'`.
- Raw bytes must be **decoded** back into Python strings: `chunk.decode('utf-8') -> "Hello"`.

---

## 7. Python Generators and Coroutine Mechanics

How does Python actually pause a function and resume it later?

### 7.1 Standard Function vs Generator
- A standard function has one entry point (`def foo():`) and one exit point (`return`). When it returns, its stack frame (local variables) is destroyed.
- A **Generator function** contains the `yield` keyword. When called, it does NOT execute the code immediately! Instead, it returns a **Generator Object**:

```python
def number_counter():
    print("Step 1: Starting")
    yield 100
    print("Step 2: Resuming")
    yield 200
    print("Step 3: Finishing")
    return "Done!"
```

```text
gen = number_counter()        # Nothing prints! Generator is paused at the beginning.
val1 = next(gen)             # Prints: "Step 1: Starting", returns 100.
                             # Python FREEZES the local variables and instruction pointer!
val2 = next(gen)             # Prints: "Step 2: Resuming", returns 200.
val3 = next(gen)             # Prints: "Step 3: Finishing", raises StopIteration("Done!")
```

### 7.2 The `send()` Method: Two-Way Communication
Generators are not just one-way producers; they can receive data from the outside world!
```python
def interactive_coroutine():
    name = yield "What is your name?"
    print(f"Hello, {name}!")
```
```python
coro = interactive_coroutine()
prompt = coro.send(None)    # Advances to the first yield, returns "What is your name?"
coro.send("Unnati")         # Sends "Unnati" INTO the generator where it assigns to 'name'!
```
This exact mechanism is how our `Task._step()` method works:
When an awaited future finishes with a result, the event loop calls:
```python
self._coro.send(resolved_value)
```
This injects the result straight into the paused coroutine at the exact spot where it executed `await`!

---

## 8. Priority Queues & The Binary Min-Heap (`heapq`)

Why did we use `heapq` in `custom_async_event_loop.py` for timers instead of a regular Python list?

### The List Approach (Inefficient):
If you store 1,000 scheduled timers in an unsorted list:
- To find which timer expires first, you must scan all 1,000 items: **$O(N)$ linear time complexity**.
- Running this check 50,000 times per second consumes massive CPU cycles.

### The Binary Min-Heap Approach (Optimal):
A **Binary Min-Heap** is a complete binary tree where every parent node is smaller than or equal to its children:

```
                  [ 10:00:01 AM ] (Root: Earliest deadline)
                   /             \
       [ 10:00:04 AM ]         [ 10:00:02 AM ]
        /           \           /
 [ 10:00:10 AM ] [ 10:00:05 AM ] [ 10:00:08 AM ]
```

- **Inspect Earliest Timer (`heap[0]`)**: **$O(1)$ instant constant time!** The root is always guaranteed to be the earliest deadline.
- **Insert a New Timer (`heappush`)**: **$O(\log N)$ logarithmic time** (swapping with parents up the tree). For 1,000,000 items, $\log_2(1,000,000) \approx 20$ operations!
- **Pop Expired Timer (`heappop`)**: **$O(\log N)$** (rebalancing the tree).

This data structure ensures our custom asynchronous event loop can manage tens of thousands of active timers with virtually zero CPU overhead!

---
*With these hardware, OS, networking, and language foundations firmly understood, Unnati is ready to dissect every single line of backend and ML implementation code!*
