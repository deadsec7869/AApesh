import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BottomPlayer } from '@/components/player/BottomPlayer';
import { SearchPage } from '@/pages/SearchPage';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Track } from '@/types/music';

const mockTrack: Track = {
  videoId: 'real-track-999',
  title: 'Real Midnight City',
  artists: [{ name: 'M83', id: 'artist-m83' }],
  album: 'Hurry Up, We\'re Dreaming',
  duration: '4:03',
  duration_seconds: 243,
  thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
};

describe('AAPESH: Bottom Player & Search Error Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      isBuffering: false,
      currentTime: 0,
      duration: 0,
      volume: 80,
      isMuted: false,
      isPlayerExpanded: false,
      queue: [],
    });
  });

  it('renders a deliberate empty standby state when nothing is playing without implying active playback', () => {
    render(<BottomPlayer />);

    // Must show deliberate "Nothing playing" empty state
    expect(screen.getByText('Nothing playing')).toBeInTheDocument();
    expect(screen.getByText('Select any track to begin playback')).toBeInTheDocument();
    expect(screen.getByText('Standby')).toBeInTheDocument();

    // Must NOT fabricate a track or render placeholder player metadata
    expect(screen.queryByText('AAPESH Workstation')).not.toBeInTheDocument();
    expect(screen.queryByText(/Spatial sound engine ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Quick Play')).not.toBeInTheDocument();
  });

  it('displays real artwork, title, artist and controls when a track is active', () => {
    usePlayerStore.setState({
      currentTrack: mockTrack,
      isPlaying: true,
      currentTime: 45,
      duration: 243,
    });

    render(<BottomPlayer />);

    // Real track details must be rendered
    expect(screen.getByText('Real Midnight City')).toBeInTheDocument();
    expect(screen.getByText('M83')).toBeInTheDocument();

    // Playback scrubber and timestamps
    expect(screen.getByLabelText('Seek Progress Bar')).toBeInTheDocument();

    // Transport buttons
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    expect(screen.getByLabelText('Next Track')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous Track')).toBeInTheDocument();
  });

  it('initiates playback through canonical store when selecting a track', async () => {
    const store = usePlayerStore.getState();
    expect(store.currentTrack).toBeNull();
    expect(store.isPlaying).toBe(false);

    // Call playTrack
    await store.playTrack(mockTrack);

    const updated = usePlayerStore.getState();
    expect(updated.currentTrack?.videoId).toBe('real-track-999');
    expect(updated.currentTrack?.title).toBe('Real Midnight City');
    expect(updated.isPlaying).toBe(true);
  });

  it('renders error state and working Retry button when search fails', async () => {
    // Mock fetch to simulate 503 error
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ detail: 'Music search service unavailable: timeout' }),
    } as Response);

    render(
      <MemoryRouter initialEntries={['/search/coldplay']}>
        <Routes>
          <Route path="/search/:query" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for error state to appear
    await waitFor(() => {
      expect(screen.getByText('Search unavailable')).toBeInTheDocument();
    });

    expect(screen.getByText('Music search service unavailable: timeout')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Now mock fetch to succeed on retry
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        query: 'coldplay',
        topResult: null,
        songs: [mockTrack],
        albums: [],
        artists: [],
        playlists: [],
        videos: [],
      }),
    } as Response);

    fireEvent.click(retryBtn);

    // Error should be cleared and results should appear
    await waitFor(() => {
      expect(screen.queryByText('Search unavailable')).not.toBeInTheDocument();
      expect(screen.getAllByText('Real Midnight City').length).toBeGreaterThan(0);
    });
  });
});
