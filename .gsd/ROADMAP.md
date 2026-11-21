# File-level execution roadmap

1. PlaybackStateMachine.ts: pure explicit state transitions and request identities.
2. DualAudioController.ts: provider exclusivity, cancellable command waiting, stale result rejection, pending seeks, safe callbacks and Media Session integration.
3. LocalAudioProvider.ts / localFiles.ts: user-selected audio, object URL lifecycle, single Web Audio graph, ten-band parametric EQ and analyser.
4. usePlayerStore.ts / useAudioDSPStore.ts: preserve UI/store contracts while routing playback and DSP to the controller.
5. YouTubeIframeProvider.ts: bounded initialization, explicit failures, stale event checks and removal of delayed unscoped auto-skip.
6. VisualStageBoundary.tsx / SoundstageCanvas.tsx / SpatialScene.tsx: context-loss fallback and isolated rendering.
7. LibraryPage.tsx / transport components: local import, clear playback state and responsive workstation controls.
8. backend/app/db/database.py / desktop_launcher.py: WAL, busy timeout, health-based readiness and finally-based teardown.
9. frontend/src/test and backend/tests: baseline, deterministic regressions, production build and runtime checks.

Baseline: 33 frontend test files, 253 tests passed before implementation.

Wireframe: navigation | library/discovery | optional queue; persistent bottom glass transport. Expanded player: artwork/optional stage | queue/lyrics. Mobile: content, mini-player, bottom navigation. Stage lifetime never owns provider lifetime.
