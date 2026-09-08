import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  RotateCw,
  Zap,
  Play,
  User,
  SlidersHorizontal,
  Headphones,
  Moon,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useEqualizerStore } from '@/stores/useEqualizerStore';
import { api } from '@/api/client';
import { Track } from '@/types/music';

interface TopBarProps {
  onOpenCommandPalette: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenCommandPalette }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { playTrack, sleepTimer } = usePlayerStore();
  const { toggleOpen: toggleEqualizer, spatialAudio, toggleSpatialAudio } = useEqualizerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [liveTracks, setLiveTracks] = useState<Track[]>([]);
  const [liveArtists, setLiveArtists] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync searchQuery with URL if on /search/:query
  useEffect(() => {
    if (location.pathname.startsWith('/search/')) {
      const q = decodeURIComponent(location.pathname.replace('/search/', ''));
      setSearchQuery(q);
    }
  }, [location.pathname]);

  // Debounced Live Search Suggestions & Real Tracks
  useEffect(() => {
    if (!searchQuery.trim()) {
      setLiveTracks([]);
      setLiveArtists([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timer = setTimeout(() => {
      Promise.all([
        api.search(searchQuery.trim(), 'songs', 5, controller.signal).catch(() => ({
          query: searchQuery,
          songs: [],
          albums: [],
          artists: [],
          playlists: [],
          videos: [],
        })),
        api.getSuggestions(searchQuery.trim()).catch(() => []),
      ])
        .then(([searchRes, rawSuggestions]) => {
          if (!controller.signal.aborted) {
            const tracks = (searchRes?.songs || []).slice(0, 5);
            setLiveTracks(tracks);

            // Extract matching artist names from search results or suggestions
            const artistSet = new Set<string>();
            (searchRes?.artists || []).forEach((a) => artistSet.add(a.name));
            tracks.forEach((t) => t.artists?.forEach((a) => artistSet.add(a.name)));
            rawSuggestions.forEach((s) => {
              if (s.toLowerCase().includes(searchQuery.toLowerCase()) && s.length < 30) {
                artistSet.add(s);
              }
            });
            setLiveArtists(Array.from(artistSet).slice(0, 3));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/search/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handlePlayLiveTrack = (track: Track) => {
    playTrack(track, liveTracks);
    setShowSuggestions(false);
  };

  const handleSelectArtist = (artistName: string) => {
    setShowSuggestions(false);
    navigate(`/search/${encodeURIComponent(artistName)}`);
  };

  return (
    <header className="h-16 px-4 md:px-8 flex items-center justify-between gap-3 z-30 shrink-0 select-none">
      {/* ====================================================================
          LEFT: Navigation Back/Forward Buttons
          ==================================================================== */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.09] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate(1)}
          aria-label="Forward"
          className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.09] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ====================================================================
          CENTER: Floating Top Search Pill & LIVE SUGGESTIONS Dropdown (Screenshot 4)
          ==================================================================== */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-xl mx-2">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search songs, artists, albums, or lyrics..."
            className="w-full pl-10 pr-12 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/[0.09] text-white placeholder-neutral-400 text-xs sm:text-sm focus:outline-none focus:border-white/25 transition-all shadow-inner"
          />
          <span className="absolute right-3 hidden sm:flex items-center text-[10px] font-mono text-neutral-400 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
            ⌘K
          </span>
        </form>

        {/* Floating Live Suggestions Dropdown (Screenshot 4 Visual Match) */}
        {showSuggestions && searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2.5 rounded-[24px] bg-[#12151c]/95 backdrop-blur-2xl border border-white/[0.12] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.85)] z-50 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header: Live Suggestions & Enter Hint */}
            <div className="flex items-center justify-between text-[11px] pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-neutral-300">
                <Zap className="w-3.5 h-3.5 text-neutral-200 fill-current" />
                <span>LIVE SUGGESTIONS</span>
              </div>
              <span className="text-neutral-500 text-[10px] font-mono">
                Press Enter to search all
              </span>
            </div>

            {/* TRACKS Section */}
            {liveTracks.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                  TRACKS
                </div>
                <div className="flex flex-col gap-1">
                  {liveTracks.map((track) => (
                    <div
                      key={track.videoId}
                      className="group flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white/[0.08] transition-colors cursor-pointer"
                      onClick={() => handlePlayLiveTrack(track)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={track.thumbnail || ''}
                          alt={track.title}
                          className="w-9 h-9 rounded-lg object-cover bg-charcoal-800 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white group-hover:text-white truncate">
                            {track.title}
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {track.artists?.map((a) => a.name).join(', ')}
                          </div>
                        </div>
                      </div>

                      {/* Play Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayLiveTrack(track);
                        }}
                        aria-label="Play track"
                        className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-all shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ARTISTS Section */}
            {liveArtists.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                  ARTISTS
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {liveArtists.map((artist, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectArtist(artist)}
                      className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                      <span>{artist}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isSearching && liveTracks.length === 0 && (
              <div className="py-6 text-center text-xs text-neutral-400">
                Searching tracks & artists...
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====================================================================
          RIGHT: Refresh, Equalizer, Sleep Timer & AAPESH Listener Status Pill
          ==================================================================== */}
      <div className="flex items-center gap-2">
        {/* Refresh Button */}
        <button
          onClick={() => window.location.reload()}
          aria-label="Refresh Workspace"
          title="Refresh"
          className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.09] text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-white/[0.06]"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Equalizer Quick Trigger */}
        <button
          onClick={toggleEqualizer}
          aria-label="Open Equalizer"
          title="10-Band Graphic Pro Equalizer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-xs text-neutral-300 hover:text-white transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-300" />
          <span className="font-semibold">EQ</span>
        </button>

        {/* Spatial Audio Quick Toggle */}
        <button
          onClick={toggleSpatialAudio}
          aria-label="Toggle Spatial Audio"
          title="Spatial Sound DSP"
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
            spatialAudio
              ? 'bg-white/20 text-white border border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.25)] font-bold'
              : 'bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-neutral-400 hover:text-white'
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>Spatial</span>
        </button>

        {/* Active Sleep Timer Indicator */}
        {sleepTimer && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-mono font-medium"
            title="Sleep timer active"
          >
            <Moon className="w-3 h-3 text-neutral-300 animate-pulse" />
            <span>{Math.ceil(sleepTimer.remainingSeconds / 60)}m</span>
          </div>
        )}

        {/* AAPESH Listener Status Pill (Screenshot 3 Visual Target) */}
        <div
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.09] text-xs cursor-pointer transition-colors shadow-sm"
          title="AAPESH Listener • Unlimited Spatial Streaming"
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="text-white font-medium tracking-tight">AAPESH Listener</span>
        </div>
      </div>
    </header>
  );
};
