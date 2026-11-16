# AAPESH — Listening Room

AAPESH is a desktop-first music player with a responsive listening room, a persistent playback dock and an artwork-led player. The catalogue comes from YouTube Music. Audio plays through the official YouTube iframe. Local playlists, likes and listening history are stored in SQLite.

## Run locally

From the project root, install the API dependencies and launch FastAPI:

    python -m pip install -r backend/requirements.txt
    python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

In a second terminal:

    cd frontend
    npm ci --legacy-peer-deps
    npm run dev -- --host 127.0.0.1 --port 5187

Open http://127.0.0.1:5187. Vite proxies /api to port 8000. Start the API from the root so it finds the local database. The app can browse the public catalogue without credentials; optional provider authentication is configured through .env.example. The development server is intended for local use.

## Listening and collecting

- Start from a recent track or browse live recommendations. Discover lists charts and moods; Search covers songs, albums, artists and playlists.
- Use the dock across pages. Expand it for artwork, queue, lyrics or video. On supporting browsers, the expand-screen icon enters native full screen.
- In the queue, drag tracks or use the move buttons. Open a track menu to play it next, add it to a playlist or save its details on the device.
- Create or import playlists in Library. Open a local playlist to edit its name and description, play, shuffle or remove entries. Public playlists are read-only.
- Lyrics follow provider timestamps when available. Plain lyrics remain readable without a moving highlight. Direction and typeface follow the script of each line.
- Device storage can retain track details; it does not download YouTube audio. Embedded streams require internet access. Frequency data and processed audio are unavailable from the iframe. The spatial scene can use artwork and playback state without manufacturing audio measurements.

## Checks

    python -m pytest backend/tests -q
    cd frontend
    npm test
    npm run build

Backend tests use a temporary SQLite database. See REDESIGN.md for the repository audit, implementation decisions, and verification scope.
