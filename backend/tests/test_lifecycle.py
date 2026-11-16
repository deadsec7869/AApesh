import subprocess
import sys

from fastapi.testclient import TestClient

from backend.app import main


def test_database_initialization_runs_once_at_lifespan_startup(monkeypatch):
    calls = []
    monkeypatch.setattr(main, "init_db", lambda: calls.append("initialized"))

    with TestClient(main.app):
        assert calls == ["initialized"]

    assert calls == ["initialized"]


def test_importing_application_does_not_initialize_database():
    check_import = """
from unittest.mock import patch
with patch("backend.app.db.database.init_db") as init_db:
    import backend.app.main
    init_db.assert_not_called()
"""
    subprocess.run([sys.executable, "-c", check_import], check=True)
