import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, History, Trash2, Music2, Disc, User, ListMusic } from 'lucide-react';
import { api } from '@/api/client';
import { SearchResults } from '@/types/music';
import { TrackRow } from '@/components/music/TrackRow';
import { AlbumCard } from '@/components/music/AlbumCard';
import { ArtistCard } from '@/components/music/ArtistCard';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { SkeletonList, SkeletonCard } from '@/components/common/Skeletons';

export const SearchPage: React.FC = () => {
  const { query: urlQuery } = useParams<{ query?: string }>();
  const navigate = useNavigate();

  const [inputQuery, setInputQuery] = useState(urlQuery || '');
  const [filter, setFilter] = useState<'all' | 'songs' | 'albums' | 'artists' | 'playlists'>('all');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Load search history
  const loadSearchHistory = () => {
    fetch('/api/search/history')
      .then((res) => (res.ok ? res.json() : []))
      .then(setSearchHistory)
      .catch(() => {});
  };

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const performSearch = async (term: string, currentFilter?: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setSearchResults(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const results = await api.search(
        trimmed,
        currentFilter === 'all' ? undefined : currentFilter,
        20,
        controller.signal
      );
      setSearchResults(results);
      loadSearchHistory();
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return; // ignore aborted request
      }
      console.error('Search error:', e);
      setError(e.message || 'Failed to fetch search results. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // When urlQuery or filter changes, trigger search
  useEffect(() => {
    if (urlQuery) {
      setInputQuery(urlQuery);
      performSearch(urlQuery, filter);
    } else {
      setSearchResults(null);
    }
  }, [urlQuery, filter]);

  // Debounced as-you-type search when user types without pressing enter
  useEffect(() => {
    if (inputQuery === (urlQuery || '')) return;

    const timer = setTimeout(() => {
      if (inputQuery.trim()) {
        performSearch(inputQuery, filter);
      } else {
        setSearchResults(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [inputQuery, filter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuery.trim()) {
      navigate(`/search/${encodeURIComponent(inputQuery.trim())}`);
    }
  };

  const handleClearHistory = async () => {
    await fetch('/api/search/history', { method: 'DELETE' });
    setSearchHistory([]);
  };

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'songs', label: 'Songs' },
    { id: 'albums', label: 'Albums' },
    { id: 'artists', label: 'Artists' },
    { id: 'playlists', label: 'Playlists' },
  ];

  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Search Input Bar */}
      <div className="flex flex-col gap-4 max-w-2xl">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Search for songs, artists, albums, or playlists..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/10 text-white placeholder-neutral-500 text-sm md:text-base focus:outline-none focus:border-white/25 shadow-lg transition-all"
          />
        </form>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === tab.id
                  ? 'bg-white text-black shadow-play-btn'
                  : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center justify-between max-w-2xl">
          <div className="text-sm">{error}</div>
          <button
            onClick={() => performSearch(inputQuery, filter)}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-6">
          <div className="h-6 w-36 bg-white/10 rounded shimmer" />
          <SkeletonList count={6} />
        </div>
      )}

      {/* Results View */}
      {!isLoading && searchResults && (
        <div className="flex flex-col gap-10">
          {/* Songs Section */}
          {(filter === 'all' || filter === 'songs') && searchResults.songs.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-white" />
                <h2 className="text-xl font-bold text-white tracking-tight">Songs</h2>
              </div>
              <div className="flex flex-col gap-1">
                {searchResults.songs.map((track, idx) => (
                  <TrackRow
                    key={track.videoId}
                    track={track}
                    index={idx}
                    contextQueue={searchResults.songs}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Artists Section */}
          {(filter === 'all' || filter === 'artists') && searchResults.artists.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-white" />
                <h2 className="text-xl font-bold text-white tracking-tight">Artists</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchResults.artists.map((artist) => (
                  <ArtistCard key={artist.channelId} artist={artist} />
                ))}
              </div>
            </section>
          )}

          {/* Albums Section */}
          {(filter === 'all' || filter === 'albums') && searchResults.albums.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Disc className="w-5 h-5 text-white" />
                <h2 className="text-xl font-bold text-white tracking-tight">Albums</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchResults.albums.map((album) => (
                  <AlbumCard key={album.browseId} album={album} />
                ))}
              </div>
            </section>
          )}

          {/* Playlists Section */}
          {(filter === 'all' || filter === 'playlists') && searchResults.playlists.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-white" />
                <h2 className="text-xl font-bold text-white tracking-tight">Playlists</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchResults.playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {searchResults.songs.length === 0 &&
            searchResults.albums.length === 0 &&
            searchResults.artists.length === 0 &&
            searchResults.playlists.length === 0 && (
              <div className="py-20 text-center text-neutral-400">
                <Search className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-neutral-200">No results found</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Try searching for another song, artist, album, or keyword.
                </p>
              </div>
            )}
        </div>
      )}

      {/* Initial State: Search History */}
      {!isLoading && !searchResults && (
        <div className="flex flex-col gap-6 max-w-xl">
          {searchHistory.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-300 text-sm font-semibold">
                  <History className="w-4 h-4 text-neutral-400" />
                  <span>Recent Searches</span>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                >
                  Clear history
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setInputQuery(item.query);
                      navigate(`/search/${encodeURIComponent(item.query)}`);
                    }}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs transition-colors"
                  >
                    <span>{item.query}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="py-12 text-center text-neutral-500 text-xs">
            Type anything above to search through millions of tracks on YouTube Music.
          </div>
        </div>
      )}
    </div>
  );
};
