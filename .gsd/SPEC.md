# AAPESH workstation reliability refactor

Status: FINALIZED

User-approved requirements: preserve the optical charcoal glass workstation, prioritize Windows WebView2 and desktop browser, retain mobile layout, keep existing tests, add deterministic playback coordination and local-file DSP, isolate WebGL failures, and harden desktop startup/shutdown and SQLite persistence.

Implementation retains the installed React 18 stack; React 19 migration is separate. Existing store booleans remain compatibility projections while the controller owns explicit playback state. No YouTube PCM extraction or fabricated FFT. Local files are selected by the user. Existing music database must not be modified by tests.

Acceptance: existing frontend suite remains green; new race and failure tests pass; production build and backend tests pass. Real Windows lock/minimize, GPU context-loss and packaged-executable soak tests must be distinguished from automated tests and never claimed without evidence.
