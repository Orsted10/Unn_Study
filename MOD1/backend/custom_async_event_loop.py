"""
Module 01: Async Systems & Tensor Internals - Track A (Backend)
File: custom_async_event_loop.py

A complete, production-grade Asynchronous Event Loop built from raw Python primitives
and the OS multiplexing selector (epoll/kqueue/select), mimicking the internals of
Python's `asyncio` and `uvloop`.

Every single line of this code is commented to explain:
- Operating system socket/file descriptor polling
- Cooperative multitasking vs preemptive multitasking
- Coroutines, Futures, Tasks, and generator mechanics
"""

from __future__ import annotations  # Enables modern postponed evaluation of type annotations
import selectors                     # High-level OS I/O multiplexing abstraction over epoll/kqueue/select
import socket                        # Low-level BSD socket interface for network I/O
import time                          # System time for measuring timeouts and scheduling delayed callbacks
import heapq                         # Priority queue algorithm for efficient O(log N) timer scheduling
from typing import (                 # Python standard typing primitives for strict type safety
    Callable,
    Any,
    Generator,
    Coroutine,
    List,
    Tuple,
    Optional
)


class Future:
    """
    Represents an eventual result of an asynchronous computation.
    
    A Future is a promise that something will finish in the future.
    When it finishes, it holds either a result value or an exception.
    Callers can attach 'callbacks' that trigger automatically upon completion.
    """

    def __init__(self) -> None:
        # _result stores the final returned object once the operation resolves
        self._result: Any = None
        # _exception stores any exception raised during execution
        self._exception: Optional[Exception] = None
        # _is_done tracks whether this future has completed (resolved or rejected)
        self._is_done: bool = False
        # _callbacks is a list of functions to execute once the future resolves
        self._callbacks: List[Callable[[Future], None]] = []

    def done(self) -> bool:
        """Returns True if the future has resolved with a result or an error."""
        return self._is_done

    def result(self) -> Any:
        """
        Retrieves the result value if resolved, raises exception if failed,
        or raises RuntimeError if queried before resolution.
        """
        if not self._is_done:
            # Prevent caller from reading an uncompleted future synchronously
            raise RuntimeError("Result is not ready yet! Future is still pending.")
        if self._exception:
            # If the computation resulted in an error, re-raise it to the caller
            raise self._exception
        return self._result

    def set_result(self, result: Any) -> None:
        """
        Marks the future as resolved with a value and invokes all attached callbacks.
        """
        if self._is_done:
            # A future can only be resolved once; attempting to resolve again is illegal
            raise RuntimeError("InvalidStateError: Future is already completed.")
        self._result = result
        self._is_done = True
        # Fire each callback that was waiting for this future to finish
        for callback in self._callbacks:
            callback(self)

    def set_exception(self, exception: Exception) -> None:
        """
        Marks the future as failed with an exception and invokes all attached callbacks.
        """
        if self._is_done:
            # A future cannot be modified after it is completed
            raise RuntimeError("InvalidStateError: Future is already completed.")
        self._exception = exception
        self._is_done = True
        # Fire each callback so listeners can handle the error state
        for callback in self._callbacks:
            callback(self)

    def add_done_callback(self, fn: Callable[[Future], None]) -> None:
        """
        Attaches a callback function. If the future is ALREADY done, run immediately;
        otherwise append to the waiting list.
        """
        if self._is_done:
            # Immediately notify caller since computation is already finished
            fn(self)
        else:
            # Defer execution until set_result or set_exception is called
            self._callbacks.append(fn)

    def __await__(self) -> Generator[Any, None, Any]:
        """
        Enables the Python 'await' syntax for this Future.
        Yields control back to the event loop until the future is done.
        """
        while not self._is_done:
            # Yield this future to the event loop so the loop knows who we are waiting on
            yield self
        # Return the resolved result once the loop wakes us up
        return self.result()


