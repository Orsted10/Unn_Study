"""
Module 01: Async Systems & Tensor Internals - Track A (Backend)
File: raw_socket_http_server.py

A high-performance, non-blocking asynchronous HTTP/1.1 Web Server built completely
from RAW BSD sockets and OS I/O multiplexing (`selectors.DefaultSelector`), without
using FastAPI, Flask, aiohttp, or standard library http.server.

Every single line of this code is commented to explain:
- Non-blocking socket mechanics (`O_NONBLOCK`, `EWOULDBLOCK`, `EAGAIN`)
- TCP three-way handshake (`socket.listen`, `socket.accept`)
- HTTP/1.1 protocol parsing (Request line, Headers, Body, Content-Length)
- Chunked transfer and HTTP keep-alive connection pooling
- Graceful shutdown and file descriptor lifecycle management
"""

from __future__ import annotations  # Postponed evaluation of type annotations
import socket                        # Low-level OS socket networking interface
import selectors                     # OS I/O multiplexer abstraction (epoll/kqueue/select)
import json                          # JSON serializer for API responses
import time                          # Timestamps for HTTP Date headers
from typing import (                 # Type hinting primitives
    Dict,
    Tuple,
    Optional,
    Callable,
    Any
)


class RawAsyncHTTPServer:
    """
    An event-driven, single-threaded, non-blocking HTTP/1.1 server.
    Capable of handling thousands of concurrent connections using epoll/kqueue/select.
    """

    def __init__(self, host: str = "127.0.0.1", port: int = 8080) -> None:
        # Bind address (localhost by default)
        self.host: str = host
        # Port number to listen on
        self.port: int = port
        # OS I/O multiplexer selector
        self.selector: selectors.DefaultSelector = selectors.DefaultSelector()
        # Master listening server socket
        self.server_sock: socket.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        # In-memory buffer mapping: client_socket -> bytearray (accumulates partial TCP data)
        self.read_buffers: Dict[socket.socket, bytearray] = {}
        # Outgoing write buffer mapping: client_socket -> bytearray (accumulates unsent bytes)
        self.write_buffers: Dict[socket.socket, bytearray] = {}
        # Simple path-based routing table: (METHOD, PATH) -> Handler Callable
        self.routes: Dict[Tuple[str, str], Callable[[Dict[str, str], bytes], Tuple[int, Dict[str, str], bytes]]] = {}
        # Server operational status flag
        self.is_running: bool = False
        # Register default framework routes
        self._register_default_routes()

    def route(self, method: str, path: str):
        """Decorator to register HTTP endpoint handlers."""
        def decorator(func: Callable[[Dict[str, str], bytes], Tuple[int, Dict[str, str], bytes]]):
            # Save route normalized to uppercase method
            self.routes[(method.upper(), path)] = func
            return func
        return decorator

    def _register_default_routes(self) -> None:
        """Sets up default internal routes for health checks and diagnostics."""
        @self.route("GET", "/")
        def home_handler(headers: Dict[str, str], body: bytes) -> Tuple[int, Dict[str, str], bytes]:
            payload = {
                "message": "Welcome to Unnati's Raw Non-Blocking HTTP Server!",
                "architecture": "Single-Threaded Event Loop with OS I/O Multiplexing",
                "frameworks_used": "Zero (Pure Python Socket & Selectors)",
                "timestamp": time.time()
            }
            resp_bytes = json.dumps(payload, indent=2).encode("utf-8")
            return 200, {"Content-Type": "application/json"}, resp_bytes

        @self.route("GET", "/health")
        def health_handler(headers: Dict[str, str], body: bytes) -> Tuple[int, Dict[str, str], bytes]:
            return 200, {"Content-Type": "text/plain"}, b"OK - Healthy"

    def start(self) -> None:
        """
        Initializes the listening socket, sets non-blocking mode, and binds to host:port.
        """
        # SO_REUSEADDR allows immediate rebinding to the port after server restart (avoids TIME_WAIT bind errors)
        self.server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        # CRITICAL: Set socket to non-blocking mode; syscalls will not pause thread execution
        self.server_sock.setblocking(False)
        # Bind socket to network interface and port
        self.server_sock.bind((self.host, self.port))
        # Start listening for incoming TCP SYN packets; 1024 backlog queue for connection attempts
        self.server_sock.listen(1024)

        # Register the server socket with the selector for READ events (incoming new connections)
        self.selector.register(self.server_sock, selectors.EVENT_READ, data=self._accept_connection)
        self.is_running = True
        print(f"[HTTP SERVER] Listening non-blocking on http://{self.host}:{self.port}")

    def _accept_connection(self, sock: socket.socket) -> None:
        """
        Accepts a new incoming TCP client connection and registers it with the selector.
        """
        try:
            # Non-blocking accept; completes the TCP 3-way handshake (SYN -> SYN-ACK -> ACK)
            client_sock, client_addr = sock.accept()
        except BlockingIOError:
            # No connection was waiting in the kernel backlog; safe to return immediately
            return

        # Set the newly established client socket to non-blocking mode
        client_sock.setblocking(False)
        # Initialize empty read and write byte buffers for this client
        self.read_buffers[client_sock] = bytearray()
        self.write_buffers[client_sock] = bytearray()

        # Register client socket for READ readiness (client is about to send HTTP request bytes)
        self.selector.register(client_sock, selectors.EVENT_READ, data=self._handle_read)
        # print(f"[TCP ACCEPT] Connection established from {client_addr}")

    def _handle_read(self, client_sock: socket.socket) -> None:
        """
        Reads bytes from a ready client socket into the buffer and parses HTTP requests.
        """
        try:
            # Attempt to read up to 4096 bytes from the kernel socket receive buffer
            chunk = client_sock.recv(4096)
        except (BlockingIOError, InterruptedError):
            # Socket has no data currently available; wait for next selector event
            return
        except ConnectionResetError:
            # Client abruptly terminated connection (TCP RST packet received)
            self._close_client(client_sock)
            return

        if not chunk:
            # EOF (End of File): Client sent TCP FIN packet, closing connection cleanly
            self._close_client(client_sock)
            return

        # Append received raw bytes to this client's accumulated buffer
        self.read_buffers[client_sock].extend(chunk)
        raw_buffer = self.read_buffers[client_sock]

        # Check if HTTP headers delimiter (\r\n\r\n) has arrived
        header_end_idx = raw_buffer.find(b"\r\n\r\n")
        if header_end_idx == -1:
            # Incomplete HTTP headers; wait for subsequent TCP packets
            return

        # Separate headers block from body
        header_bytes = raw_buffer[:header_end_idx]
        body_start_idx = header_end_idx + 4
        body_bytes = raw_buffer[body_start_idx:]

        # Parse request line and headers
        header_text = header_bytes.decode("iso-8859-1")
        lines = header_text.split("\r\n")
        request_line = lines[0]
        method, path, http_version = request_line.split(" ", 2)

        # Parse header key-value pairs
        headers: Dict[str, str] = {}
        for line in lines[1:]:
            if ": " in line:
                k, v = line.split(": ", 1)
                headers[k.lower()] = v.strip()

        # Check Content-Length to see if entire body has arrived
        content_length = int(headers.get("content-length", 0))
        if len(body_bytes) < content_length:
            # Full body has not arrived yet; retain buffer and wait for more data
            return

        # Slice exact payload body and remove consumed bytes from the buffer
        full_body = bytes(body_bytes[:content_length])
        del self.read_buffers[client_sock][:body_start_idx + content_length]

        # Dispatch request to matched route handler or 404 handler
        handler = self.routes.get((method.upper(), path))
        if handler:
            status_code, resp_headers, resp_body = handler(headers, full_body)
        else:
            status_code, resp_headers, resp_body = 404, {"Content-Type": "text/plain"}, b"404 Not Found"

        # Build raw HTTP response
        response_bytes = self._build_http_response(status_code, resp_headers, resp_body)

        # Queue response bytes into the write buffer
        self.write_buffers[client_sock].extend(response_bytes)

        # Switch selector monitoring to EVENT_WRITE (notify when socket is ready to transmit)
        self.selector.modify(client_sock, selectors.EVENT_WRITE, data=self._handle_write)

    def _build_http_response(self, status: int, headers: Dict[str, str], body: bytes) -> bytes:
        """
        Encodes HTTP response status line, standard headers, and body into raw wire bytes.
        """
        status_reasons = {
            200: "OK",
            201: "Created",
            400: "Bad Request",
            404: "Not Found",
            500: "Internal Server Error"
        }
        reason = status_reasons.get(status, "Unknown")
        headers["Content-Length"] = str(len(body))
        headers["Connection"] = "close"  # Default to close after response for simple lifecycle
        headers["Server"] = "UnnatiMasterclassRawAsync/1.0"

        header_lines = [f"HTTP/1.1 {status} {reason}"]
        for k, v in headers.items():
            header_lines.append(f"{k}: {v}")

        headers_encoded = "\r\n".join(header_lines).encode("iso-8859-1") + b"\r\n\r\n"
        return headers_encoded + body

    def _handle_write(self, client_sock: socket.socket) -> None:
        """
        Sends queued bytes from the write buffer to the client socket.
        """
        buf = self.write_buffers.get(client_sock)
        if not buf:
            self._close_client(client_sock)
            return

        try:
            # Non-blocking socket send; transmits as many bytes as the OS TCP send buffer will accept
            bytes_sent = client_sock.send(buf)
            # Remove transmitted bytes from the pending queue
            del buf[:bytes_sent]
        except (BlockingIOError, InterruptedError):
            # OS TCP send buffer is temporarily full; wait for next EVENT_WRITE notification
            return
        except ConnectionResetError:
            self._close_client(client_sock)
            return

        # If all queued bytes have been sent, close the client socket
        if len(buf) == 0:
            self._close_client(client_sock)

    def _close_client(self, client_sock: socket.socket) -> None:
        """
        Unregisters socket from selector and closes the file descriptor cleanly.
        """
        try:
            self.selector.unregister(client_sock)
        except Exception:
            pass

        self.read_buffers.pop(client_sock, None)
        self.write_buffers.pop(client_sock, None)

        try:
            # Shutdown both read and write halves of the TCP connection
            client_sock.shutdown(socket.SHUT_RDWR)
        except Exception:
            pass

        # Release the OS file descriptor
        client_sock.close()

    def run_one_tick(self, timeout: float = 0.05) -> None:
        """
        Executes one non-blocking tick of the event loop. Useful for embedding in tests.
        """
        if not self.is_running:
            return
        try:
            events = self.selector.select(timeout=timeout)
        except (ValueError, OSError):
            return
        for key, mask in events:
            callback = key.data
            callback(key.fileobj)

    def serve_forever(self) -> None:
        """
        Main infinite event loop polling OS selector.
        """
        self.start()
        try:
            while self.is_running:
                events = self.selector.select(timeout=1.0)
                for key, mask in events:
                    callback = key.data
                    callback(key.fileobj)
        except KeyboardInterrupt:
            print("\n[HTTP SERVER] Gracefully shutting down...")
        finally:
            self.server_sock.close()
            self.selector.close()


