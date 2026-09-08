# AAPESH 🎵
> **Desktop-First Spatial Music Workstation • Liquid Glass Material • 3D Cinematic Environment • YouTube Music Catalog**

AAPESH is an open-source, production-grade desktop web music streaming workstation. Built for audiophiles and power users, AAPESH combines a deep charcoal liquid-glass aesthetic with a persistent 3D WebGL spatial environment, real-time synchronized karaoke lyrics, a 10-band pro graphic equalizer, and legitimate, high-fidelity YouTube Music streaming.

---

## 🌟 Core Highlights

```
MUSIC
  ↓
CURRENT TRACK (Single canonical source of truth)
  ↓
ARTWORK & HARMONIC PALETTE
  ↓
3D SPATIAL ENVIRONMENT (Persistent Three.js Layer)
  ↓
NOW PLAYING 2.0 WORKSTATION
```

### 1. 🌌 Now Playing 2.0 Spatial Experience
- **Three Conceptual Layers:**
  - **Layer 1 — Atmosphere:** Translucent spatial backdrop (`backdrop-blur-3xl`) with dynamic dual-radial aura glows derived from the playing song's artwork palette, ambient floor reflection, and deep contrast vignette.
  - **Layer 2 — Content:** Responsive hero artwork (`aspect-square rounded-[28px]`), prominent track title, secondary artist hierarchy, precision scrubber with monospace tabular readouts, focal circular play button, and volume slider.
  - **Layer 3 — Workstation UI:** Compact floating segmented mode switcher (`Cover | Lyrics | Queue | Video`), 10-Band Pro Equalizer, Spatial Audio 3D DSP pill, and share tool.
- **4 Dedicated View Modes:**
  - **Cover Mode:** High-resolution album art centered in the acoustic environment with tactile controls.
  - **Lyrics Mode:** Workstation split-screen with album anchor on the left and streaming synchronized lyrics on the right.
  - **Queue Mode:** Live Now Playing card with animated equalizer bars, upcoming track reordering, and Autoplay toggle.
  - **Video Mode:** Embedded official YouTube video in a 16:9 spatial theater frame.

### 2. 🪐 3D Cinematic Spatial Environment
- **Persistent Three.js Scene:** WebGL canvas mounted at the root layout that stays alive across track changes and navigations without recreating canvases or dropping frames.
- **Music-Reactive Depth:** Subtly responds to music playback energy (bass, mid, treble, transients) to create an organic breathing atmospheric effect.
- **Visual Quality Profiles:** Low, Medium, High, and Ultra quality tiers with automatic device pixel ratio capping, adaptive particle count, and graceful fallback when WebGL is unavailable or reduced-motion is requested.

### 3. 🎤 Synchronized Lyrics & Multilingual Karaoke Engine
- **Dual-Tier Lyrics Provider:** Primary official Musixmatch synchronized lyrics via YouTube Music with millisecond timestamps, backed by LRCLIB metadata correlation.
- **Word-to-Word Karaoke Tracking:** Syllable-level word highlighting (*Apple Music Sing* style) with high-resolution animation-frame tracking (~16ms precision).
- **Global Typography Stack:** Native font rendering and automatic bidirectional alignment for **Urdu (`font-urdu` / RTL), Arabic, Devanagari, Bengali, Gurmukhi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Japanese, Korean, and CJK**.
- **Per-Track Sync Calibration:** Non-destructive offset adjustment (`+50ms`, `+100ms`, `+500ms`) saved per song in `localStorage`.
- **Developer Diagnostics HUD (`Ctrl+Shift+D`):** Real-time overlay showing playback clock, line timestamps, duration difference, and confidence score.

### 4. 🎛️ 10-Band Pro Graphic Equalizer & Spatial Audio 3D DSP
- **Web Audio DSP Pipeline:** Full 10-band graphic equalizer (32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz) with gain controls from -12dB to +12dB.
- **Curated Acoustic Presets:** Flat, Bass Boost, Treble Boost, Vocal Focus, Electronic, Rock, Classical, Jazz, Acoustic, and Custom.
- **Spatial Audio DSP:** Stereo widening and acoustic crossfeed for headphone immersion.

### 5. 🎧 Legitimate YouTube IFrame Playback & VideoDock Compliance
- **Full Catalog Access:** Millions of official songs, albums, artists, remixes, and radio stations powered by `ytmusicapi` and the official YouTube IFrame Player API.
- **VideoDock Compliance:** Unobscured floating video dock supporting picture-in-picture, theater mode, and full-screen video without violating YouTube terms or using illegal 0px hiding tricks.
- **Media Session API:** Native OS lockscreen controls, media key integration, and album artwork notifications.

### 6. 🏠 Home Experience & Smart Library
- **Recently Played:** Deduplicated playback history stored locally and synchronized with the backend.
- **Following Artists:** Dedicated horizontal artist rail with instant access to top songs, albums, and discography.
- **Smart Shuffle:** True Fisher-Yates shuffle that preserves the currently playing song and restores original album sequence on toggle-off.
- **Autoplay Engine:** Automatically fetches and queues related tracks when reaching the end of a playlist.
- **Custom Playlists & Liked Songs:** Create, reorder, and manage custom playlists backed by SQLite and SQLAlchemy.

