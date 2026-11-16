import json
import os
import queue
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]


def _launch_backend(user_data: Path, frontend: Path):
    env = os.environ.copy()
    env.update(
        {
            "AAPESH_USER_DATA_DIR": str(user_data),
            "AAPESH_FRONTEND_DIST": str(frontend),
            "AAPESH_BACKEND_PORT": "0",
            "APP_ENV": "production",
            "DEBUG": "false",
        }
    )
    process = subprocess.Popen(
        [sys.executable, "-m", "backend.desktop_server"],
        cwd=ROOT,
        env=env,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    lines = queue.Queue()

    def read_output():
        assert process.stdout is not None
        for line in process.stdout:
            lines.put(line.rstrip())

    threading.Thread(target=read_output, daemon=True).start()
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        try:
            line = lines.get(timeout=0.2)
        except queue.Empty:
            if process.poll() is not None:
                break
            continue
        if line.startswith("AAPESH_BACKEND_PORT="):
            return process, int(line.split("=", 1)[1])

    process.kill()
    raise AssertionError("Desktop backend failed to announce its dynamic port.")


def _wait_for_health(port: int):
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        try:
            with urlopen(f"http://127.0.0.1:{port}/api/health", timeout=1) as response:
                if response.status == 200:
                    return
        except (OSError, URLError):
            time.sleep(0.1)
    raise AssertionError("Desktop backend did not become healthy.")


def _stop_backend(process: subprocess.Popen):
    if process.poll() is not None:
        return
    assert process.stdin is not None
    process.stdin.write("AAPESH_SHUTDOWN\n")
    process.stdin.flush()
    process.wait(timeout=10)


def test_desktop_server_serves_frontend_on_loopback_and_persists_user_data(tmp_path):
    user_data = tmp_path / "AAPESH user data"
    frontend = tmp_path / "frontend"
    assets = frontend / "assets"
    assets.mkdir(parents=True)
    (frontend / "index.html").write_text(
        "<!doctype html><title>AAPESH desktop test</title>",
        encoding="utf-8",
    )
    (assets / "probe.js").write_text("window.desktopAssetLoaded = true;", encoding="utf-8")

    process, port = _launch_backend(user_data, frontend)
    playlist_id = None
    try:
        _wait_for_health(port)
        with urlopen(f"http://127.0.0.1:{port}/", timeout=3) as response:
            assert "AAPESH desktop test" in response.read().decode()
        with urlopen(f"http://127.0.0.1:{port}/assets/probe.js", timeout=3) as response:
            assert "desktopAssetLoaded" in response.read().decode()

        request = Request(
            f"http://127.0.0.1:{port}/api/playlists",
            data=json.dumps({"title": "Desktop persistence", "description": "test"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=5) as response:
            playlist_id = json.loads(response.read())["id"]
        assert (user_data / "aurora_music.db").is_file()
    finally:
        _stop_backend(process)

    process, port = _launch_backend(user_data, frontend)
    try:
        _wait_for_health(port)
        with urlopen(f"http://127.0.0.1:{port}/api/playlists/{playlist_id}", timeout=5) as response:
            playlist = json.loads(response.read())
        assert playlist["title"] == "Desktop persistence"
    finally:
        _stop_backend(process)
