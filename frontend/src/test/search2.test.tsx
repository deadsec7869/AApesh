import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/api/client';
import { SearchResults } from '@/types/music';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchFilters } from '@/components/search/SearchFilters';
import { TopResultCard } from '@/components/search/TopResultCard';
import { SearchSuggestionsDropdown } from '@/components/search/SearchSuggestionsDropdown';
import { SearchSkeleton } from '@/components/search/SearchSkeleton';

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

describe('AAPESH Search 2.0 — Music Discovery Engine & Components', () => {
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

  it('renders SearchBar with placeholder, clear button, and shortcut badge', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();

    const { rerender } = render(
      <SearchBar
        value=""
        onChange={onChange}
        onClear={onClear}
        placeholder="Search songs, artists, albums, playlists..."
      />
    );

    const input = screen.getByRole('textbox', { name: /search music catalog/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search songs, artists, albums, playlists...');

    // Re-render with value to show clear button
    rerender(
      <SearchBar
        value="Daft Punk"
        onChange={onChange}
        onClear={onClear}
        placeholder="Search songs, artists, albums, playlists..."
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear search input/i });
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);
    expect(onClear).toHaveBeenCalled();
  });

  it('renders SearchFilters with category tabs and counts', () => {
    const onFilterChange = vi.fn();

    render(
      <SearchFilters
        activeFilter="all"
        onFilterChange={onFilterChange}
        results={mockResults}
      />
    );

    const allTab = screen.getByRole('tab', { name: /All/i });
    const songsTab = screen.getByRole('tab', { name: /Songs/i });

    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(songsTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(songsTab);
    expect(onFilterChange).toHaveBeenCalledWith('songs');
  });

  it('renders TopResultCard with track details and play affordance', () => {
    render(
      <BrowserRouter>
        <TopResultCard
          type="song"
          data={mockResults.songs[0]}
          contextSongs={mockResults.songs}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Top Result')).toBeInTheDocument();
    expect(screen.getByText('Get Lucky')).toBeInTheDocument();
    expect(screen.getByText(/Daft Punk/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play Get Lucky/i })).toBeInTheDocument();
  });

  it('renders SearchSuggestionsDropdown in empty state with history and clear all', () => {
    const onSelectQuery = vi.fn();
    const onPlayTrack = vi.fn();
    const onDeleteHistoryItem = vi.fn();
    const onClearHistory = vi.fn();

    render(
      <SearchSuggestionsDropdown
        query=""
        history={[
          { id: 'h1', query: 'Hum' },
          { id: 'h2', query: 'Murtaza Qizilbash' },
        ]}
        suggestions={[]}
        suggestedTracks={[]}
        selectedIndex={-1}
        onSelectQuery={onSelectQuery}
        onPlayTrack={onPlayTrack}
        onDeleteHistoryItem={onDeleteHistoryItem}
        onClearHistory={onClearHistory}
      />
    );

    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
    expect(screen.getByText('Hum')).toBeInTheDocument();
    expect(screen.getByText('Murtaza Qizilbash')).toBeInTheDocument();

    const clearAllBtn = screen.getByRole('button', { name: /Clear all/i });
    fireEvent.click(clearAllBtn);
    expect(onClearHistory).toHaveBeenCalled();
  });

  it('renders SearchSkeleton properly without breaking', () => {
    render(<SearchSkeleton />);
    expect(screen.getByLabelText('Loading search results')).toBeInTheDocument();
  });
});
