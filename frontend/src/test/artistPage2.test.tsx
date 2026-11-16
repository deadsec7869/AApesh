import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { ArtistPage } from '@/pages/ArtistPage';
import { api } from '@/api/client';
import { Artist } from '@/types/music';

const mockArtistData: Artist = {
  channelId: 'art_the_weeknd',
  name: 'The Weeknd',
  description: 'The Weeknd is a Canadian singer, songwriter, and record producer known for his sonic versatility and dark lyricism.',
  subscribers: '34.2M subscribers',
  views: '24B views',
  thumbnail: 'https://example.com/the_weeknd.jpg',
  thumbnails: [{ url: 'https://example.com/the_weeknd.jpg', width: 500, height: 500 }],
  topSongs: [
    {
      videoId: 'art_song_1',
      title: 'Blinding Lights',
      artists: [{ name: 'The Weeknd', id: 'art_the_weeknd' }],
      album: 'After Hours',
      albumId: 'alb_afterhours',
      duration: '3:20',
      duration_seconds: 200,
      thumbnail: 'https://example.com/blinding.jpg',
    },
    {
      videoId: 'art_song_2',
      title: 'Starboy Track',
      artists: [{ name: 'The Weeknd', id: 'art_the_weeknd' }],
      album: 'Starboy',
      albumId: 'alb_starboy',
      duration: '3:50',
      duration_seconds: 230,
      thumbnail: 'https://example.com/starboy.jpg',
    },
  ],
  albums: [
    {
      browseId: 'alb_afterhours',
      title: 'After Hours',
      year: '2020',
      trackCount: 14,
      thumbnail: 'https://example.com/afterhours_thumb.jpg',
    },
    {
      browseId: 'alb_starboy',
      title: 'Starboy',
      year: '2016',
      trackCount: 18,
      thumbnail: 'https://example.com/starboy_thumb.jpg',
    },
  ],
  singles: [
    {
      browseId: 'single_heartless',
      title: 'Heartless',
      year: '2019',
      thumbnail: 'https://example.com/heartless.jpg',
    },
  ],
  videos: [
    {
      videoId: 'vid_blinding_lights',
      title: 'The Weeknd - Blinding Lights (Official Music Video)',
      artists: [{ name: 'The Weeknd', id: 'art_the_weeknd' }],
      duration: '4:22',
      thumbnail: 'https://example.com/blinding_vid.jpg',
    },
  ],
  featuredRelease: {
    browseId: 'alb_afterhours',
    title: 'After Hours',
    year: '2020',
    trackCount: 14,
    type: 'Album',
    thumbnail: 'https://example.com/afterhours_thumb.jpg',
  },
  relatedArtists: [
    {
      id: 'art_daft_punk',
      name: 'Daft Punk',
      thumbnail: 'https://example.com/daft_punk.jpg',
    },
    {
      id: 'art_drake',
      name: 'Drake',
      thumbnail: 'https://example.com/drake.jpg',
    },
  ],
};

