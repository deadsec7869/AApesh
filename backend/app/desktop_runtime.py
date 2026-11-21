"""Headless, testable desktop server ownership. No subprocess or GUI dependencies."""
import json
import socket
import threading
import time
from urllib.request import build_opener, ProxyHandler

import uvicorn


class BackendServer:
    def __init__(self, port, db_url, app_factory):
        self.port = port
        self.db_url = db_url
        self.app_factory = app_factory
        self.server = None
        self.thread = None
        self._socket = None
        self._failure = None
        self._stop_lock = threading.Lock()

    def start(self, timeout=20):
        if self.thread and self.thread.is_alive():
            raise RuntimeError("Backend is already running")
        self._failure = None
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            # Keep ownership of the socket: no free-port selection/bind race.
            self._socket.bind(("127.0.0.1", self.port))
            self.port = self._socket.getsockname()[1]
            self._socket.listen(128)
            app = self.app_factory(self.db_url)
            self.server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=self.port,
                log_level="warning", access_log=False, log_config=None, timeout_graceful_shutdown=5))
            self.thread = threading.Thread(target=self._run, name="AAPESH-API", daemon=True)
            self.thread.start()
            deadline = time.monotonic() + timeout
            opener = build_opener(ProxyHandler({}))
            while time.monotonic() < deadline:
                if self._failure or not self.thread.is_alive():
                    raise RuntimeError("Backend failed during startup") from self._failure
                try:
                    with opener.open(f"http://127.0.0.1:{self.port}/api/health", timeout=0.5) as response:
                        if response.status == 200 and json.load(response).get("status") == "healthy":
                            return
                except (OSError, ValueError):
                    pass
                time.sleep(0.05)
            raise RuntimeError("Backend readiness timed out")
        except BaseException:
            self.stop()
            raise

    def _run(self):
        try:
            self.server.run(sockets=[self._socket])
        except BaseException as error:
            self._failure = error

    def stop(self):
        with self._stop_lock:
            if self.server:
                self.server.should_exit = True
            if self.thread and self.thread is not threading.current_thread():
                self.thread.join(timeout=7)
                if self.thread.is_alive():
                    self.server.force_exit = True
                    self.thread.join(timeout=2)
                if self.thread.is_alive():
                    raise RuntimeError("Backend did not stop within the shutdown deadline")
            if self._socket:
                self._socket.close()
                self._socket = None
