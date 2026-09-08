# AAPESH 🎵
> **Desktop-First Spatial Music Workstation • Liquid Glass • Atmospheric Sound • YouTube Music Catalog**

AAPESH is a production-grade full-stack desktop music streaming workstation built with **React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, and Zustand** on the frontend, and **FastAPI, ytmusicapi, SQLite, and SQLAlchemy** on the backend.

---

## ✨ Features

- 🎧 **Real Playback Engine:** Built on an abstract `PlaybackProvider` interface powered by the official **YouTube IFrame Player API** (`YouTubeIframeProvider`), giving full-fidelity, legitimate streaming for all songs, videos, and radios across the YouTube Music catalog without scraping or brittle stream URL expiration.
- 📺 **Official YouTube Terms Compliance (VideoDock):** Implements an official, unobscured video player dock supporting floating picture-in-picture, theater mode, and full-screen video tabs without breaking YouTube brand requirements or relying on illegal 0px/0-opacity hiding hacks.
- 🎨 **Cinematic Atmosphere:** Deep charcoal and near-black aesthetic, dynamic backdrop aura that extracts primary harmonic colors from album artwork (`ArtworkPalette`), fluid transitions, and glassy layered surfaces.
- ⏯️ **Persistent Player:** Fixed bottom audio dock that stays playing seamlessly across all page navigations, complete with an interactive scrubber, volume control, full-screen sheet expansion, and Media Session API system lockscreen controls.
- 📜 **Lyrics & Queue Drawers:** Synchronized slide-over drawers with live lyrics extracted from YouTube Music and dynamic queue reordering.
- 🔀 **Smart Shuffle & Queue:** Fisher-Yates shuffle on upcoming tracks that preserves the currently playing song, maintains `originalQueue` order, and restores natural album sequence on toggle-off.
- 🔍 **Real Instant Search:** Debounced as-you-type search with `AbortController` cancellation, categorized shelves (Songs, Albums, Artists, Playlists), error recovery with retry, and search history.
- 🗂️ **Custom Library & Playlists:** Create, update, delete, and reorder custom playlists stored locally in SQLite via SQLAlchemy.
- ⌨️ **Global Shortcuts & Command Palette (`⌘K` / `Ctrl+K`):** Control playback from anywhere with Space (Play/Pause), Left/Right arrows (Seek), Up/Down arrows (Volume), N (Next), P (Prev), M (Mute), F (Full Player), Q (Queue), L (Lyrics), V (Video Dock), / (Search).
- 📱 **Fully Responsive:** Cinematic workstation layout on desktop, responsive bottom navigation bar and mobile drawer on mobile devices.
- 🔒 **Dual Authentication Mode:** Operates 100% out-of-the-box in guest/public mode with no login required. Easily syncs with personal YouTube Music accounts when Google OAuth credentials are provided.

---

## ⌨️ Global Shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Play / Pause |
| `Arrow Right` | Seek Forward (+5s) |
| `Arrow Left` | Seek Backward (-5s) |
| `Arrow Up` | Volume Up (+5%) |
| `Arrow Down` | Volume Down (-5%) |
| `N` | Next Track |
| `P` | Previous Track (or restart if > 3s) |
| `M` | Toggle Mute |
| `F` | Toggle Fullscreen Player Sheet |
| `Q` | Toggle Play Queue Drawer |
| `L` | Toggle Lyrics Drawer |
| `V` | Toggle YouTube Video Dock |
| `/` | Focus Search Input |
| `Ctrl+K` / `⌘K` | Open Command Palette |
| `Esc` | Close Dialogs, Panels, and Sheets |
| `Ctrl+Shift+D` | Toggle Lyrics Synchronization Diagnostics HUD |

*(Shortcuts are automatically disabled when typing in inputs or textareas)*

---

## 🎤 Synchronized Lyrics Architecture & Precision Calibration

Aurora Music features a synchronized lyrics engine designed to overcome audio/video timing discrepancies between YouTube uploads and studio recordings:

1. **Dual-Tier Lyrics Provider:**
   - **Primary (Official):** Fetches YouTube Music native timed lyrics via Musixmatch with millisecond-exact timestamps.
   - **Secondary (LRCLIB Fallback):** Correlates track metadata while preserving song versions (`Live`, `Remix`, `Acoustic`, `Remastered`) and filters against YouTube audio duration.
