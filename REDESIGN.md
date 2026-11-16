# AAPESH 2.0 implementation notes

## Source audit

The selected workspace was empty. The application was copied from the user-selected Desktop/gaandus working tree, including uncommitted frontend and backend changes. The original checkout was left untouched. The local SQLite library was carried forward using SQLite backup. Secrets, dependency caches and generated builds were excluded.

The actual frontend uses React 18.3, TypeScript, Vite, Tailwind, Zustand and Motion, with React Three Fiber for an optional spatial scene. A React 19 upgrade was not necessary for the redesign. AppLayout owns the long-lived playback shell around route content. The player store controls the YouTube iframe and the queue. FastAPI already had public catalogue routes and local CRUD for playlists and tracks. The local schema covers playlists and ordered playlist entries, likes, playback history, search history and preferences. Followed artists and offline metadata also use browser storage. Desktop FM and playlist import were retained.

## Design and implementation

The desktop sidebar separates listening destinations from the personal collection. Mobile keeps bottom navigation and places the dock above it. The home record sleeve uses actual history or recommendations; the record illustration remains usable while artwork loads. A serif display face, restrained metal accents and charcoal glass surfaces carry through search, collection pages, artist and album detail, player and contextual drawers. Compact transport, expanded views and native full screen share the same playback state.

The original home screen supplied hardcoded recommendations and substituted mix titles for real track names. The listening room now keeps catalogue, history and empty states distinct. Search and mood requests retain real results, and a late mood response cannot replace a newer selection. Local playlist edits reuse the existing PATCH endpoint; duplicate track removals use the selected entry. Library offers text filtering and sort order, followed artists, and albums represented in likes.

The iframe cannot provide PCM samples to an analyser. The audio engine now returns zero frequency/beat energy when a live analyser is absent. Lyric lines without real word timestamps stay highlighted at line level. The now-playing scene stops its animation loop when closed or reduced motion is active. Routes and the spatial scene are split from the initial app import.

The catalogue adapter accepts missing track artwork and both inline and playlist-based chart responses. These changes preserve the JSON contracts. Existing tests previously shared the listening database; they now run against temporary storage.

## Verification scope

Verification included the TypeScript/Vite production build, the Vitest and pytest suites, live catalogue requests, and Chromium checks at 1440×900 and 390×844. Browser checks exercised persistent playlist edits, live iframe playback, queue and lyrics panels, and the home-to-library journey. Search returned real songs, albums, artists, playlists and videos. A live Radiohead album returned 14 tracks; the global chart returned 50 tracks and 40 artists.

Availability of individual streams, translations, timed lyrics, artwork and provider charts varies by track and region. Browser tests can verify provider-reported progress, not the physical audio output. No public deployment or cross-browser certification was performed.
