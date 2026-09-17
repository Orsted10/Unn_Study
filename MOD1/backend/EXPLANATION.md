# Module 01: The Engine Room — Async Systems & OS Multiplexing
## *Track A: Scaled Enterprise Backend Architecture (Comprehensive Master Guide for Unnati)*

---

## 1. The Intuitive Mental Model: How Computers Actually Handle 100,000 Users

Imagine you are running a restaurant with 1,000 tables:

### Approach 1: The Multi-Threaded Model (One Waiter Per Table)
- In traditional synchronous servers (e.g., Apache HTTP Server or standard Python Flask with synchronous workers), every time a new customer sits down, the restaurant hires a **dedicated waiter** (a native OS Thread).
- When the customer is reading the menu (equivalent to waiting for network bytes to arrive over TCP), the waiter stands completely frozen at the table, doing nothing.
- **The Disaster**: An operating system thread consumes around 8 MB of virtual memory for its stack. If you have 10,000 concurrent connections, you need:
  $$\text{Memory} = 10,000 \times 8\,\text{MB} = 80\,\text{GB of RAM!}$$
  Furthermore, the CPU kernel spends 90% of its cycles performing **Context Switches** (saving CPU registers, flushing L1/L2 caches) rather than actually serving food.

### Approach 2: The Asynchronous Event-Driven Model (One Super-Fast Waiter with a Buzzer)
- In an asynchronous architecture (Node.js, Nginx, Python's `asyncio`, Redis, Go netpoller), there is **only ONE waiter** (a single CPU thread running an Event Loop).
- The waiter hands menus to 1,000 tables and says: *"Whenever you are ready to order, press this buzzer (OS Epoll readiness notification). Until then, I will serve other tables."*
- The waiter never waits idly. If Table 42 presses the buzzer, the waiter takes their order in 0.001 seconds, passes it to the kitchen, and moves to Table 15.
- **The Result**: A single thread can handle 100,000 active connections effortlessly using barely 50 MB of RAM.

---

## 2. Low-Level OS Architecture: How the Linux Kernel Talks to Python

At the heart of asynchronous programming is **I/O Multiplexing**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USERSPACE (Python Application)                    │
│                                                                         │
│   [ Coroutine 1 ]      [ Coroutine 2 ]      [ Coroutine 3 ]             │
│          ▲                    ▲                    ▲                    │
│          │                    │                    │                    │
│   [   Task 1    ]      [   Task 2    ]      [   Task 3    ]             │
│          ▲                    ▲                    ▲                    │
│          └────────────────────┼────────────────────┘                    │
│                               │                                         │
│                      [ CustomEventLoop ]                                │
│                     /         │         \                               │
│          [ Ready Queue ] [ Timer Min-Heap ] [ OS Selector ]             │
└───────────────────────────────┼───────────────────┼─────────────────────┘
                                │ syscall           │ syscall
                                ▼ (epoll_wait)      ▼ (epoll_ctl)
┌─────────────────────────────────────────────────────────────────────────┐
│                        KERNEL SPACE (Operating System)                  │
│                                                                         │
│   Linux: epoll_create1() / epoll_ctl() / epoll_wait()                   │
│   macOS / BSD: kqueue() / kevent()                                      │
│   Windows: Select() / I/O Completion Ports (IOCP)                       │
│                                                                         │
│   [ Socket FD #3 ]      [ Socket FD #4 ]      [ Socket FD #5 ]          │
│   (State: Waiting)      (State: READY-READ)   (State: Waiting)          │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Evolution of OS I/O System Calls:
1. `select()` (1983):
   - You pass an array of file descriptors to the kernel.
   - Limit: Maximum 1024 descriptors (`FD_SETSIZE`).
   - Time Complexity: $O(N)$ — Every time an event fires, userspace must loop over all 1024 descriptors to find which one is ready.
2. `poll()` (1997):
   - Removes the 1024 limit using an array of `pollfd` structs.
   - Still $O(N)$ scanning cost.
3. `epoll()` (Linux 2002) / `kqueue()` (FreeBSD/macOS 2000):
   - **$O(1)$ constant time complexity!**
   - The kernel maintains a Red-Black Tree of watched descriptors and a Ready Doubly-Linked List.
   - When a network packet hits the Network Interface Card (NIC), a hardware interrupt triggers, and the kernel directly places the socket into the Ready List.
   - When `epoll_wait()` is called, the kernel returns **only the active sockets**, with zero scanning.

---

## 3. Exhaustive Line-by-Line Breakdown: `custom_async_event_loop.py`

Every single class, method, and statement in our custom event loop engine is analyzed below.

### 3.1 The `Future` Class (The Contract of Eventual Value)

```python
class Future:
    def __init__(self) -> None:
        self._result: Any = None
        self._exception: Optional[Exception] = None
        self._is_done: bool = False
        self._callbacks: List[Callable[[Future], None]] = []
```
- **Line `self._result: Any = None`**:
  - *What it does*: Holds the eventual payload returned by an asynchronous operation (e.g., database query response, network JSON bytes).
  - *Why it's written this way*: Before resolution, it is `None`. Callers attempting to read it before `_is_done == True` are blocked with an error to prevent race conditions.
  - *In Memory*: A pointer variable in the Python heap object.
- **Line `self._exception: Optional[Exception] = None`**:
  - *What it does*: Stores any Python exception (e.g. `ConnectionResetError`, `TimeoutError`) if the asynchronous task crashes.
  - *Why*: In an async event loop, an unhandled exception inside a worker cannot bubble up to crash the main thread; it must be encapsulated inside the Future and re-thrown only to whoever awaits it.
- **Line `self._is_done: bool = False`**:
  - *What it does*: State flag tracking whether the computation is pending (`False`) or completed (`True`).
- **Line `self._callbacks: List[Callable[[Future], None]] = []`**:
  - *What it does*: A list of observer functions. When other tasks say `await fut`, they attach their wakeup function to this list.

```python
    def done(self) -> bool:
        return self._is_done
```
- *What it does*: Exposes a read-only query method for polling state without exposing internal private variables.

```python
    def result(self) -> Any:
        if not self._is_done:
            raise RuntimeError("Result is not ready yet! Future is still pending.")
        if self._exception:
            raise self._exception
        return self._result
```
- **Line `if not self._is_done: raise RuntimeError(...)`**:
  - *What it does*: Enforces synchronization safety. Prevents code from reading uninitialized memory or partial results.
- **Line `if self._exception: raise self._exception`**:
  - *What it does*: Transparent error propagation. If a background worker failed with a network error, the caller awaiting `fut.result()` receives that exact exception at their callsite with full traceback!

```python
    def set_result(self, result: Any) -> None:
        if self._is_done:
            raise RuntimeError("InvalidStateError: Future is already completed.")
        self._result = result
        self._is_done = True
        for callback in self._callbacks:
            callback(self)
```
- **Line `if self._is_done: raise RuntimeError(...)`**:
  - *What it does*: Invariant protection. A Promise/Future in computer science can resolve at most **once**. Transitioning twice is illegal.
- **Line `self._result = result; self._is_done = True`**: Atomic state transition from Pending to Fulfilled.
- **Line `for callback in self._callbacks: callback(self)`**:
  - *What it does*: Fires all listeners registered by awaiting coroutines, passing `self` so they can retrieve the result and resume execution.

```python
    def __await__(self) -> Generator[Any, None, Any]:
        while not self._is_done:
            yield self
        return self.result()
```
- **Line `def __await__(self)`**:
  - *What it does*: The dunder protocol method required by Python syntax `await fut`.
- **Line `while not self._is_done: yield self`**:
  - *What it does*: Suspends the running coroutine. It yields control back to the `Task` driver, which unbinds the coroutine from the thread and awaits completion.
- **Line `return self.result()`**:
  - *What it does*: Once the event loop wakes up this coroutine after resolution, the function completes and returns the value to the assignment target (e.g. `res = await fut`).

---

### 3.2 The `Task` Class (Driving Coroutines Step-by-Step)

```python
class Task(Future):
    def __init__(self, coro: Coroutine, loop: CustomEventLoop) -> None:
        super().__init__()
        self._coro = coro
        self._loop = loop
        self._loop.call_soon(self._step)
```
- **Line `class Task(Future)`**:
  - *What it does*: Object-oriented inheritance. A `Task` *is* a `Future`, but its result is produced by executing a coroutine generator to its end.
- **Line `self._coro = coro`**: Stores the generator-like coroutine object created by calling an `async def` function.
- **Line `self._loop.call_soon(self._step)`**: Does NOT run the coroutine immediately on the current stack frame. It enqueues the first execution tick (`_step`) into the event loop's ready queue. This ensures non-blocking, cooperative round-robin scheduling.

```python
    def _step(self, value: Any = None, exc: Optional[Exception] = None) -> None:
        try:
            if exc:
                yielded_future = self._coro.throw(exc)
            else:
                yielded_future = self._coro.send(value)
        except StopIteration as stop_err:
            self.set_result(stop_err.value)
            return
        except Exception as err:
            self.set_exception(err)
            return
```
- **Line `yielded_future = self._coro.send(value)`**:
  - *What it does*: The lowest-level CPython generator instruction. Sends `value` into the coroutine frame, advancing its instruction pointer until it hits the next `yield` or `await`.
- **Line `except StopIteration as stop_err:`**:
  - *What it does*: In Python generators and coroutines, when a function reaches `return result`, CPython signals completion by raising `StopIteration(result)`. We catch this and call `self.set_result(stop_err.value)`.
- **Line `except Exception as err:`**:
  - *What it does*: Captures any uncaught crash inside the coroutine and marks the task as failed via `self.set_exception(err)`.

```python
        if isinstance(yielded_future, Future):
            yielded_future.add_done_callback(self._wakeup)
        else:
            self._loop.call_soon(self._step)
```
- **Line `if isinstance(yielded_future, Future):`**:
  - *What it does*: If the coroutine yielded an unresolved Future (e.g. waiting for network I/O or a sleep timer), we attach `self._wakeup` as a callback. The task will remain paused in memory until that specific future resolves!

```python
    def _wakeup(self, future: Future) -> None:
        try:
            val = future.result()
            self._step(value=val)
        except Exception as err:
            self._step(exc=err)
```
- *What it does*: Callback triggered when the child future resolves. Retrieves the computed value and calls `self._step(value=val)` to drive the coroutine forward to its next step!

---

### 3.3 The `CustomEventLoop` Class (The Heartbeat of Asynchronous Systems)

```python
    def __init__(self) -> None:
        self._selector = selectors.DefaultSelector()
        self._ready: List[Callable[[], None]] = []
        self._scheduled: List[Tuple[float, int, Callable[[], None]]] = []
        self._timer_counter: int = 0
        self._is_running: bool = False
```
- **Line `self._selector = selectors.DefaultSelector()`**:
  - *What it does*: Instantiates the optimal OS I/O multiplexer (`epoll` on Linux, `kqueue` on macOS, `select` on Windows).
- **Line `self._ready: List[...] = []`**:
  - *What it does*: FIFO queue of callbacks that are ready to run right now on the CPU.
- **Line `self._scheduled: List[...] = []`**:
  - *What it does*: A binary min-heap storing tuples of `(deadline_timestamp, counter, callback)` for delayed timers (`loop.sleep`).
- **Line `self._timer_counter: int = 0`**:
  - *What it does*: Tie-breaker counter for the heap. If two timers are scheduled for the exact same millisecond, Python compares the second element (`counter`), preventing comparison errors on non-comparable function objects.

```python
    def call_later(self, delay: float, callback: Callable[..., None], *args: Any) -> None:
        target_time = time.monotonic() + delay
        self._timer_counter += 1
        heapq.heappush(self._scheduled, (target_time, self._timer_counter, lambda: callback(*args)))
```
- **Line `target_time = time.monotonic() + delay`**:
  - *Why monotonic clock*: `time.monotonic()` is a steady clock that never jumps backwards, even if the system admin changes the calendar time or NTP adjusts for leap seconds.
- **Line `heapq.heappush(...)`**:
  - *Algorithm*: Inserts the timer into the binary heap in $O(\log N)$ steps, preserving the invariant that `self._scheduled[0]` is always the earliest deadline.

```python
    def run_until_complete(self, coro: Coroutine) -> Any:
        root_task = self.create_task(coro)
        self._is_running = True

        while not root_task.done():
            current_time = time.monotonic()
            while self._scheduled and self._scheduled[0][0] <= current_time:
                _, _, cb = heapq.heappop(self._scheduled)
                self._ready.append(cb)
```
- **Line `while not root_task.done():`**:
  - *What it does*: The main infinite loop (or tick cycle) that runs until the root entrypoint has returned its final value.
- **Line `while self._scheduled and self._scheduled[0][0] <= current_time:`**:
  - *What it does*: Checks the root of the min-heap. If the target timestamp has arrived, pops it and enqueues the callback into `self._ready`.

```python
            if self._ready:
                timeout = 0.0
            elif self._scheduled:
                timeout = max(0.0, self._scheduled[0][0] - current_time)
            else:
                timeout = None
```
- **Line `if self._ready: timeout = 0.0`**:
  - *Why*: If callbacks are waiting to run, we instruct the OS selector not to sleep at all. It polls the network card instantly and returns immediately.
- **Line `timeout = max(0.0, self._scheduled[0][0] - current_time)`**:
  - *Why*: If no tasks are ready, we tell the OS kernel: *"Put the CPU to sleep until either network packets arrive on our sockets OR this exact number of milliseconds pass."* This avoids 100% CPU busy-waiting!

```python
            if not self._selector.get_map():
                if timeout and timeout > 0:
                    time.sleep(timeout)
                events = []
            else:
                events = self._selector.select(timeout=timeout)

            for key, mask in events:
                io_callback = key.data
                self._ready.append(io_callback)
```
- **Line `if not self._selector.get_map(): ...`**:
  - *The Windows Winsock Quirk*: On Windows, calling `select.select()` with zero registered sockets raises `WinError 10022`. We guard this by falling back to `time.sleep(timeout)` when no sockets are being watched.
- **Line `events = self._selector.select(timeout=timeout)`**:
  - *What it does*: Invokes the OS system call (`epoll_wait` on Linux). The kernel inspects watched sockets and returns an array of ready descriptors.
- **Line `for key, mask in events:`**:
  - *What it does*: Extracts the stored callback (e.g. `_accept_connection` or `_handle_read`) from `key.data` and enqueues it into `self._ready`.

```python
            callbacks_to_run = self._ready[:]
            self._ready.clear()
            for cb in callbacks_to_run:
                cb()
```
- **Line `callbacks_to_run = self._ready[:]`**:
  - *Why slice copy*: If a running callback enqueues a new callback via `call_soon()`, we do not want an infinite loop within this single tick. New callbacks wait for the next iteration tick.

---

## 4. Exhaustive Line-by-Line Breakdown: `raw_socket_http_server.py`

### 4.1 Server Initialization & Socket Options

```python
self.server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
self.server_sock.setblocking(False)
self.server_sock.bind((self.host, self.port))
self.server_sock.listen(1024)
```
- **Line `setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)`**:
  - *What it does*: Sets the socket flag `SO_REUSEADDR` to true (`1`).
  - *Why*: When a TCP server shuts down, lingering client connections enter the `TIME_WAIT` state for 2 minutes (to absorb delayed packets in internet transit). Without `SO_REUSEADDR`, restarting your server immediately results in `OSError: [Errno 98] Address already in use`.
- **Line `setblocking(False)`**:
  - *What it does*: Sets the socket descriptor flag to `O_NONBLOCK`.
  - *Why*: By default, BSD sockets are blocking. If you call `accept()`, `recv()`, or `send()` and data is not ready, the OS puts the entire thread to sleep. In non-blocking mode, the system call returns immediately with `BlockingIOError` (`EWOULDBLOCK` / `EAGAIN`).
- **Line `bind((self.host, self.port))`**:
  - *What it does*: Associates the socket with a specific network interface IP and TCP port on the host machine.
- **Line `listen(1024)`**:
  - *What it does*: Transitions the socket state from `CLOSED` to `LISTEN`. The integer `1024` specifies the kernel connection backlog: how many incoming TCP SYN requests the OS will complete the 3-way handshake for while waiting for our application to call `accept()`.

```python
self.selector.register(self.server_sock, selectors.EVENT_READ, data=self._accept_connection)
```
- *What it does*: Registers the server listening socket with the OS selector for `EVENT_READ`. When a new TCP connection arrives, the selector fires `self._accept_connection`.

---

### 4.2 Handling New TCP Connections

```python
    def _accept_connection(self, sock: socket.socket) -> None:
        try:
            client_sock, client_addr = sock.accept()
        except BlockingIOError:
            return

        client_sock.setblocking(False)
        self.read_buffers[client_sock] = bytearray()
        self.write_buffers[client_sock] = bytearray()
        self.selector.register(client_sock, selectors.EVENT_READ, data=self._handle_read)
```
- **Line `client_sock, client_addr = sock.accept()`**:
  - *What it does*: Extracts the first completed connection from the kernel backlog and returns a brand new socket dedicated to communicating with that specific client (e.g. `client_addr = ('127.0.0.1', 54321)`).
- **Line `client_sock.setblocking(False)`**:
  - *What it does*: Ensures all subsequent reads and writes with this client are strictly non-blocking.
- **Line `self.read_buffers[client_sock] = bytearray()`**:
  - *What it does*: Allocates a mutable `bytearray` in memory to accumulate raw TCP bytes as they arrive in fragmented packets.
- **Line `self.selector.register(client_sock, selectors.EVENT_READ, data=self._handle_read)`**:
  - *What it does*: Tells the OS kernel to monitor this client socket for incoming HTTP request data.

---

### 4.3 Reading Raw Bytes & Parsing HTTP/1.1

```python
    def _handle_read(self, client_sock: socket.socket) -> None:
        try:
            chunk = client_sock.recv(4096)
        except (BlockingIOError, InterruptedError):
            return
        except ConnectionResetError:
            self._close_client(client_sock)
            return

        if not chunk:
            self._close_client(client_sock)
            return
```
- **Line `chunk = client_sock.recv(4096)`**:
  - *What it does*: Reads up to 4096 bytes from the kernel socket receive buffer.
  - *Buffer Size 4096*: Chosen because 4096 bytes equals exactly 1 standard memory page on x86/ARM Linux.
- **Line `if not chunk: self._close_client(...)`**:
  - *What it does*: In TCP, receiving an empty byte string `b""` means the client sent a `FIN` packet (End-of-File). The client closed the connection, so we release resources.

```python
        self.read_buffers[client_sock].extend(chunk)
        raw_buffer = self.read_buffers[client_sock]
        header_end_idx = raw_buffer.find(b"\r\n\r\n")
        if header_end_idx == -1:
            return
```
- **Line `header_end_idx = raw_buffer.find(b"\r\n\r\n")`**:
  - *What it does*: Searches for the standard HTTP header-body delimiter `\r\n\r\n` (Carriage Return + Line Feed $\times 2$).
  - *Why*: TCP is a continuous stream of bytes without message boundaries. If only half the headers arrived in this packet, `header_end_idx` is `-1`, so we return and wait for the remaining bytes.

```python
        header_text = header_bytes.decode("iso-8859-1")
        lines = header_text.split("\r\n")
        request_line = lines[0]
        method, path, http_version = request_line.split(" ", 2)
```
- **Line `header_bytes.decode("iso-8859-1")`**:
  - *Why ISO-8859-1*: The HTTP/1.1 specification (RFC 2616) mandates Latin-1 (ISO-8859-1) for protocol headers because it maps all 256 byte values 1-to-1 without raising decoding errors.
- **Line `method, path, http_version = request_line.split(" ", 2)`**:
  - *What it does*: Parses the HTTP Request Line. For example, `GET /api/users HTTP/1.1` splits into `method = "GET"`, `path = "/api/users"`, and `http_version = "HTTP/1.1"`.

```python
        content_length = int(headers.get("content-length", 0))
        if len(body_bytes) < content_length:
            return
```
- **Line `if len(body_bytes) < content_length: return`**:
  - *What it does*: Checks the `Content-Length` header. If a client is uploading a 1 MB file, TCP delivers it in multiple chunks. If our buffer has only 200 KB, we wait until all bytes have arrived before dispatching to our route handler.

```python
        self.selector.modify(client_sock, selectors.EVENT_WRITE, data=self._handle_write)
```
- **Line `self.selector.modify(..., selectors.EVENT_WRITE)`**:
  - *What it does*: Switches socket monitoring from READ to WRITE readiness. The OS kernel will notify us as soon as the socket's outbound TCP transmit buffer has space to send bytes.

---

### 4.4 Non-Blocking Transmit and Socket Cleanup

```python
    def _handle_write(self, client_sock: socket.socket) -> None:
        buf = self.write_buffers.get(client_sock)
        try:
            bytes_sent = client_sock.send(buf)
            del buf[:bytes_sent]
        except (BlockingIOError, InterruptedError):
            return
```
- **Line `bytes_sent = client_sock.send(buf)`**:
  - *What it does*: Transmits as many bytes as the OS TCP send window can currently absorb.
  - *Partial Sends*: If `buf` has 100,000 bytes, but the OS send window only has room for 16,384 bytes, `client_sock.send()` transmits 16,384 bytes and returns `16384`. It does **not** block!
- **Line `del buf[:bytes_sent]`**:
  - *What it does*: Trims the sent bytes from the beginning of the queue, preserving the unsent portion for the next `EVENT_WRITE` notification.

```python
    def _close_client(self, client_sock: socket.socket) -> None:
        try:
            self.selector.unregister(client_sock)
        except Exception:
            pass
        self.read_buffers.pop(client_sock, None)
        self.write_buffers.pop(client_sock, None)
        try:
            client_sock.shutdown(socket.SHUT_RDWR)
        except Exception:
            pass
        client_sock.close()
```
- **Line `self.selector.unregister(client_sock)`**:
  - *What it does*: Removes the file descriptor from the kernel epoll/kqueue interest list.
- **Line `client_sock.shutdown(socket.SHUT_RDWR)`**:
  - *What it does*: Sends a TCP `FIN` packet to the client, cleanly notifying them that no more data will be transmitted or received.
- **Line `client_sock.close()`**:
  - *What it does*: Releases the file descriptor integer back to the operating system table, preventing file descriptor leaks!

---

## 5. Industry War Stories & Real-World Gotchas

### War Story 1: The Blocking Call Disaster (Freezing the Event Loop)
- **What Happened**: A fintech company moved their API to FastAPI and `asyncio`. A junior engineer added an audit log call:
  ```python
  @app.post("/transfer")
  async def transfer_funds():
      # DISASTER: requests.get() is SYNCHRONOUS AND BLOCKING!
      requests.get("http://audit-service/log") 
  ```
- **The Outage**: Because the server had a single-threaded event loop, when the audit service experienced a 3-second network hiccup, **every single user across the entire bank was frozen for 3 seconds**. All 10,000 concurrent requests timed out.
- **The Rule**: Inside an `async def` function, **NEVER** call synchronous blocking functions (`requests.get`, `time.sleep`, `urllib`, standard `open()` for large files). Always use non-blocking equivalents (`httpx.AsyncClient()`, `asyncio.sleep()`, `aiofiles`).

### War Story 2: File Descriptor Exhaustion (`Too many open files`)
- **What Happened**: In high-traffic deployments, each TCP socket occupies 1 File Descriptor (FD). By default, Linux sets a process limit of `ulimit -n 1024`.
- **The Crash**: When the 1,025th user connected, `socket.accept()` crashed with `OSError: [Errno 24] Too many open files`.
- **The Fix**: In production Kubernetes pods and systemd unit files, always configure:
  ```bash
  ulimit -n 65535
  ```

---
*Now that we have completed the line-by-line master breakdown of Track A, let's explore Track B's line-by-line breakdown in ML from Scratch!*