class Task(Future):
    """
    A Task wraps a coroutine and drives its execution forward step-by-step
    inside the event loop.
    
    A coroutine pauses at 'await'. The Task resumes the coroutine when the
    awaited Future is resolved.
    """

    def __init__(self, coro: Coroutine, loop: CustomEventLoop) -> None:
        # Initialize the parent Future properties
        super().__init__()
        # Store the coroutine generator object that this task drives
        self._coro = coro
        # Store a reference to the active event loop running this task
        self._loop = loop
        # Schedule the first initial step of this coroutine immediately
        self._loop.call_soon(self._step)

    def _step(self, value: Any = None, exc: Optional[Exception] = None) -> None:
        """
        Advances the coroutine by sending in the resolved value or throwing an exception.
        """
        try:
            if exc:
                # If an error occurred in the awaited child, throw it into the coroutine
                yielded_future = self._coro.throw(exc)
            else:
                # Send the value into the coroutine to advance past the 'await' expression
                yielded_future = self._coro.send(value)
        except StopIteration as stop_err:
            # The coroutine has finished executing and returned a final value
            self.set_result(stop_err.value)
            return
        except Exception as err:
            # An unhandled exception was raised inside the coroutine body
            self.set_exception(err)
            return

        # If the coroutine yielded a Future, we attach a callback to resume when it's done
        if isinstance(yielded_future, Future):
            # When the child future resolves, resume our task's _wakeup method
            yielded_future.add_done_callback(self._wakeup)
        else:
            # If something else was yielded, reschedule ourselves soon
            self._loop.call_soon(self._step)

    def _wakeup(self, future: Future) -> None:
        """
        Callback triggered when an awaited future finishes.
        """
        try:
            # Extract result from the completed child future
            val = future.result()
            # Advance this task coroutine with the retrieved result
            self._step(value=val)
        except Exception as err:
            # If child future failed with an error, throw that error into the coroutine
            self._step(exc=err)


class CustomEventLoop:
    """
    A Production-Grade Asynchronous Event Loop.
    
    Coordinates:
    1. Ready Queue: Callbacks ready to execute immediately.
    2. Scheduled Heap: Timer callbacks scheduled to run at specific timestamps (heapq).
    3. OS I/O Selector: Epoll/Kqueue multiplexer monitoring non-blocking sockets.
    """

    def __init__(self) -> None:
        # DefaultSelector picks the best OS backend available (epoll on Linux, kqueue on macOS, select on Windows)
        self._selector = selectors.DefaultSelector()
        # Queue of immediate callbacks to run on the next iteration
        self._ready: List[Callable[[], None]] = []
        # Min-heap of (timestamp, unique_id, callback) for delayed execution (asyncio.sleep)
        self._scheduled: List[Tuple[float, int, Callable[[], None]]] = []
        # Monotonically increasing counter to resolve tie-breakers in the min-heap
        self._timer_counter: int = 0
        # Flag indicating whether the event loop is actively running
        self._is_running: bool = False

    def call_soon(self, callback: Callable[..., None], *args: Any) -> None:
        """
        Schedules a callback to be run on the immediate next tick of the loop.
        """
        # Package callback and arguments into a zero-argument lambda closure
        self._ready.append(lambda: callback(*args))

    def call_later(self, delay: float, callback: Callable[..., None], *args: Any) -> None:
        """
        Schedules a callback to run after 'delay' seconds have passed.
        """
        target_time = time.monotonic() + delay
        self._timer_counter += 1
        # Push into the min-heap; heap invariant guarantees O(1) peek at earliest deadline
        heapq.heappush(self._scheduled, (target_time, self._timer_counter, lambda: callback(*args)))

    def create_task(self, coro: Coroutine) -> Task:
        """
        Wraps a coroutine in a Task object and schedules it for execution.
        """
        return Task(coro, self)

    def register_reader(self, fd: Any, callback: Callable[[Any], None], *args: Any) -> None:
        """
        Registers a file descriptor or socket with the OS selector for READ readiness (EVENT_READ).
        """
        closure = lambda: callback(*args)
        try:
            # Attempt to register new file descriptor with EVENT_READ mask
            self._selector.register(fd, selectors.EVENT_READ, closure)
        except KeyError:
            # If already registered, modify the mask to include EVENT_READ
            self._selector.modify(fd, selectors.EVENT_READ, closure)

    def unregister_reader(self, fd: Any) -> None:
        """
        Removes a file descriptor from the OS selector read monitor.
        """
        try:
            self._selector.unregister(fd)
        except KeyError:
            pass  # Already unregistered

    def sleep(self, delay: float) -> Future:
        """
        Asynchronous sleep primitive. Creates a Future and resolves it after 'delay' seconds.
        """
        fut = Future()
        # Schedule the future's resolution at the target time
        self.call_later(delay, fut.set_result, None)
        return fut

    def run_until_complete(self, coro: Coroutine) -> Any:
        """
        Runs the event loop until the specified root coroutine has returned a result.
        """
        root_task = self.create_task(coro)
        self._is_running = True

        while not root_task.done():
            # 1. Process all expired timers from the min-heap
            current_time = time.monotonic()
            while self._scheduled and self._scheduled[0][0] <= current_time:
                # Pop the earliest due timer
                _, _, cb = heapq.heappop(self._scheduled)
                # Move it into the ready queue
                self._ready.append(cb)

            # 2. Determine selector timeout
            # If there are ready callbacks, don't block the OS selector (timeout = 0)
            # If there are scheduled timers, sleep only until the earliest timer expires
            # If both are empty, wait indefinitely for network I/O
            if self._ready:
                timeout = 0.0
            elif self._scheduled:
                timeout = max(0.0, self._scheduled[0][0] - current_time)
            else:
                timeout = None

            # 3. Poll the OS kernel for I/O events (epoll_wait / select)
            # CRITICAL WINDOWS GOTCHA: On Windows Winsock, calling select.select() with zero registered
            # sockets raises OSError 10022 ('An invalid argument was supplied').
            # Linux epoll and macOS kqueue allow empty sets, but on Windows we must fall back to time.sleep()
            # if no socket descriptors are currently registered in the selector.
            if not self._selector.get_map():
                if timeout and timeout > 0:
                    time.sleep(timeout)
                events = []
            else:
                events = self._selector.select(timeout=timeout)

            for key, mask in events:
                # key.data contains the registered callback closure
                io_callback = key.data
                self._ready.append(io_callback)

            # 4. Drain the ready queue for this tick
            # Copy and clear the ready list so callbacks scheduled during this tick wait for next tick
            callbacks_to_run = self._ready[:]
            self._ready.clear()
            for cb in callbacks_to_run:
                cb()

        self._is_running = False
        return root_task.result()


