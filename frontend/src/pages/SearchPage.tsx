import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  History,
  Trash2,
  Music2,
  Disc,
  User,
  ListMusic,
  X,
  Loader2,
  Play,
  Pause,
  Zap,
  ArrowRight,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/api/client';
import { SearchResults, Track } from '@/types/music';
import { TrackRow } from '@/components/music/TrackRow';
import { AlbumCard } from '@/components/music/AlbumCard';
import { ArtistCard } from '@/components/music/ArtistCard';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { SkeletonList, SkeletonCard } from '@/components/common/Skeletons';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface HistoryItem {
  id: string;
  query: string;
  searched_at?: string;
}

export const SearchPage: React.FC = () => {
  const { query: urlQuery } = useParams<{ query?: string }>();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  const [inputQuery, setInputQuery] = useState(urlQuery ? decodeURIComponent(urlQuery) : '');
  const [filter, setFilter] = useState<'all' | 'songs' | 'albums' | 'artists' | 'playlists'>('all');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);
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

  // Load search history from backend API
  const loadSearchHistory = useCallback(() => {
    fetch('/api/search/history')
      .then((res) => (res.ok ? res.json() : []))
      .then(setSearchHistory)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSearchHistory();
  }, [loadSearchHistory]);

  // Handle outside clicks to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live suggestions as the user types
  useEffect(() => {
    const trimmed = inputQuery.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSuggestedTracks([]);
      setSelectedSuggestionIdx(-1);
      return;
    }

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
        if (!controller.signal.aborted) {
          setSuggestions(rawSuggestions.slice(0, 5));
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

  // Execute primary search
  const performSearch = useCallback(
    async (term: string, currentFilter?: string) => {
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
          24,
          controller.signal
        );
        setSearchResults(results);
        loadSearchHistory();
      } catch (e: any) {
        if (e.name === 'AbortError') {
          return;
        }
        console.error('Search error:', e);
        setError(e.message || 'Failed to fetch search results. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    },
    [loadSearchHistory]
  );

  // Sync with URL query or filter change
  useEffect(() => {
    if (urlQuery) {
      const decoded = decodeURIComponent(urlQuery);
      setInputQuery(decoded);
      performSearch(decoded, filter);
    } else {
      setSearchResults(null);
    }
  }, [urlQuery, filter, performSearch]);

  // Debounced search when inputQuery changes without Enter
  useEffect(() => {
    const currentDecoded = urlQuery ? decodeURIComponent(urlQuery) : '';
    if (inputQuery === currentDecoded) return;

    const timer = setTimeout(() => {
      if (inputQuery.trim()) {
        performSearch(inputQuery, filter);
      } else {
        setSearchResults(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [inputQuery, urlQuery, filter, performSearch]);

  // Keyboard navigation & Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allItemsCount = suggestions.length + suggestedTracks.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (allItemsCount > 0) {
        setSelectedSuggestionIdx((prev) => (prev + 1) % allItemsCount);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (allItemsCount > 0) {
        setSelectedSuggestionIdx((prev) => (prev - 1 + allItemsCount) % allItemsCount);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsFocused(false);

      if (selectedSuggestionIdx >= 0) {
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

  const handleSelectHistoryItem = (queryText: string) => {
    setInputQuery(queryText);
    setIsFocused(false);
    navigate(`/search/${encodeURIComponent(queryText)}`);
  };

  const handleSelectSuggestion = (queryText: string) => {
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
    inputRef.current?.focus();
    navigate('/search');
  };

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'songs', label: 'Songs' },
    { id: 'albums', label: 'Albums' },
    { id: 'artists', label: 'Artists' },
    { id: 'playlists', label: 'Playlists' },
  ];

  // Top result track (first song)
  const topTrack: Track | null =
    searchResults?.songs && searchResults.songs.length > 0 ? searchResults.songs[0] : null;
  const isCurrentTopPlaying =
    topTrack !== null && currentTrack?.videoId === topTrack.videoId && isPlaying;

  return (
    <div className="p-4 sm:p-6 md:p-10 flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto w-full select-none animate-in fade-in duration-300 font-sans">
      {/* ====================================================================
          SEARCH BAR 2.0: Floating Command Surface & Live Suggestions
          ==================================================================== */}
      <div ref={searchContainerRef} className="relative flex flex-col gap-4 w-full max-w-3xl">
        <div className="relative flex items-center group">
          <Search className="absolute left-4 w-5 h-5 text-neutral-400 group-focus-within:text-white transition-colors pointer-events-none" />
          
          <input
            ref={inputRef}
            type="text"
            value={inputQuery}
            onChange={(e) => {
              setInputQuery(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search songs, artists, albums, playlists..."
            aria-label="Search Catalog"
            className="w-full pl-12 pr-24 py-3.5 rounded-2xl bg-[#10121a]/80 hover:bg-[#151824]/90 focus:bg-[#161a28] backdrop-blur-2xl border border-white/[0.10] focus:border-white/25 text-white placeholder-neutral-500 text-sm sm:text-base focus:outline-none shadow-[0_12px_32px_rgba(0,0,0,0.6)] focus:shadow-[0_16px_40px_rgba(0,0,0,0.8)] transition-all"
          />

          <div className="absolute right-3.5 flex items-center gap-2">
            {isLoading && (
              <Loader2 className="w-4 h-4 text-neutral-400 animate-spin shrink-0" />
            )}
            {inputQuery && (
              <button
                onClick={handleClearInput}
                aria-label="Clear Search Input"
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="hidden sm:flex items-center text-[10px] font-mono text-neutral-400 bg-white/[0.08] px-2 py-0.5 rounded-md border border-white/[0.08]">
              /
            </span>
          </div>
        </div>

        {/* ====================================================================
            LIVE SUGGESTIONS & SEARCH HISTORY DROPDOWN
            ==================================================================== */}
        {isFocused && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-[24px] bg-[#12151d]/95 backdrop-blur-3xl border border-white/[0.12] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.9)] z-50 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Case A: Query is Empty -> Show Search History */}
            {!inputQuery.trim() && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs px-1 border-b border-white/[0.06] pb-2">
                  <div className="flex items-center gap-2 font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                    <History className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Recent Searches</span>
                  </div>
                  {searchHistory.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-[11px] text-neutral-400 hover:text-white transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {searchHistory.length === 0 ? (
                  <div className="py-6 text-center text-xs text-neutral-500">
                    No recent searches. Search through millions of tracks on AAPESH.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                    {searchHistory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectHistoryItem(item.query)}
                        className="group flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.08] text-neutral-300 hover:text-white cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <History className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 shrink-0" />
                          <span className="text-xs font-medium truncate">{item.query}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                          aria-label={`Remove ${item.query} from history`}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-white transition-all text-neutral-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Case B: Query is Active -> Live Autocomplete & Suggested Tracks */}
            {inputQuery.trim() && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-neutral-300">
                    <Zap className="w-3.5 h-3.5 text-neutral-200 fill-current" />
                    <span>Suggestions</span>
                  </div>
                  <span className="text-neutral-500 text-[10px] font-mono">
                    Press Enter to search
                  </span>
                </div>

                {/* Autocomplete Text Suggestions */}
                {suggestions.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {suggestions.map((text, idx) => {
                      const isSelected = idx === selectedSuggestionIdx;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectSuggestion(text)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-white/[0.12] text-white'
                              : 'hover:bg-white/[0.06] text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Search className="w-3.5 h-3.5 text-neutral-400" />
                            <span className="text-xs font-medium truncate">{text}</span>
                          </div>
                          <ArrowRight className="w-3 h-3 text-neutral-500" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Instant Track Previews */}
                {suggestedTracks.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                      Top Tracks
                    </div>
                    <div className="flex flex-col gap-1">
                      {suggestedTracks.map((track, trackIdx) => {
                        const isSelected = suggestions.length + trackIdx === selectedSuggestionIdx;
                        return (
                          <div
                            key={track.videoId}
                            onClick={() => handlePlaySuggestedTrack(track)}
                            className={`flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-white/[0.12] text-white'
                                : 'hover:bg-white/[0.06] text-neutral-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-charcoal-800">
                                <ArtworkImage
                                  src={track.thumbnail}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                  fallbackIconClassName="w-3.5 h-3.5 text-neutral-500"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-white truncate">
                                  {track.title}
                                </div>
                                <div className="text-[11px] text-neutral-400 truncate">
                                  {track.artists?.map((a) => a.name).join(', ')}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlaySuggestedTrack(track);
                              }}
                              aria-label="Play track"
                              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all shrink-0"
                            >
                              <Play className="w-3 h-3 fill-current translate-x-0.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            CATEGORY / FILTER CHIPS
            ==================================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === tab.id
                  ? 'bg-white text-black shadow-md font-bold'
                  : 'bg-white/[0.05] hover:bg-white/[0.10] text-neutral-400 hover:text-white border border-white/[0.08]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ====================================================================
          ERROR STATE & RETRY
          ==================================================================== */}
      {error && !isLoading && (
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-neutral-200 flex items-center justify-between max-w-3xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-neutral-400 shrink-0" />
            <div className="text-xs sm:text-sm font-medium">{error}</div>
          </div>
          <button
            onClick={() => performSearch(inputQuery, filter)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ====================================================================
          LOADING SKELETONS
          ==================================================================== */}
      {isLoading && (
        <div className="flex flex-col gap-8 w-full max-w-6xl">
          <div className="flex flex-col gap-4">
            <div className="h-6 w-32 bg-white/10 rounded shimmer" />
            <SkeletonList count={6} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          SEARCH RESULTS WORKSPACE
          ==================================================================== */}
      {!isLoading && searchResults && (
        <div className="flex flex-col gap-10 w-full max-w-6xl">
          {/* Top Result Card (When in All mode and prominent track exists) */}
          {filter === 'all' && topTrack && (
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
                Top Result
              </span>
              <div className="flex items-center justify-between gap-5 p-4 rounded-2xl bg-[#12151d]/75 backdrop-blur-2xl border border-white/[0.08] hover:border-white/15 transition-all group max-w-xl">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-charcoal-800 shadow-md">
                    <ArtworkImage
                      src={topTrack.thumbnail}
                      alt={topTrack.title}
                      className="w-full h-full object-cover"
                      fallbackIconClassName="w-8 h-8 text-neutral-500"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-neutral-300 uppercase tracking-wider mb-1">
                      Song
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                      {topTrack.title}
                    </h2>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {topTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (isCurrentTopPlaying) {
                      togglePlay();
                    } else {
                      playTrack(topTrack, searchResults.songs);
                    }
                  }}
                  aria-label={isCurrentTopPlaying ? 'Pause' : 'Play Top Result'}
                  className="btn-play-aapesh w-12 h-12 rounded-full flex items-center justify-center text-black shadow-xl hover:scale-105 active:scale-95 transition-transform shrink-0"
                >
                  {isCurrentTopPlaying ? (
                    <Pause className="w-5 h-5 fill-current text-black" />
                  ) : (
                    <Play className="w-5 h-5 fill-current translate-x-0.5 text-black" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Songs Section */}
          {(filter === 'all' || filter === 'songs') && searchResults.songs.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-white" />
                  <h2 className="text-lg font-bold text-white tracking-tight">Songs</h2>
                </div>
                <span className="text-xs font-mono text-neutral-500">
                  {searchResults.songs.length} tracks
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-2xl bg-white/[0.02] border border-white/[0.05] p-1.5">
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

          {/* Empty State */}
          {searchResults.songs.length === 0 &&
            searchResults.albums.length === 0 &&
            searchResults.artists.length === 0 &&
            searchResults.playlists.length === 0 && (
              <div className="py-20 text-center text-neutral-400 flex flex-col items-center gap-3">
                <Search className="w-10 h-10 text-neutral-600 mb-1" />
                <h3 className="text-lg font-semibold text-neutral-200">
                  No results for "{inputQuery}"
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm">
                  Try searching for another artist, song, album, or playlist.
                </p>
                <button
                  onClick={handleClearInput}
                  className="mt-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}
        </div>
      )}

      {/* Initial Landing State: Search History & Workstation Tips */}
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
                    onClick={() => handleSelectHistoryItem(item.query)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-neutral-300 hover:text-white border border-white/[0.08] text-xs transition-colors"
                  >
                    <span>{item.query}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="py-8 text-neutral-500 text-xs flex flex-col gap-1">
            <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">
              Search Shortcuts
            </span>
            <span>Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neutral-300 text-[10px] font-mono">/</kbd> anytime to jump to search. Use <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neutral-300 text-[10px] font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neutral-300 text-[10px] font-mono">↓</kbd> to navigate live suggestions.</span>
          </div>
        </div>
      )}
    </div>
  );
};
