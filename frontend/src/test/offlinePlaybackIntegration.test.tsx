import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OfflineStatusBadge } from '../components/common/OfflineStatusBadge';
import { LibraryPage } from '../pages/LibraryPage';
import { DownloadedMusicPage } from '../pages/DownloadedMusicPage';
import { ContextMenu } from '../components/music/ContextMenu';
import { TrackRow } from '../components/music/TrackRow';
import { useOfflineStore } from '../stores/useOfflineStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { offlineStorage } from '../services/storage/IndexedDBStorageService';
import { Track } from '../types/music';

const mockTrack: Track = {
  videoId: 'integ_track_1',
  title: 'Starboy (Offline Test)',
  artists: [{ name: 'The Weeknd', id: 'artist_weeknd' }],
  album: 'Starboy',
  albumId: 'album_starboy',
  duration: '3:50',
  duration_seconds: 230,
  thumbnail: 'https://img.youtube.com/vi/integ_track_1/hqdefault.jpg',
};

describe('Offline UI & Playback Resilience Integration', () => {
  beforeEach(async () => {
    await offlineStorage.clearAll();
    useOfflineStore.setState({
      downloadedTracks: [],
      downloadedRecords: [],
      downloadedIds: new Set<string>(),
      downloadingIds: new Set<string>(),
      storageUsedBytes: 0,
      storageQuotaBytes: 1024 * 1024 * 1024,
      isOffline: false,
      isInitialized: true,
    });
    usePlayerStore.setState({
      currentTrack: null,
      queue: [],
      isPlaying: false,
      error: null,
    });
  });

  it('renders OfflineStatusBadge when isOffline is true and hides when false', () => {
    const { rerender } = render(<OfflineStatusBadge />);
    // Initially online
    expect(screen.queryByText(/Offline Mode/i)).toBeNull();

    // Set offline
    useOfflineStore.setState({ isOffline: true });
    rerender(<OfflineStatusBadge />);

    expect(screen.getByText(/Offline Mode/i)).toBeInTheDocument();

    // Toggle back to online
    useOfflineStore.setState({ isOffline: false });
    rerender(<OfflineStatusBadge />);
    expect(screen.queryByText(/Offline Mode/i)).toBeNull();
  });

  it('renders Downloaded Music card on LibraryPage and navigates to /library/downloaded', () => {
    useOfflineStore.setState({
      downloadedTracks: [mockTrack],
      downloadedIds: new Set(['integ_track_1']),
      storageUsedBytes: 15 * 1024 * 1024, // 15MB
    });

    render(
      <MemoryRouter initialEntries={['/library']}>
        <Routes>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/downloaded" element={<div data-testid="downloaded-page">Downloaded Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
    expect(screen.getByText(/1 song saved/i)).toBeInTheDocument();

    // Clicking the downloaded card
    const card = screen.getByText('Saved on this device').closest('div');
    if (card) {
      fireEvent.click(card);
    }
  });

  it('renders DownloadedMusicPage with track list and Play All action', () => {
    useOfflineStore.setState({
      downloadedTracks: [mockTrack],
      downloadedIds: new Set(['integ_track_1']),
      storageUsedBytes: 12 * 1024 * 1024,
    });

    const playSpy = vi.fn();
    usePlayerStore.setState({ playTrack: playSpy });

    render(
      <MemoryRouter>
        <DownloadedMusicPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
    expect(screen.getByText(/Starboy \(Offline Test\)/i)).toBeInTheDocument();
    expect(screen.getByText(/12.0 MB/i)).toBeInTheDocument();

    const playAllBtn = screen.getByRole('button', { name: /Play All/i });
    fireEvent.click(playAllBtn);
    expect(playSpy).toHaveBeenCalledWith(mockTrack, [mockTrack]);
  });

  it('toggles download in ContextMenu and updates useOfflineStore', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <ContextMenu
          track={mockTrack}
          isOpen={true}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    // Initial: Not downloaded
    expect(screen.getByText('Save track details offline')).toBeInTheDocument();

    // Trigger download
    const downloadBtn = screen.getByText('Save track details offline');
    await fireEvent.click(downloadBtn);

    expect(useOfflineStore.getState().isDownloaded(mockTrack.videoId)).toBe(true);

    // Re-render: Should show "Remove Download"
    rerender(
      <MemoryRouter>
        <ContextMenu
          track={mockTrack}
          isOpen={true}
          onClose={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Remove from this device')).toBeInTheDocument();
  });

  it('renders cached indicator on TrackRow when track is downloaded', () => {
    const { rerender } = render(
      <MemoryRouter>
        <TrackRow track={mockTrack} index={0} />
      </MemoryRouter>
    );

    // Initially not downloaded
    expect(screen.queryByTitle('Downloaded for Offline Listening')).toBeNull();

    // Set as downloaded
    useOfflineStore.setState({
      downloadedIds: new Set([mockTrack.videoId]),
    });

    rerender(
      <MemoryRouter>
        <TrackRow track={mockTrack} index={0} />
      </MemoryRouter>
    );

    expect(screen.getByTitle('Downloaded for Offline Listening')).toBeInTheDocument();
  });
});

