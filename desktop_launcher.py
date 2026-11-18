#!/usr/bin/env python3
"""
AAPESH — Spatial Audio Workstation
Desktop Launcher using PyWebView + PyInstaller

This script:
1. Serves the built Vite frontend (static files from bundled frontend/dist)
2. Runs FastAPI + Uvicorn backend on a free local port
3. Opens a native WebView2 window pointing to the local server
4. Stores SQLite database in %APPDATA%\AAPESH\aapesh.db
"""

import os
import sys
import threading
import time
import socket
import traceback
import logging
from pathlib import Path
from contextlib import closing

import webview
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# ─── Configuration ──────────────────────────────────────────────────────
APP_NAME = "AAPESH — Spatial Audio Workstation"
APP_ID = "com.aapesh.workstation"
WINDOW_WIDTH = 1400
WINDOW_HEIGHT = 900
MIN_WINDOW_WIDTH = 1024
MIN_WINDOW_HEIGHT = 768

# ─── Path Resolution (works in dev and PyInstaller frozen) ──────────────
def get_base_dir() -> Path:
    """Get base directory for bundled assets."""
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent

BASE_DIR = get_base_dir()
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
BACKEND_DIR = BASE_DIR / "backend"

# ─── Persistent Data Directory (AppData) ────────────────────────────────
def get_appdata_dir() -> Path:
    """Get persistent data directory for database, settings, cache."""
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    else:
        base = Path.home() / ".local" / "share"
    return base / "AAPESH"

