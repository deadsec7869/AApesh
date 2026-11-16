"""Isolate database writes from the listening library during tests."""
import os
from pathlib import Path
from tempfile import TemporaryDirectory

_test_dir = TemporaryDirectory(prefix="aapesh-tests-", ignore_cleanup_errors=True)
os.environ["DATABASE_URL"] = "sqlite:///" + (Path(_test_dir.name) / "test.db").as_posix()

from backend.app.db.database import init_db
init_db()
