import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { SearchPage } from '@/pages/SearchPage';
import { AlbumPage } from '@/pages/AlbumPage';
import { ArtistPage } from '@/pages/ArtistPage';
import { PlaylistPage } from '@/pages/PlaylistPage';
import { LikedSongsPage } from '@/pages/LikedSongsPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SongPage } from '@/pages/SongPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
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
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
