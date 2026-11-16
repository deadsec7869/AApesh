"""Loopback-only entry point used by the AAPESH Electron desktop shell."""

import os
import socket
import sys
from threading import Thread

import uvicorn

from backend.app.main import app


def _listen_for_shutdown(server: uvicorn.Server) -> None:
    for line in sys.stdin:
        if line.strip() == "AAPESH_SHUTDOWN":
            server.should_exit = True
            return


def main() -> None:
    # Do not bind to the machine's LAN interfaces in desktop mode.
    host = "127.0.0.1"
    requested_port = int(os.getenv("AAPESH_BACKEND_PORT", "0"))
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        listener.bind((host, requested_port))
        listener.listen(socket.SOMAXCONN)
        listener.setblocking(False)
    except OSError:
        listener.close()
        raise

    port = listener.getsockname()[1]
    server = uvicorn.Server(
        uvicorn.Config(
            app,
            host=host,
            port=port,
            log_level="info",
            log_config=None,
            access_log=False,
        )
    )
    Thread(target=_listen_for_shutdown, args=(server,), daemon=True).start()
    print(f"AAPESH_BACKEND_PORT={port}", flush=True)
    try:
        server.run(sockets=[listener])
    finally:
        listener.close()


if __name__ == "__main__":
    main()
