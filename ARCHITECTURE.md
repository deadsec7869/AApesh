# AAPESH architecture audit

Audited 2026-11-20. This is a source inspection, not runtime verification.

## Current structure

- React entry: frontend/src/main.tsx and App.tsx; route shell in components/layout.
- Zustand playback ownership: frontend/src/stores/usePlayerStore.ts.
- Provider boundary: frontend/src/services/player/PlaybackProvider.ts and YouTubeIframeProvider.ts.
- Visual layers: components/canvas, components/spatial, components/player and components/hud.
- Catalogue, library and persistence: backend/app/main.py, api/routes, services, models and db.
- Desktop entry: desktop_launcher.py; packaging: build_desktop.py.
- Tests: frontend/src/test and backend/tests.

## Current data flow

UI -> Zustand -> YouTube iframe; provider callbacks -> Zustand -> UI.
UI -> FastAPI -> catalogue services / SQLite.
Desktop launcher -> Uvicorn thread + PyWebView window.

## Observed risks

- initEngine marks initialization complete before awaiting provider initialization.
- playTrack and playQueueIndex independently await load then play, without a common command coordinator.
- Provider callbacks carry no track/session identity in their public contract.
- SoundstageCanvas subscribes to complete stores rather than selected fields.
- Desktop readiness event is set before server.run; main uses a fixed sleep before opening the window.
- Main shutdown path lacks a finally around the WebView event loop.

These observations identify review targets; they do not establish every reported crash's cause.

## Target ownership

UI intent -> PlaybackController -> exclusive active provider (YouTube or local HTMLMediaElement).
Provider observations -> controller snapshot -> narrow Zustand selectors.
Local media -> one Web Audio graph -> ten filters -> gain/analyser -> output.
Visual stage consumes snapshots / analyser samples, never owns playback lifetime.

## Implementation sequence

1. Establish responsive shell, design tokens, loading/error states and static Stealth mode.
2. Add playback coordinator, shared initialization promise, intent/observed state separation and stale-work rejection.
3. Add local-file identity, import/relink flow, media provider and shared DSP graph.
4. Isolate optional visual stages, handle context loss and bound resource retention.
5. Correct desktop readiness, AppData database lifecycle and guaranteed teardown.
6. Verify rapid input, provider switching, context loss, packaging, background playback and long sessions.

## Verification boundary

No implementation or runtime checks performed in this audit. Browser timers must not determine audio progression. Renderer/process failure can still interrupt WebView-owned audio; React boundaries cannot guarantee survival of process failure.
