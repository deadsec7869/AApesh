from contextlib import asynccontextmanager

import pytest
from fastapi import FastAPI
from sqlalchemy import text
from backend.app.db.database import create_database_engine
from backend.app.desktop_runtime import BackendServer


def test_sqlite_wal_timeout_and_handle_release(tmp_path):
    path = tmp_path / "library.db"
    engine = create_database_engine(f"sqlite:///{path.as_posix()}")
    with engine.connect() as connection:
        assert connection.execute(text("PRAGMA journal_mode")).scalar() == "wal"
        assert connection.execute(text("PRAGMA busy_timeout")).scalar() == 5000
        assert connection.execute(text("PRAGMA foreign_keys")).scalar() == 1
    engine.dispose()
    path.rename(tmp_path / "released.db")


def test_server_waits_for_readiness_and_closes_thread_and_socket():
    state = {"ready": False, "closed": False}
    @asynccontextmanager
    async def lifespan(app):
        state["ready"] = True
        try:
            yield
        finally:
            state["closed"] = True
    def factory(_url):
        app = FastAPI(lifespan=lifespan)
        @app.get("/api/health")
        def health():
            assert state["ready"]
            return {"status": "healthy"}
        return app
    server = BackendServer(0, "unused", factory)
    try:
        server.start(timeout=5)
        assert state["ready"] and server.thread.is_alive()
    finally:
        server.stop()
    assert state["closed"] and not server.thread.is_alive()
    assert server._socket is None
    server.stop()


def test_startup_failure_releases_socket():
    def factory(_url):
        raise RuntimeError("database unavailable")
    server = BackendServer(0, "unused", factory)
    with pytest.raises(RuntimeError, match="database unavailable"):
        server.start(timeout=1)
    assert server._socket is None
