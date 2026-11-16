import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
const HomePage = React.lazy(() =>
  import('@/pages/HomePage').then((m) => ({ default: m.HomePage })),
);
const DiscoverPage = React.lazy(() =>
  import('@/pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })),
);
const SearchPage = React.lazy(() =>
  import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const AlbumPage = React.lazy(() =>
  import('@/pages/AlbumPage').then((m) => ({ default: m.AlbumPage })),
);
const ArtistPage = React.lazy(() =>
  import('@/pages/ArtistPage').then((m) => ({ default: m.ArtistPage })),
);
const PlaylistPage = React.lazy(() =>
  import('@/pages/PlaylistPage').then((m) => ({ default: m.PlaylistPage })),
);
const LibraryPage = React.lazy(() =>
  import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })),
);
const LikedSongsPage = React.lazy(() =>
  import('@/pages/LikedSongsPage').then((m) => ({ default: m.LikedSongsPage })),
);
const DownloadedMusicPage = React.lazy(() =>
  import('@/pages/DownloadedMusicPage').then((m) => ({
    default: m.DownloadedMusicPage,
  })),
);
const HistoryPage = React.lazy(() =>
  import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);
const SettingsPage = React.lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const SongPage = React.lazy(() =>
  import('@/pages/SongPage').then((m) => ({ default: m.SongPage })),
);
const NotFoundPage = React.lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const DesktopFmPage = React.lazy(() =>
  import('@/pages/DesktopFmPage').then((m) => ({ default: m.DesktopFmPage })),
);

export const App: React.FC = () => {
  return (
    <React.Suspense
      fallback={
        <p role="status" className="p-6">
          Opening listening room…
        </p>
      }
    >
      <BrowserRouter>
        <Routes>
          {/* Standalone Desktop.fm Single-Screen Experience */}
          <Route path="/desktop-fm" element={<DesktopFmPage />} />
          <Route path="/teaser" element={<DesktopFmPage />} />

          {/* Workstation Application Layout */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="search/:query" element={<SearchPage />} />
            <Route path="album/:id" element={<AlbumPage />} />
            <Route path="artist/:id" element={<ArtistPage />} />
            <Route path="playlist/:id" element={<PlaylistPage />} />
            <Route path="song/:id" element={<SongPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="library/liked" element={<LikedSongsPage />} />
            <Route
              path="library/downloaded"
              element={<DownloadedMusicPage />}
            />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </React.Suspense>
  );
};