2. **Duration Matching & Confidence Scoring:**
   - Evaluates duration delta between media playback length and lyrics timestamps:
     - `excellent` (< 1.5s delta)
     - `good` (1.5s – 3.0s delta)
     - `uncertain` (3.0s – 5.0s delta)
     - `poor` (> 5.0s delta — displays mismatch warning badge)
3. **High-Resolution Playback Tracking:**
   - Replaces low-frequency 250ms polling with a dedicated `requestAnimationFrame` engine query (~16ms precision) directly tied to the YouTube Player clock.
4. **Per-Track Precision Calibration:**
   - Interactive calibration toolbar in both side drawer and fullscreen views.
   - Non-destructive, persistent per-song offset stored in `localStorage` (`aurora_lyrics_offset_{videoId}`).
   - Adjusts lyrics earlier (`+50ms`, `+100ms`, `+500ms`) or later (`-50ms`, `-100ms`, `-500ms`).
5. **Developer Diagnostics HUD:**
   - Press `Ctrl+Shift+D` (or click `HUD` in the calibration bar) to display a real-time diagnostics overlay with track ID, provider, audio time, line start/end, delta, and sync confidence.

---

## 🏗️ Architecture

```
Browser
   ↓
Aurora Frontend (React 19 + TypeScript + Zustand + Framer Motion + Tailwind CSS)
   │
   ├── Audio Playback: PlaybackProvider → YouTubeIframeProvider (Official Google IFrame API)
   │     ├── VideoDock (Docked PiP, Theater, and Fullscreen Video Tab)
   │     └── Media Session API (System lockscreen and hardware keys)
   │
   ↓ (REST API via /api/*)
FastAPI Backend Server
   │
   ├── Cache: In-Memory TTL Cache (Fast responses for home, search, charts)
   ├── Database: SQLite via SQLAlchemy (Playlists, Liked Songs, History)
   └── Service Layer: YTMusicService (Centralized ytmusicapi wrapper)
         ↓
    YouTube Music (Global Catalog)
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18+ (tested on Node v26)
- **Python**: 3.10+ (tested on Python 3.14)
- **Git**

### 1. Clone & Configure
```bash
git clone <repository_url>
cd gaandus

# Copy example environment configuration
cp .env.example .env
```

### 2. Backend Setup
```bash
# Install Python requirements
python -m pip install -r backend/requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```
*The database (`aurora_music.db`) will initialize automatically on first launch.*

### 3. Frontend Setup
In a separate terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server on port 5173
npm run dev
```

Open `http://localhost:5173` in your browser!

---

## 🔐 YouTube Music OAuth Setup (Optional)

Aurora Music works immediately in Guest Mode without any credentials. To sync your personal YouTube Music playlists, ratings, and library:

1. Visit the [Google Cloud Console](https://console.cloud.google.com).
2. Create a project and enable the **YouTube Data API v3**.
3. Under **Credentials**, create an **OAuth 2.0 Client ID** (Desktop Application).
4. Set your environment variables in `.env`:
   ```env
   YTMUSIC_CLIENT_ID=your-client-id.apps.googleusercontent.com
   YTMUSIC_CLIENT_SECRET=your-client-secret
   ```
5. Run the interactive authentication helper:
   ```bash
   python -m backend.auth.setup
   ```
6. Follow the prompt to log in with your Google account. This will generate `oauth.json`.
7. Reload the server or click **Reload Status** in the Settings page.

---

## 🧪 Running Tests

### Backend Unit Tests (pytest)
```bash
python -m pytest backend/tests/ -v
```

### Frontend Unit Tests (vitest)
```bash
cd frontend
npm test
```

### Production Build
```bash
cd frontend
npm run build
```

---

## ⚖️ Legal & Brand Notice
Aurora Music is an independent music streaming workstation application powered by the YouTube Music catalog via `ytmusicapi` and the official YouTube IFrame Player API. Aurora Music is not affiliated with, endorsed by, or sponsored by Google LLC, YouTube, Spotify AB, or Apple Inc. All artist names, album titles, and artwork belong to their respective copyright holders.
#   g a n d w a - m u s i c - p l a y e r  
 