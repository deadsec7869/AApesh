import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  History,
  Music2,
  Disc,
  User,
  ListMusic,
  AlertCircle,
  RotateCcw,
  Search,
} from 'lucide-react';
import { api } from '@/api/client';
import { SearchResults, Track } from '@/types/music';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { TrackRow } from '@/components/music/TrackRow';
import { AlbumCard } from '@/components/music/AlbumCard';
import { ArtistCard } from '@/components/music/ArtistCard';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { SearchBar } from '@/components/search/SearchBar';
import {
  SearchSuggestionsDropdown,
  SearchHistoryItem,
} from '@/components/search/SearchSuggestionsDropdown';
import { SearchFilters, SearchFilterType } from '@/components/search/SearchFilters';
import { TopResultCard } from '@/components/search/TopResultCard';
import { SearchSkeleton } from '@/components/search/SearchSkeleton';

export const SearchPage: React.FC = () => {
  const { query: urlQuery } = useParams<{ query?: string }>();
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();

  const [inputQuery, setInputQuery] = useState(urlQuery ? decodeURIComponent(urlQuery) : '');
  const [filter, setFilter] = useState<SearchFilterType>('all');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestedTracks, setSuggestedTracks] = useState<Track[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const suggestionsAbortRef = useRef<AbortController | null>(null);

  const searchRequestIdRef = useRef<number>(0);
  const suggestionsRequestIdRef = useRef<number>(0);

  // Global keyboard shortcuts (/ and Ctrl+K / Cmd+K to focus search)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsFocused(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsFocused(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Load search history from backend API
  const loadSearchHistory = useCallback(() => {
    fetch('/api/search/history')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setSearchHistory(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSearchHistory();
  }, [loadSearchHistory]);

  // Click outside search container to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live autocomplete suggestions and preview tracks with monotonic generation tracking
  useEffect(() => {
    const trimmed = inputQuery.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSuggestedTracks([]);
      setSelectedSuggestionIdx(-1);
      return;
    }

    const suggestionId = ++suggestionsRequestIdRef.current;
    if (suggestionsAbortRef.current) {
      suggestionsAbortRef.current.abort();
    }
    const controller = new AbortController();
    suggestionsAbortRef.current = controller;

    const timer = setTimeout(() => {
      Promise.all([
        api.getSuggestions(trimmed).catch(() => []),
        api.search(trimmed, 'songs', 3, controller.signal).catch(() => null),
      ]).then(([rawSuggestions, songResults]) => {
        // Guarantee that only the latest active suggestion request commits state
        if (suggestionId === suggestionsRequestIdRef.current && !controller.signal.aborted) {
          setSuggestions((rawSuggestions || []).slice(0, 5));
          setSuggestedTracks(songResults?.songs || []);
          setSelectedSuggestionIdx(-1);
        }
      });
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [inputQuery]);

  // Execute primary search with strict monotonic request generation ID protection
  const performSearch = useCallback(
    async (term: string, currentFilter?: SearchFilterType) => {
      const trimmed = term.trim();
      if (!trimmed) {
        setSearchResults(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const requestId = ++searchRequestIdRef.current;

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
          24,
          controller.signal
        );
        // Guarantee that only the latest active search request commits results
        if (requestId === searchRequestIdRef.current && !controller.signal.aborted) {
          setSearchResults(results);
          loadSearchHistory();
        }
      } catch (e: any) {
        if (requestId !== searchRequestIdRef.current) return;
        if (e.name === 'AbortError') return;
        console.error('Search error:', e);
        setError(e.message || 'Search unavailable. We could not reach the music service.');
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [loadSearchHistory]
  );

  // Sync with URL query or filter changes
  useEffect(() => {
    if (urlQuery) {
      const decoded = decodeURIComponent(urlQuery);
      setInputQuery(decoded);
      performSearch(decoded, filter);
    } else {
      setSearchResults(null);
      setError(null);
    }
  }, [urlQuery, filter, performSearch]);

  // Debounced search when user types without pressing Enter
  useEffect(() => {
    const currentDecoded = urlQuery ? decodeURIComponent(urlQuery) : '';
    if (inputQuery === currentDecoded) return;

    const timer = setTimeout(() => {
      if (inputQuery.trim()) {
        performSearch(inputQuery, filter);
      } else {
        setSearchResults(null);
        setError(null);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [inputQuery, urlQuery, filter, performSearch]);

  // Keyboard navigation within suggestions / search bar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = !inputQuery.trim()
      ? searchHistory.length
      : suggestions.length + suggestedTracks.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalItems > 0) {
        setSelectedSuggestionIdx((prev) => (prev + 1) % totalItems);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalItems > 0) {
        setSelectedSuggestionIdx((prev) => (prev - 1 + totalItems) % totalItems);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsFocused(false);

      if (!inputQuery.trim() && selectedSuggestionIdx >= 0 && selectedSuggestionIdx < searchHistory.length) {
        const item = searchHistory[selectedSuggestionIdx];
        if (item) {
          setInputQuery(item.query);
          navigate(`/search/${encodeURIComponent(item.query)}`);
        }
      } else if (inputQuery.trim() && selectedSuggestionIdx >= 0) {
        if (selectedSuggestionIdx < suggestions.length) {
          const selectedText = suggestions[selectedSuggestionIdx];
          setInputQuery(selectedText);
          navigate(`/search/${encodeURIComponent(selectedText)}`);
        } else {
          const trackIdx = selectedSuggestionIdx - suggestions.length;
          const track = suggestedTracks[trackIdx];
          if (track) {
            playTrack(track, suggestedTracks);
          }
        }
      } else if (inputQuery.trim()) {
        navigate(`/search/${encodeURIComponent(inputQuery.trim())}`);
      }
    } else if (e.key === 'Escape') {
      if (isFocused) {
        setIsFocused(false);
      } else if (inputQuery) {
        setInputQuery('');
        setSearchResults(null);
        navigate('/search');
      }
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch('/api/search/history', { method: 'DELETE' });
      setSearchHistory([]);
    } catch {}
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/search/history/${id}`, { method: 'DELETE' });
      setSearchHistory((prev) => prev.filter((item) => item.id !== id));
    } catch {}
  };

  const handleSelectQuery = (queryText: string) => {
    setInputQuery(queryText);
    setIsFocused(false);
    navigate(`/search/${encodeURIComponent(queryText)}`);
  };

  const handlePlaySuggestedTrack = (track: Track) => {
    playTrack(track, suggestedTracks);
    setIsFocused(false);
  };

  const handleClearInput = () => {
    setInputQuery('');
    setSearchResults(null);
    setError(null);
    inputRef.current?.focus();
    navigate('/search');
  };

  // Determine top result
  const topResultData = searchResults?.topResult?.data || (searchResults?.songs && searchResults.songs.length > 0 ? searchResults.songs[0] : null);
  const topResultType: 'song' | 'artist' | 'album' | 'playlist' = (searchResults?.topResult?.type as any) || (topResultData ? 'song' : 'song');

  const hasAnyResults =
    searchResults &&
    (searchResults.songs.length > 0 ||
      searchResults.albums.length > 0 ||
      searchResults.artists.length > 0 ||
      searchResults.playlists.length > 0);

  return (
    <div className="p-4 sm:p-6 md:p-10 pb-36 flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto w-full select-none animate-in fade-in duration-300 font-sans">
      {/* ====================================================================
          SEARCH BAR 2.0: Floating Command Center & Suggestions
          ==================================================================== */}
      <div ref={searchContainerRef} className="relative flex flex-col gap-4 w-full max-w-3xl">
        <SearchBar
          ref={inputRef}
          value={inputQuery}
          onChange={(val) => {
            setInputQuery(val);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          onClear={handleClearInput}
          isLoading={isLoading}
        />

        {/* Live Suggestions & Search History Dropdown */}
        {isFocused && (
          <SearchSuggestionsDropdown
            query={inputQuery}
            history={searchHistory}
            suggestions={suggestions}
            suggestedTracks={suggestedTracks}
            selectedIndex={selectedSuggestionIdx}
            onSelectQuery={handleSelectQuery}
            onPlayTrack={handlePlaySuggestedTrack}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
          />
        )}

        {/* Category / Filter Chips */}
        <SearchFilters
          activeFilter={filter}
          onFilterChange={setFilter}
          results={searchResults}
        />
      </div>

      {/* ====================================================================
          ERROR STATE & RETRY
          ==================================================================== */}
      {error && !isLoading && (
        <div className="p-4 rounded-2xl bg-[#14161f]/90 border border-white/10 text-neutral-200 flex items-center justify-between max-w-3xl backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-neutral-400 shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-semibold text-white">Search unavailable</div>
              <div className="text-xs text-neutral-400">{error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => performSearch(inputQuery, filter)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ====================================================================
          LOADING SKELETONS
          ==================================================================== */}
      {isLoading && <SearchSkeleton />}

      {/* ====================================================================
          SEARCH RESULTS WORKSPACE
          ==================================================================== */}
      {!isLoading && searchResults && (
        <div className="flex flex-col gap-10 w-full max-w-6xl">
          {/* Top Result Card (Rendered in All mode when result exists) */}
          {filter === 'all' && topResultData && (
            <TopResultCard
              type={topResultType}
              data={topResultData}
              contextSongs={searchResults.songs}
            />
          )}

          {/* Songs Section */}
          {(filter === 'all' || filter === 'songs') && searchResults.songs.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-white" />
                  <h2 className="text-lg font-bold text-white tracking-tight">Songs</h2>
                </div>
                <span className="text-xs font-mono text-neutral-500 tabular-nums">
                  {searchResults.songs.length} tracks
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-2xl bg-white/[0.02] border border-white/[0.05] p-1.5">
                {searchResults.songs.map((track, idx) => (
                  <TrackRow
                    key={track.videoId || idx}
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
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-1">
                <User className="w-4 h-4 text-white" />
                <h2 className="text-lg font-bold text-white tracking-tight">Artists</h2>
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
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-1">
                <Disc className="w-4 h-4 text-white" />
                <h2 className="text-lg font-bold text-white tracking-tight">Albums</h2>
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
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-1">
                <ListMusic className="w-4 h-4 text-white" />
                <h2 className="text-lg font-bold text-white tracking-tight">Playlists</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchResults.playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </section>
          )}

          {/* Minimal Empty State */}
          {!hasAnyResults && (
            <div className="py-20 text-center text-neutral-400 flex flex-col items-center gap-3">
              <Search className="w-10 h-10 text-neutral-600 mb-1" />
              <h3 className="text-lg font-semibold text-neutral-200">
                No results for "{inputQuery}"
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm">
                Try searching for another artist, song, album, or playlist.
              </p>
              <button
                type="button"
                onClick={handleClearInput}
                className="mt-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      )}

      {/* Initial Landing State: Search History & Shortcuts */}
      {!isLoading && !searchResults && (
        <div className="flex flex-col gap-8 max-w-2xl">
          {searchHistory.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-300 text-xs font-semibold uppercase tracking-wider">
                  <History className="w-4 h-4 text-neutral-400" />
                  <span>Recent Searches</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-xs text-neutral-500 hover:text-white transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectQuery(item.query)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-neutral-300 hover:text-white border border-white/[0.08] text-xs transition-colors"
                  >
                    <span>{item.query}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="py-6 text-neutral-500 text-xs flex flex-col gap-1.5">
            <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">
              Search Shortcuts
            </span>
            <span>
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neutral-300 text-[10px] font-mono">/</kbd> anytime to jump to search. Use <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neutral-300 text-[10px] font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neutral-300 text-[10px] font-mono">↓</kbd> to navigate live suggestions and <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neutral-300 text-[10px] font-mono">Enter</kbd> to select.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