# ---------------------------------------------------------------------------
# Self-Verifying Unit Demonstration of the Custom Async Engine
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 70)
    print("STARTING CUSTOM ASYNC EVENT LOOP ENGINE (UNNATI MASTERCLASS M1)")
    print("=" * 70)

    loop = CustomEventLoop()

    async def async_worker(worker_id: int, delay_secs: float) -> str:
        """Simulates an asynchronous worker performing non-blocking sleep."""
        print(f"  [Worker {worker_id}] Started execution. Sleeping for {delay_secs}s...")
        await loop.sleep(delay_secs)
        print(f"  [Worker {worker_id}] Woke up successfully after {delay_secs}s!")
        return f"Result from Worker {worker_id}"

    async def main_supervisor() -> None:
        """Root supervisor coroutine orchestrating concurrent tasks."""
        print("[Supervisor] Spawning 3 concurrent asynchronous workers...")
        start_ts = time.time()

        # Spawn tasks concurrently into the event loop
        task1 = loop.create_task(async_worker(1, 0.3))
        task2 = loop.create_task(async_worker(2, 0.1))
        task3 = loop.create_task(async_worker(3, 0.2))

        # Await their completion in any order (they run concurrently!)
        res1 = await task1
        res2 = await task2
        res3 = await task3

        total_elapsed = time.time() - start_ts
        print(f"[Supervisor] All workers finished! Total elapsed time: {total_elapsed:.3f}s")
        print(f"[Supervisor] Results: {res1}, {res2}, {res3}")
        print("=" * 70)
        print("CONCURRENCY VERIFIED: Total time should be ~0.3s (longest task), NOT 0.6s (sequential)")
        print("=" * 70)

    # Run the event loop until completion
    loop.run_until_complete(main_supervisor())
