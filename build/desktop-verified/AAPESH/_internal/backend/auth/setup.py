"""
Aurora Music - YouTube Music OAuth Setup Utility
Run this script to authenticate your Google/YouTube Music account.

Usage:
    python -m backend.auth.setup
"""

import os
import sys
from ytmusicapi import setup_oauth


def run_setup():
    print("=" * 60)
    print("       AURORA MUSIC - YOUTUBE MUSIC OAUTH SETUP")
    print("=" * 60)
    print("\nThis utility authenticates your Google account with YouTube Music")
    print("and generates an `oauth.json` token file so Aurora Music can sync")
    print("your personal library, playlists, and recommendations.\n")

    client_id = os.getenv("YTMUSIC_CLIENT_ID", "")
    client_secret = os.getenv("YTMUSIC_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        print("Please enter your Google Cloud OAuth Client credentials.")
        print("(If you don't have them yet, see README.md for instructions)\n")
        client_id = input("Client ID: ").strip()
        client_secret = input("Client Secret: ").strip()

    if not client_id or not client_secret:
        print("\n[!] Setup cancelled. Client ID and Client Secret are required.")
        sys.exit(1)

    print("\n[+] Starting OAuth flow. Follow the instructions on screen...")
    filepath = "oauth.json"

    try:
        setup_oauth(client_id=client_id, client_secret=client_secret, filepath=filepath)
        print("\n" + "=" * 60)
        print(f"[✓] SUCCESS! Credentials saved to `{filepath}`.")
        print("    Aurora Music can now access your YouTube Music account.")
        print("=" * 60)
    except Exception as e:
        print(f"\n[!] Error during OAuth setup: {e}")
        sys.exit(1)


if __name__ == "__main__":
    run_setup()