describe('AAPESH Artist Pages 2.0 (Cinematic Spatial Artist Experience)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLibraryStore.setState({
      followedArtists: [],
    });
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
    });
  });

  it('loads and renders artist hero, name, real subscribers, and top tracks', async () => {
    vi.spyOn(api, 'getArtist').mockResolvedValue(mockArtistData);

    render(
      <MemoryRouter initialEntries={['/artist/art_the_weeknd']}>
        <Routes>
          <Route path="/artist/:id" element={<ArtistPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'The Weeknd' })).toBeInTheDocument();
    });

    expect(screen.getAllByText('34.2M subscribers')[0]).toBeInTheDocument();
    expect(screen.getByText(/2 top tracks/i)).toBeInTheDocument();
    expect(screen.getByText('Blinding Lights')).toBeInTheDocument();
    expect(screen.getByText('Starboy Track')).toBeInTheDocument();
  });

  it('triggers Play All action for the artist top tracks', async () => {
    vi.spyOn(api, 'getArtist').mockResolvedValue(mockArtistData);
    const playTrackSpy = vi.spyOn(usePlayerStore.getState(), 'playTrack');

    render(
      <MemoryRouter initialEntries={['/artist/art_the_weeknd']}>
        <Routes>
          <Route path="/artist/:id" element={<ArtistPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'The Weeknd' })).toBeInTheDocument();
    });

    const playAllBtn = screen.getByRole('button', { name: /play all/i });
    fireEvent.click(playAllBtn);

    expect(playTrackSpy).toHaveBeenCalledWith(
      mockArtistData.topSongs[0],
      mockArtistData.topSongs
    );
  });

  it('toggles Follow / Following state and persists to library store', async () => {
    vi.spyOn(api, 'getArtist').mockResolvedValue(mockArtistData);

    render(
      <MemoryRouter initialEntries={['/artist/art_the_weeknd']}>
        <Routes>
          <Route path="/artist/:id" element={<ArtistPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'The Weeknd' })).toBeInTheDocument();
    });

    const followBtn = screen.getByRole('button', { name: /follow/i });
    expect(followBtn).toHaveTextContent('Follow');

    // Click to follow
    fireEvent.click(followBtn);

    await waitFor(() => {
      expect(screen.getByText('Following')).toBeInTheDocument();
    });
    expect(useLibraryStore.getState().followedArtists.length).toBe(1);

    // Click to unfollow
    fireEvent.click(screen.getByRole('button', { name: /unfollow/i }));
    await waitFor(() => {
      expect(screen.getByText('Follow')).toBeInTheDocument();
    });
    expect(useLibraryStore.getState().followedArtists.length).toBe(0);
  });

  it('renders Featured Release spotlight card when available', async () => {
    vi.spyOn(api, 'getArtist').mockResolvedValue(mockArtistData);

    render(
      <MemoryRouter initialEntries={['/artist/art_the_weeknd']}>
        <Routes>
          <Route path="/artist/:id" element={<ArtistPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /featured release/i })).toBeInTheDocument();
    });

    expect(screen.getByText('View Release')).toBeInTheDocument();
  });

  it('renders Albums and Singles & EPs shelves with correct release titles', async () => {
    vi.spyOn(api, 'getArtist').mockResolvedValue(mockArtistData);

    render(
      <MemoryRouter initialEntries={['/artist/art_the_weeknd']}>
        <Routes>
          <Route path="/artist/:id" element={<ArtistPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Albums' })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Singles & EPs' })).toBeInTheDocument();
    expect(screen.getByText('Heartless')).toBeInTheDocument();
  });

  it('renders Music Videos shelf and triggers playback on click', async () => {
    vi.spyOn(api, 'getArtist').mockResolvedValue(mockArtistData);
    const playTrackSpy = vi.spyOn(usePlayerStore.getState(), 'playTrack');

    render(
      <MemoryRouter initialEntries={['/artist/art_the_weeknd']}>
        <Routes>
          <Route path="/artist/:id" element={<ArtistPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Music Videos' })).toBeInTheDocument();
    });

    const videoTitle = screen.getByText(/the weeknd - blinding lights \(official music video\)/i);
    fireEvent.click(videoTitle);

    expect(playTrackSpy).toHaveBeenCalledWith(mockArtistData.videos![0]);
  });

  it('renders Related Artists circular rail with clickable navigation affordances', async () => {
    vi.spyOn(api, 'getArtist').mockResolvedValue(mockArtistData);

    render(
      <MemoryRouter initialEntries={['/artist/art_the_weeknd']}>
        <Routes>
          <Route path="/artist/:id" element={<ArtistPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Related Artists' })).toBeInTheDocument();
    });

    expect(screen.getByText('Daft Punk')).toBeInTheDocument();
    expect(screen.getByText('Drake')).toBeInTheDocument();
  });

  it('renders About the Artist section with provider description', async () => {
    vi.spyOn(api, 'getArtist').mockResolvedValue(mockArtistData);

    render(
      <MemoryRouter initialEntries={['/artist/art_the_weeknd']}>
        <Routes>
          <Route path="/artist/:id" element={<ArtistPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /about the artist/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/the weeknd is a canadian singer/i)).toBeInTheDocument();
  });

  it('gracefully omits missing sections when provider returns partial data (no fake content)', async () => {
    const minimalArtist: Artist = {
      channelId: 'art_indie',
      name: 'Indie Band',
      topSongs: [
        {
          videoId: 'song_indie_1',
          title: 'Indie Song 1',
          artists: [{ name: 'Indie Band' }],
        },
      ],
      albums: [],
      singles: [],
      videos: [],
      relatedArtists: [],
      description: '',
    };

    vi.spyOn(api, 'getArtist').mockResolvedValue(minimalArtist);

    render(
      <MemoryRouter initialEntries={['/artist/art_indie']}>
        <Routes>
          <Route path="/artist/:id" element={<ArtistPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Indie Band' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('heading', { name: 'Featured Release' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Albums' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Singles & EPs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Music Videos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Related Artists' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'About the Artist' })).not.toBeInTheDocument();
  });

  it('renders error state with Retry button on API failure', async () => {
    vi.spyOn(api, 'getArtist').mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/artist/art_the_weeknd']}>
        <Routes>
          <Route path="/artist/:id" element={<ArtistPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Artist Profile Unavailable')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
