import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { AboutThisSongModal } from '@/components/player/AboutThisSongModal';
import { api } from '@/api/client';
import { clearSongContextCache } from '@/hooks/useSongContext';
import { Track, SongContextResponse } from '@/types/music';

const mockTrack1: Track = {
  videoId: 'mock_song_1',
  title: 'Starboy',
  artists: [{ id: 'artist_weeknd', name: 'The Weeknd' }],
  album: 'Starboy',
  albumId: 'album_starboy',
  duration: '3:50',
  duration_seconds: 230,
  thumbnail: 'https://example.com/starboy.jpg',
  isExplicit: true,
};

const mockTrack2: Track = {
  videoId: 'mock_song_2',
  title: 'Blinding Lights',
  artists: [{ id: 'artist_weeknd', name: 'The Weeknd' }],
  album: 'After Hours',
  albumId: 'album_after_hours',
  duration: '3:20',
  duration_seconds: 200,
  thumbnail: 'https://example.com/blinding_lights.jpg',
  isExplicit: false,
};

const mockContextFull: SongContextResponse = {
  videoId: 'mock_song_1',
  title: 'Starboy',
  artists: [
    { id: 'artist_weeknd', name: 'The Weeknd' },
    { id: 'artist_daftpunk', name: 'Daft Punk' },
  ],
  album: 'Starboy',
  albumId: 'album_starboy',
  duration: '3:50',
  duration_seconds: 230,
  thumbnail: 'https://example.com/starboy.jpg',
  isExplicit: true,
  year: '2016',
  releaseDate: 'November 25, 2016',
  genre: 'R&B / Pop',
  albumType: 'Album',
  language: 'en',
  artistDetails: {
    id: 'artist_weeknd',
    name: 'The Weeknd',
    subscribers: '35M subscribers',
    thumbnail: 'https://example.com/weeknd.jpg',
    description: 'Abel Makkonen Tesfaye, known professionally as The Weeknd, is a Canadian singer and songwriter.',
  },
  albumDetails: {
    browseId: 'album_starboy',
    title: 'Starboy',
    year: '2016',
    trackCount: 18,
    thumbnail: 'https://example.com/starboy_album.jpg',
    artists: [{ id: 'artist_weeknd', name: 'The Weeknd' }],
  },
  credits: {
    performed_by: {
      localized_title: 'Performed By',
      data: ['The Weeknd', 'Daft Punk'],
    },
    written_by: {
      localized_title: 'Written By',
      data: ['Abel Tesfaye', 'Thomas Bangalter', 'Guy-Manuel de Homem-Christo', 'Martin McKinney'],
    },
    produced_by: {
      localized_title: 'Produced By',
      data: ['Daft Punk', 'Doc McKinney', 'Cirkut', 'The Weeknd'],
    },
    composed_by: {
      localized_title: 'Composed By',
      data: ['Abel Tesfaye', 'Martin McKinney'],
    },
    music_metadata_provided_by: {
      localized_title: 'Metadata Source',
      data: ['Universal Music Group / Republic Records'],
    },
    other_sections: [
      {
        localized_title: 'Copyright',
        data: ['(C) 2016 The Weeknd XO, Inc., Manufactured by Republic Records'],
      },
    ],
  },
  related: {
    fromAlbum: [
      {
        videoId: 'mock_album_trk_1',
        title: 'Party Monster',
        artists: [{ name: 'The Weeknd' }],
        album: 'Starboy',
      },
    ],
    moreFromArtist: [
      {
        videoId: 'mock_more_trk_1',
        title: 'Save Your Tears',
        artists: [{ name: 'The Weeknd' }],
      },
    ],
    youMightLike: [],
  },
  lyricsInfo: {
    hasLyrics: true,
    synced: true,
    provider: 'youtube_musixmatch',
    language: 'en',
  },
};

