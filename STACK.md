# AAPESH technology stack

Inspected 2026-11-20. Versions below are manifest constraints, not installed-version verification.

| Layer | Current technology | Target role |
|---|---|---|
| UI | React ^18.3.1, TypeScript ^5.7.2, Vite ^6.0.3 | Responsive desktop-first workstation |
| State | Zustand ^4.5.5 | UI projection of controller-owned playback state |
| Styling | Tailwind ^3.4.17, Motion/Framer Motion, GSAP | Bounded glass effects and accessible transitions |
| Rendering | Three ^0.185.1, R3F ^8.18.0, Drei ^9.122.0, Rapier ^1.5.0 | Optional isolated visual stage; compatibility requires verification |
| Streaming | YouTube IFrame API | Core streaming provider |
| Local playback | Planned HTMLMediaElement + Web Audio | Local files, ten-band DSP and genuine FFT |
| Backend | FastAPI, Uvicorn, SQLAlchemy, SQLite | Catalogue and local library persistence |
| Desktop | PyWebView/WebView2, PyInstaller | Windows host and packaged distribution |
| Tests | Vitest ^2.1.8, Testing Library, pytest | Unit/integration coverage plus real host validation |

## Storage and configuration

- Development database: aurora_music.db; existing modified database must be preserved.
- Desktop database: %APPDATA%/AAPESH/aapesh.db, as configured by desktop_launcher.py.
- Browser device metadata: IndexedDB; this does not establish offline YouTube audio support.
- Catalogue authentication is optional per README; do not require credentials for public guest workflows.
- Desktop binding is loopback. Local-file delivery must use scoped identifiers, not arbitrary client-supplied filesystem paths.

## External boundaries

YouTube does not expose raw PCM through the iframe API. Local files can provide real analyser data; synthetic streaming visuals must be labeled as ambient simulation. Codec, autoplay, media-key and background behavior require tests in the installed WebView2 runtime and supported browsers.
