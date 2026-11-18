#!/usr/bin/env python3
"""
AAPESH Desktop Build Script

Orchestrates the complete build pipeline:
1. Build Vite frontend (npm run build)
2. Copy frontend dist to bundle location
3. Run PyInstaller with spec file
4. Output final .exe path and size
"""

import os
import sys
import shutil
import subprocess
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"
BUILD_DIR = PROJECT_ROOT / "build"
DIST_OUTPUT_DIR = PROJECT_ROOT / "dist" / "AAPESH"

def run_cmd(cmd, cwd=None, capture=True, env=None):
    """Run a command and return (success, output)."""
    print(f"\n{'='*60}")
    print(f"Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    print(f"CWD: {cwd or PROJECT_ROOT}")
    print(f"{'='*60}")

    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)

    try:
        if capture:
            result = subprocess.run(
                cmd, cwd=cwd or PROJECT_ROOT, capture_output=True,
                text=True, env=merged_env, shell=isinstance(cmd, str)
            )
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print(result.stderr, file=sys.stderr)
            return result.returncode == 0, result.stdout + result.stderr
        else:
            result = subprocess.run(cmd, cwd=cwd or PROJECT_ROOT, env=merged_env, shell=isinstance(cmd, str))
            return result.returncode == 0, ""
    except Exception as e:
        print(f"Error running command: {e}", file=sys.stderr)
        return False, str(e)

def main():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  AAPESH — Spatial Audio Workstation Desktop Build           ║")
    print("╚══════════════════════════════════════════════════════════════╝")

    start_time = time.time()

    # ─── Step 1: Build Frontend ───────────────────────────────────────
    print("\n📦 Step 1: Building Vite Frontend...")
    success, output = run_cmd(["npm", "run", "build"], cwd=FRONTEND_DIR)
    if not success:
        print(f"❌ Frontend build failed!", file=sys.stderr)
        return 1
    print("✅ Frontend built successfully")

    # Verify dist exists
    if not DIST_DIR.exists():
        print(f"❌ Frontend dist directory not found at {DIST_DIR}", file=sys.stderr)
        return 1

    # Count files
    dist_files = list(DIST_DIR.rglob("*"))
    print(f"   Built {len(dist_files)} files in {DIST_DIR}")

    # ─── Step 2: Prepare PyInstaller Data Files ────────────────────────
    print("\n📦 Step 2: Preparing PyInstaller bundle...")

    # The spec file references frontend/dist - we need to make sure it's included
    # PyInstaller will pick up the datas from the spec file

    # ─── Step 3: Run PyInstaller ───────────────────────────────────────
    print("\n📦 Step 3: Running PyInstaller...")

    # Clean previous builds
    for path in [BUILD_DIR, DIST_OUTPUT_DIR]:
        if path.exists():
            print(f"   Cleaning {path}...")
            shutil.rmtree(path, ignore_errors=True)

    success, output = run_cmd([
        sys.executable, "-m", "PyInstaller",
        "--clean",
        "--noconfirm",
        "aapesh.spec"
    ])

    if not success:
        print(f"❌ PyInstaller build failed!", file=sys.stderr)
        return 1

    print("✅ PyInstaller completed")

    # ─── Step 4: Verify Output ─────────────────────────────────────────
    print("\n📦 Step 4: Verifying output...")

    exe_path = DIST_OUTPUT_DIR / "AAPESH.exe"
    if not exe_path.exists():
        print(f"❌ Executable not found at {exe_path}", file=sys.stderr)
        # Check alternative locations
        for alt in [PROJECT_ROOT / "dist" / "AAPESH.exe", PROJECT_ROOT / "AAPESH.exe"]:
            if alt.exists():
                exe_path = alt
                break
        else:
            return 1

    # Get file size
    size_bytes = exe_path.stat().st_size
    size_mb = size_bytes / (1024 * 1024)

    elapsed = time.time() - start_time

    print("\n" + "="*60)
    print("✅ BUILD SUCCESSFUL!")
    print("="*60)
    print(f"📁 Executable: {exe_path}")
    print(f"📦 Size: {size_mb:.1f} MB ({size_bytes:,} bytes)")
    print(f"⏱️  Build time: {elapsed:.1f} seconds")
    print("="*60)

    # Also check for the directory bundle
    if DIST_OUTPUT_DIR.exists():
        total_size = sum(f.stat().st_size for f in DIST_OUTPUT_DIR.rglob("*") if f.is_file())
        print(f"📁 Bundle directory: {DIST_OUTPUT_DIR}")
        print(f"📦 Total bundle size: {total_size / (1024*1024):.1f} MB")

    return 0

if __name__ == "__main__":
    sys.exit(main())