describe('AAPESH About This Song 2.0 (Context + Credits + Metadata)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSongContextCache();
    const state = usePlayerStore.getState();
    state.setAboutOpen(false);
    state.currentTrack = null;
    state.isPlaying = false;
  });

  afterEach(() => {
    cleanup();
    clearSongContextCache();
    vi.restoreAllMocks();
  });

  it('does not render modal when isAboutOpen is false', () => {
    usePlayerStore.setState({ currentTrack: mockTrack1, isAboutOpen: false });
    render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders modal with base track information when isAboutOpen is true', async () => {
    vi.spyOn(api, 'getSongContext').mockResolvedValue(mockContextFull);

    act(() => {
      usePlayerStore.setState({ currentTrack: mockTrack1, isAboutOpen: true });
    });

    render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Starboy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('The Weeknd').length).toBeGreaterThan(0);
  });

  it('loads real credits, personnel, and metadata without data fabrication', async () => {
    vi.spyOn(api, 'getSongContext').mockResolvedValue(mockContextFull);

    act(() => {
      usePlayerStore.setState({ currentTrack: mockTrack1, isAboutOpen: true });
    });

    render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Song Credits')).toBeInTheDocument();
      expect(screen.getAllByText('Abel Tesfaye').length).toBeGreaterThan(0);
      expect(screen.getByText('Thomas Bangalter')).toBeInTheDocument();
      expect(screen.getByText('Doc McKinney')).toBeInTheDocument();
      expect(screen.getByText('Universal Music Group / Republic Records')).toBeInTheDocument();
    });

    // Verify Artist & Album spotlight
    expect(screen.getByText('Artist Spotlight')).toBeInTheDocument();
    expect(screen.getByText('35M subscribers')).toBeInTheDocument();
    expect(screen.getByText('Album Information')).toBeInTheDocument();
    expect(screen.getByText('18 tracks')).toBeInTheDocument();
  });

  it('gracefully handles partial metadata when credits and extra info are missing', async () => {
    const partialContext: SongContextResponse = {
      videoId: 'mock_song_2',
      title: 'Blinding Lights',
      artists: [{ id: 'artist_weeknd', name: 'The Weeknd' }],
      album: 'After Hours',
      albumId: 'album_after_hours',
      duration: '3:20',
      duration_seconds: 200,
      thumbnail: 'https://example.com/blinding_lights.jpg',
      isExplicit: false,
      year: '2020',
      credits: null,
      artistDetails: null,
      albumDetails: null,
      related: null,
      lyricsInfo: null,
    };

    vi.spyOn(api, 'getSongContext').mockResolvedValue(partialContext);

    act(() => {
      usePlayerStore.setState({ currentTrack: mockTrack2, isAboutOpen: true });
    });

    render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Blinding Lights').length).toBeGreaterThan(0);
    });

    // Should NOT show empty credit headers
    expect(screen.queryByText('Song Credits')).toBeNull();
    expect(screen.queryByText('Artist Spotlight')).toBeNull();
    expect(screen.queryByText('Album Information')).toBeNull();
  });

  it('handles API failure gracefully with retained base track and restrained notice', async () => {
    vi.spyOn(api, 'getSongContext').mockRejectedValue(new Error('Network timeout'));

    act(() => {
      usePlayerStore.setState({ currentTrack: mockTrack1, isAboutOpen: true });
    });

    render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Some song information isn't available right now.")).toBeInTheDocument();
    });

    // Base track title remains intact
    expect(screen.getAllByText('Starboy').length).toBeGreaterThan(0);
  });

  it('serves cached context immediately without duplicate network fetch', async () => {
    const fetchSpy = vi.spyOn(api, 'getSongContext').mockResolvedValue(mockContextFull);

    // Initial load
    act(() => {
      usePlayerStore.setState({ currentTrack: mockTrack1, isAboutOpen: true });
    });

    const { unmount } = render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Reopen modal for the same track
    render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    expect(screen.getAllByText('Starboy').length).toBeGreaterThan(0);
    // Cache was used, no second API hit
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('supports closing via close button and Escape key', async () => {
    vi.spyOn(api, 'getSongContext').mockResolvedValue(mockContextFull);

    act(() => {
      usePlayerStore.setState({ currentTrack: mockTrack1, isAboutOpen: true });
    });

    render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    const closeBtn = screen.getByLabelText('Close About This Song');
    fireEvent.click(closeBtn);

    expect(usePlayerStore.getState().isAboutOpen).toBe(false);

    // Test Escape key
    act(() => {
      usePlayerStore.setState({ isAboutOpen: true });
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(usePlayerStore.getState().isAboutOpen).toBe(false);
  });

  it('triggers play/pause and queue actions without mutating unexpected state', async () => {
    vi.spyOn(api, 'getSongContext').mockResolvedValue(mockContextFull);

    const togglePlaySpy = vi.fn();
    const addToQueueSpy = vi.fn();

    usePlayerStore.setState({
      currentTrack: mockTrack1,
      isAboutOpen: true,
      isPlaying: false,
      togglePlay: togglePlaySpy,
      addToQueue: addToQueueSpy,
    });

    render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    const playBtn = screen.getByLabelText('Play song');
    fireEvent.click(playBtn);
    expect(togglePlaySpy).toHaveBeenCalled();

    const queueBtn = screen.getByLabelText('Add to Queue');
    fireEvent.click(queueBtn);
    expect(addToQueueSpy).toHaveBeenCalledWith(mockTrack1);
  });

  it('switches to lyrics experience when clicking Open Lyrics shortcut', async () => {
    vi.spyOn(api, 'getSongContext').mockResolvedValue(mockContextFull);

    const toggleLyricsSpy = vi.fn();

    usePlayerStore.setState({
      currentTrack: mockTrack1,
      isAboutOpen: true,
      toggleLyrics: toggleLyricsSpy,
    });

    render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Open Synced Lyrics')).toBeInTheDocument();
    });

    const lyricsBtn = screen.getByLabelText('Open Synced Lyrics');
    fireEvent.click(lyricsBtn);

    expect(toggleLyricsSpy).toHaveBeenCalled();
    expect(usePlayerStore.getState().isAboutOpen).toBe(false);
  });

  it('updates metadata seamlessly when currentTrack changes while open', async () => {
    vi.spyOn(api, 'getSongContext').mockImplementation((videoId: string) => {
      if (videoId === 'mock_song_1') return Promise.resolve(mockContextFull);
      return Promise.resolve({
        ...mockContextFull,
        videoId: 'mock_song_2',
        title: 'Blinding Lights',
        artists: [{ name: 'The Weeknd' }],
      });
    });

    act(() => {
      usePlayerStore.setState({ currentTrack: mockTrack1, isAboutOpen: true });
    });

    const { rerender } = render(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Starboy').length).toBeGreaterThan(0);
    });

    // Change current track
    act(() => {
      usePlayerStore.setState({ currentTrack: mockTrack2 });
    });

    rerender(
      <BrowserRouter>
        <AboutThisSongModal />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Blinding Lights').length).toBeGreaterThan(0);
    });
  });
});