AAPESH_DATA_DIR = get_appdata_dir()
AAPESH_DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_PATH = AAPESH_DATA_DIR / "aapesh.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# ─── Find Free Port ─────────────────────────────────────────────────────
def find_free_port() -> int:
    """Find an available port on localhost."""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(('', 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]

# ─── Backend Application Factory ────────────────────────────────────────
def create_backend_app(db_url: str) -> FastAPI:
    """Create and configure the FastAPI application with dynamic database URL."""
    from contextlib import asynccontextmanager
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    from sqlalchemy import create_engine
    from sqlalchemy.orm import declarative_base, sessionmaker

    # Override database URL for this process
    os.environ["DATABASE_URL"] = db_url

    # Import backend modules with updated DATABASE_URL
    import importlib
    import backend.app.core.config as config_module
    import backend.app.db.database as db_module

    # Update settings
    config_module.settings.DATABASE_URL = db_url

    # Recreate engine with new database
    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    db_module.engine = create_engine(db_url, connect_args=connect_args, echo=False)
    db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_module.engine)
    db_module.Base.metadata.create_all(bind=db_module.engine)

    # Import routes after database is configured
    from backend.app.api.routes import (
        home, search, songs, albums, artists, playlists, library,
        history, charts, moods, lyrics, recommendations, auth, importer
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logging.info("Initializing AAPESH database...")
        db_module.Base.metadata.create_all(bind=db_module.engine)
        logging.info("Database initialized successfully.")
        yield
        logging.info("AAPESH API shutting down.")

    app = FastAPI(
        title="AAPESH API",
        description="Spatial Audio Workstation Backend",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global Exception Handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logging.error("Unhandled error processing %s: %s", request.url.path, exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(exc) if config_module.settings.DEBUG else "An unexpected error occurred",
                "path": request.url.path
            },
        )

    # Health Check
    @app.get("/api/health")
    def health_check():
        return {"status": "healthy", "app": "AAPESH", "environment": "production", "database": "connected"}

    # Register API Routes
    app.include_router(home.router, prefix="/api")
    app.include_router(search.router, prefix="/api")
    app.include_router(songs.router, prefix="/api")
    app.include_router(albums.router, prefix="/api")
    app.include_router(artists.router, prefix="/api")
    app.include_router(playlists.router, prefix="/api")
    app.include_router(library.router, prefix="/api")
    app.include_router(history.router, prefix="/api")
    app.include_router(charts.router, prefix="/api")
    app.include_router(moods.router, prefix="/api")
    app.include_router(lyrics.router, prefix="/api")
    app.include_router(recommendations.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(importer.router, prefix="/api")

    # Serve compiled Vite assets and client-side routes from the same origin.
    from starlette.exceptions import HTTPException

    app.mount('/assets', StaticFiles(directory=FRONTEND_DIST / 'assets'), name='assets')

    @app.get('/{path:path}', include_in_schema=False)
    def frontend_page(path: str):
        if path.split('/', 1)[0] == 'api' or ('/' not in path and Path(path).suffix):
            raise HTTPException(status_code=404)
        return FileResponse(FRONTEND_DIST / 'index.html')

    return app

# ─── Server Thread ──────────────────────────────────────────────────────
class BackendServer:
    """Runs FastAPI + Uvicorn in a background thread."""

    def __init__(self, port: int, db_url: str):
        self.port = port
        self.db_url = db_url
        self.server = None
        self.thread = None
        self._started = threading.Event()

    def start(self):
        """Start the server in a background thread."""
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        self._started.wait(timeout=10)
        if not self._started.is_set():
            raise RuntimeError("Backend server failed to start within 10 seconds")

    def _run(self):
        """Run the Uvicorn server directly (no subprocess)."""
        app = create_backend_app(self.db_url)
        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=self.port,
            log_level="warning",
            access_log=False,
            log_config=None,
        )
        self.server = uvicorn.Server(config)
        self._started.set()
        self.server.run()

    def stop(self):
        """Stop the server."""
        if self.server:
            self.server.should_exit = True
        if self.thread:
            self.thread.join(timeout=5)

# ─── WebView Window ─────────────────────────────────────────────────────
class AAPESHWindow:
    """Manages the PyWebView window."""

    def __init__(self, port: int):
        self.port = port
        self.window = None
        self.url = f"http://127.0.0.1:{port}"

    def create(self):
        """Create and show the WebView window."""
        self.window = webview.create_window(
            title=APP_NAME,
            url=self.url,
            width=WINDOW_WIDTH,
            height=WINDOW_HEIGHT,
            min_size=(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT),
            frameless=False,
            easy_drag=True,
            background_color="#050507",
            text_select=True,
            zoomable=True,
        )
        return self.window

    def load(self):
        """Load the URL in the window (for reloads)."""
        if self.window:
            self.window.load_url(self.url)

# ─── Main Entry Point ───────────────────────────────────────────────────
def main():
    """Main entry point for the desktop application."""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    logger = logging.getLogger("aapesh.launcher")

    logger.info("Starting AAPESH — Spatial Audio Workstation")
    logger.info(f"Base directory: {BASE_DIR}")
    logger.info(f"Frontend dist: {FRONTEND_DIST}")
    logger.info(f"Data directory: {AAPESH_DATA_DIR}")
    logger.info(f"Database: {DATABASE_PATH}")

    # Verify frontend build exists (bundled)
    if not FRONTEND_DIST.exists() or not (FRONTEND_DIST / "index.html").exists():
        error_msg = f"Frontend build not found at {FRONTEND_DIST}. Ensure 'frontend/dist' is bundled in PyInstaller datas."
        logger.error(error_msg)
        if getattr(sys, 'frozen', False):
            webview.create_window("AAPESH - Error", html=f"""
                <html><body style="background:#050507;color:#fff;font-family:sans-serif;padding:40px;text-align:center;">
                    <h1>Frontend Build Missing</h1>
                    <p>The frontend assets were not bundled with the application.</p>
                    <p>Please reinstall AAPESH.</p>
                </body></html>
            """)
            webview.start()
            return
        raise FileNotFoundError(error_msg)

    # Find free port
    port = find_free_port()
    logger.info(f"Using port {port}")

    # Start backend server
    backend = BackendServer(port, DATABASE_URL)
    logger.info("Starting backend server...")
    backend.start()
    logger.info(f"Backend running on http://127.0.0.1:{port}")

    # Wait a moment for server to be ready
    time.sleep(0.5)

    # Create and show window
    logger.info("Opening WebView window...")
    window = AAPESHWindow(port)
    window.create()

    # Start WebView event loop (blocks until window closed)
    def on_closing():
        logger.info("Window closing, shutting down backend...")
        backend.stop()
        logger.info("Shutdown complete")

    webview.start(
        func=None,
        storage_path=str(AAPESH_DATA_DIR / "webview"),
        debug=False,
        private_mode=False,
    )

    # Cleanup
    backend.stop()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.info("Interrupted by user")
    except Exception as e:
        # Full traceback for debugging
        error_details = traceback.format_exc()
        logging.exception("Fatal error")
        if getattr(sys, 'frozen', False):
            webview.create_window("AAPESH - Error", html=f"""
                <html><body style="background:#050507;color:#fff;font-family:sans-serif;padding:40px;text-align:center;">
                    <h1>Application Error</h1>
                    <pre style="text-align:left;max-width:800px;margin:0 auto;overflow:auto;">{error_details}</pre>
                </body></html>
            """)
            webview.start()
        sys.exit(1)