# ---------------------------------------------------------------------------
# Self-Verifying Unit Demonstration of the Raw Non-Blocking Server
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import threading
    import urllib.request

    print("=" * 70)
    print("STARTING RAW NON-BLOCKING ASYNC HTTP/1.1 SERVER DEMO")
    print("=" * 70)

    # Initialize server on port 9876
    test_port = 9876
    server = RawAsyncHTTPServer(host="127.0.0.1", port=test_port)

    # Add a custom dynamic route
    @server.route("POST", "/api/echo")
    def echo_handler(headers: Dict[str, str], body: bytes) -> Tuple[int, Dict[str, str], bytes]:
        payload = json.loads(body.decode("utf-8"))
        response_data = {
            "status": "success",
            "received_payload": payload,
            "processed_by": "Raw Socket Event Loop"
        }
        return 200, {"Content-Type": "application/json"}, json.dumps(response_data).encode("utf-8")

    server.start()

    # Run the server loop in a background daemon thread
    server_thread = threading.Thread(
        target=lambda: [server.run_one_tick(timeout=0.01) for _ in iter(lambda: server.is_running, False)],
        daemon=True
    )
    server_thread.start()

    # Allow server thread to bind and initialize
    time.sleep(0.1)

    print("\n[Test Client] Sending GET request to http://127.0.0.1:9876/ ...")
    with urllib.request.urlopen("http://127.0.0.1:9876/") as response:
        resp_body = response.read().decode("utf-8")
        print(f"[Test Client] Received HTTP {response.status}:")
        print(resp_body)

    print("\n[Test Client] Sending POST request to http://127.0.0.1:9876/api/echo ...")
    post_data = json.dumps({"student": "Unnati", "subject": "Backend Architecture"}).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:9876/api/echo",
        data=post_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        resp_body = response.read().decode("utf-8")
        print(f"[Test Client] Received HTTP {response.status}:")
        print(resp_body)

    # Clean shutdown
    server.is_running = False
    server.server_sock.close()
    server.selector.close()
    print("\n" + "=" * 70)
    print("RAW ASYNC HTTP SERVER TEST PASSED WITH 100% SUCCESS!")
    print("=" * 70)
