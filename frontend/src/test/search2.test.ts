import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '@/api/client';
import { SearchResults } from '@/types/music';

const mockResults: SearchResults = {
  query: 'Daft Punk',
  songs: [
    {
      videoId: 'track-1',
      title: 'Get Lucky',
      artists: [{ name: 'Daft Punk', id: 'artist-daft' }],
      duration: '4:08',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    },
    {
      videoId: 'track-2',
      title: 'One More Time',
      artists: [{ name: 'Daft Punk', id: 'artist-daft' }],
      duration: '5:20',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    },
  ],
  albums: [
    {
      browseId: 'album-discovery',
      title: 'Discovery',
      artists: [{ name: 'Daft Punk', id: 'artist-daft' }],
      year: '2001',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    },
  ],
  artists: [
    {
      channelId: 'artist-daft',
      name: 'Daft Punk',
      subscribers: '5.2M',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    },
  ],
  playlists: [
    {
      id: 'playlist-daft',
      title: 'Daft Punk Essentials',
      itemCount: 40,
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    },
  ],
  videos: [],
};

describe('AAPESH Search 2.0 — Music Discovery Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs correct search query parameters with filters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResults,
    } as Response);

    const results = await api.search('Daft Punk', 'songs', 24);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/search?q=Daft+Punk&limit=24&filter=songs'),
      expect.anything()
    );
    expect(results.songs.length).toBe(2);
    expect(results.songs[0].title).toBe('Get Lucky');
  });

  it('fetches autocomplete suggestions cleanly', async () => {
    const mockSuggestions = ['daft punk', 'daft punk get lucky', 'daft punk one more time'];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockSuggestions,
    } as Response);

    const suggestions = await api.getSuggestions('daft');
    expect(suggestions).toEqual(mockSuggestions);
  });

  it('handles empty results and preserves structured response format', async () => {
    const emptyResults: SearchResults = {
      query: 'nonexistent-song-xyz-99',
      songs: [],
      albums: [],
      artists: [],
      playlists: [],
      videos: [],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => emptyResults,
    } as Response);

    const results = await api.search('nonexistent-song-xyz-99');
    expect(results.songs.length).toBe(0);
    expect(results.albums.length).toBe(0);
    expect(results.artists.length).toBe(0);
    expect(results.playlists.length).toBe(0);
  });
});
