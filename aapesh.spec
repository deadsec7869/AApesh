# -*- coding: utf-8 -*-
"""
PyInstaller spec file for AAPESH — Spatial Audio Workstation

Build command:
    pyinstaller --clean aapesh.spec

Output:
    dist/AAPESH/AAPESH.exe (Windows)
"""

import os
import sys
from pathlib import Path

# Project root - use current working directory since __file__ is not available in spec
PROJECT_ROOT = Path.cwd()

# ─── Data Files to Bundle ───────────────────────────────────────────────
# Frontend build output (must be built before running pyinstaller)
frontend_dist = PROJECT_ROOT / "frontend" / "dist"

# Backend source code
backend_src = PROJECT_ROOT / "backend"

# ─── Hidden Imports (modules PyInstaller might miss) ────────────────────
hidden_imports = [
    # WebView
    "webview",
    "webview.platforms.winforms",
    "webview.platforms.edgechromium",
    "webview.util",
    # FastAPI / Uvicorn
    "fastapi",
    "fastapi.middleware.cors",
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.http.httptools_impl",
    "uvicorn.protocols.websockets.wsproto_impl",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.workers",
    # SQLAlchemy
    "sqlalchemy",
    "sqlalchemy.orm",
    "sqlalchemy.engine",
    "sqlalchemy.pool",
    "sqlalchemy.dialects.sqlite",
    # Pydantic
    "pydantic",
    "pydantic.v1",
    "pydantic_core",
    "pydantic_settings",
    # YTMusic
    "ytmusicapi",
    # Backend app modules
    "backend.app.core.config",
    "backend.app.db.database",
    "backend.app.api.routes.home",
    "backend.app.api.routes.search",
    "backend.app.api.routes.songs",
    "backend.app.api.routes.albums",
    "backend.app.api.routes.artists",
    "backend.app.api.routes.playlists",
    "backend.app.api.routes.library",
    "backend.app.api.routes.history",
    "backend.app.api.routes.charts",
    "backend.app.api.routes.moods",
    "backend.app.api.routes.lyrics",
    "backend.app.api.routes.recommendations",
    "backend.app.api.routes.auth",
    "backend.app.api.routes.importer",
    "backend.app.models.playlist",
    "backend.app.models.liked",
    "backend.app.models.history",
    "backend.app.models.search_history",
    "backend.app.models.preference",
    "backend.app.schemas.music",
    "backend.app.schemas.playlist",
    "backend.app.schemas.user",
    "backend.app.services.cache_service",
    "backend.app.services.lyrics_engine.providers",
    "backend.app.services.lyrics_engine.script_detector",
    "backend.app.services.recommendation_service",
    "backend.app.services.ytmusic_service",
    # Standard library modules that might be missed
    "json",
    "sqlite3",
    "threading",
    "socket",
    "pathlib",
    "contextlib",
    "logging",
    "typing",
    "dataclasses",
    "enum",
    "datetime",
    "uuid",
    "hashlib",
    "base64",
    "urllib.parse",
    "http.client",
    "email.message",
    "email.parser",
    "mimetypes",
]

# ─── Excludes (reduce bundle size) ─────────────────────────────────────
excludes = [
    # Testing
    "pytest", "pytest_asyncio", "unittest", "doctest",
    # Development
    "black", "flake8", "mypy", "isort",
    "jupyter", "notebook", "ipython",
    # Heavy scientific stack (not used)
    "numpy", "scipy", "pandas", "matplotlib",
    "torch", "tensorflow", "sklearn",
    # Documentation
    "sphinx", "pdoc",
    # Other
    "setuptools", "pip", "wheel",
    "pkg_resources",
    "Cython",
]

# ─── Build Configuration ────────────────────────────────────────────────
block_cipher = None

# Data files: (source, destination)
# Format: (source_path, dest_dir_in_bundle)
from PyInstaller.utils.hooks import collect_data_files, copy_metadata

datas = collect_data_files('ytmusicapi') + copy_metadata('ytmusicapi') + [
    # Frontend dist (built assets) - CRITICAL: must be included
    (str(frontend_dist), "frontend/dist"),
    # Backend source code
    (str(backend_src), "backend"),
    # Config files
    (str(PROJECT_ROOT / ".env.example"), "."),
]

# Binary dependencies (if any)
binaries = []

# ─── Analysis ───────────────────────────────────────────────────────────
a = Analysis(
    ["desktop_launcher.py"],
    pathex=[str(PROJECT_ROOT)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# Filter out unwanted data files
a.datas = [x for x in a.datas if not any(ex in x[0] for ex in ["__pycache__", ".pyc", ".pytest_cache", "node_modules", ".git"])]

# ─── PYZ Archive ────────────────────────────────────────────────────────
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# ─── Executable ─────────────────────────────────────────────────────────
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="AAPESH",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window for GUI app
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    # Windows-specific
    icon=str(PROJECT_ROOT / "assets" / "icon.ico") if (PROJECT_ROOT / "assets" / "icon.ico").exists() else None,
    version_file=None,
    uac_admin=False,
    uac_uiaccess=False,
)

# ─── Final Bundle (Directory) ───────────────────────────────────────────
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="AAPESH",
)