---

## ⌨️ Global Keyboard Shortcuts

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
| `F` | Toggle Fullscreen Now Playing 2.0 |
| `Q` | Toggle Play Queue Drawer |
| `L` | Toggle Lyrics Drawer |
| `V` | Toggle YouTube Video Dock |
| `/` | Focus Search Bar |
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `Esc` | Close Modals, Drawers, and Fullscreen |
| `Ctrl+Shift+D` | Toggle Lyrics Diagnostics HUD |

*(Shortcuts are automatically disabled when typing in inputs or text areas)*

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 6
- **Styling:** Tailwind CSS + Custom Liquid Glass Tokens
- **State Management:** Zustand (Player, Library, Equalizer, Theme)
- **3D / WebGL:** Three.js + Custom Cinematic Spatial Engine
- **Motion:** Framer Motion (Hardware-accelerated layout transitions)
- **Icons:** Lucide React
- **Unit Testing:** Vitest

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **Music Catalog:** `ytmusicapi`
- **Database & ORM:** SQLite + SQLAlchemy
- **Caching:** In-memory TTL cache
- **Server:** Uvicorn ASGI

---

## 📁 Repository Structure

```
gaandus/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (songs, search, playlists, lyrics, history)
│   │   ├── models/       # SQLAlchemy database models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # YTMusicService catalog & audio engine
│   │   └── main.py       # FastAPI application entry point
│   ├── auth/             # Optional Google OAuth setup CLI
│   └── requirements.txt  # Python backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios HTTP client with retry logic
│   │   ├── components/
│   │   │   ├── common/   # ArtworkImage, CommandPalette, EqualizerModal, Modals
│   │   │   ├── layout/   # AppLayout, TopBar, Sidebar, DynamicArtworkBackground
│   │   │   ├── player/   # FullScreenPlayer (Now Playing 2.0), BottomPlayer, VideoDock, SyncedLyrics
│   │   │   └── spatial/  # Three.js SpatialArtworkEnvironment, CinematicLighting, Particles
│   │   ├── hooks/        # useSyncedLyrics, useArtworkPalette, useKeyboardShortcuts
│   │   ├── stores/       # usePlayerStore, useLibraryStore, useEqualizerStore, useThemeStore
│   │   ├── styles/       # Liquid glass design system & typography tokens
│   │   ├── test/         # Vitest unit test suites (14 suites, 78+ tests)
│   │   └── types/        # TypeScript music, lyric, and player interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v22/v26)
- **Python**: 3.10+ (tested on Python 3.11/3.14)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/deadsec7869/gandwa-music-player.git
cd gandwa-music-player
```

### 2. Backend Setup
```bash
# 1. Install Python dependencies
pip install -r backend/requirements.txt

# 2. Start the FastAPI backend server on port 8000
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
> The local SQLite database (`aurora_music.db`) will be automatically created and initialized on first launch.

### 3. Frontend Setup
In a separate terminal:
```bash
cd frontend

# 1. Install Node dependencies
npm install

# 2. Start the Vite development server on port 5173
npm run dev
```

Open **`http://localhost:5173`** in your browser to experience AAPESH!

---

## 🔐 Optional YouTube Music OAuth Integration

AAPESH functions immediately out of the box in **Guest Mode** without requiring any credentials.

To sync your personal YouTube Music account (liked songs, custom playlists, recommendations):
1. Create a project in the [Google Cloud Console](https://console.cloud.google.com).
2. Enable the **YouTube Data API v3**.
3. Create an **OAuth 2.0 Client ID** (Desktop Application).
4. Create a `.env` file in the root directory:
   ```env
   YTMUSIC_CLIENT_ID=your-client-id.apps.googleusercontent.com
   YTMUSIC_CLIENT_SECRET=your-client-secret
   ```
5. Run the authentication setup assistant:
   ```bash
   python -m backend.auth.setup
   ```
6. Follow the prompt to authenticate with your Google account. This will save `oauth.json` for persistent access.

---

## 🧪 Testing & Verification

### Run Frontend Unit Tests
```bash
cd frontend
npm test
```

### Strict TypeScript Typecheck
```bash
cd frontend
npx tsc --noEmit
```

### Production Build
```bash
cd frontend
npm run build
```

### Run Backend Unit Tests
```bash
python -m pytest backend/tests/ -v
```

---

## ⚖️ Legal & Brand Notice

AAPESH is an independent desktop web music workstation powered by the YouTube Music catalog via `ytmusicapi` and the official Google YouTube IFrame Player API. AAPESH is not affiliated with, endorsed by, or sponsored by Google LLC, YouTube, Spotify AB, or Apple Inc. All artist names, album titles, and album artwork belong to their respective copyright owners.