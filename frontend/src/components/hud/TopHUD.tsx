import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Zap,
  SlidersHorizontal,
  Headphones,
  Moon,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useEqualizerStore } from '@/stores/useEqualizerStore';
import { api } from '@/api/client';
import { Track } from '@/types/music';
import { OfflineStatusBadge } from '@/components/common/OfflineStatusBadge';
import { useUIStore } from '@/stores/useUIStore';

interface TopHUDProps {
  onOpenCommandPalette: () => void;
  onOpenEqualizerDrawer: () => void;
  onToggleZenMode: () => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  onOpenCommandPalette,
  onOpenEqualizerDrawer,
  onToggleZenMode,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { playTrack } = usePlayerStore();
  const { toggleOpen: toggleEqualizer, spatialAudio, toggleSpatialAudio } = useEqualizerStore();
  const { visualizerMode, setVisualizerMode, cycleVisualizerMode } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [liveTracks, setLiveTracks] = useState<Track[]>([]);
  const [liveArtists, setLiveArtists] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const capsuleRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: '50%', y: '50%' });

  const VISUALIZER_MODES: Array<{ id: string; label: string; icon: React.ReactNode }> = [
    { id: 'ferrofluid', label: 'Ferrofluid', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'cymatics', label: 'Cymatics', icon: <Zap className="w-4 h-4" /> },
    { id: 'starfield', label: 'Starfield', icon: <Headphones className="w-4 h-4" /> },
    { id: 'stealth', label: 'Stealth', icon: <Moon className="w-4 h-4" /> },
  ];

  const setMousePosition = (x: string, y: string) => {
    if (capsuleRef.current) {
      capsuleRef.current.style.setProperty('--mouse-x', x);
      capsuleRef.current.style.setProperty('--mouse-y', y);
    }
  };

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

  // Track mouse position for specular spotlight
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x: `${x}%`, y: `${y}%` });
    capsuleRef.current?.style.setProperty('--mouse-x', `${x}%`);
    capsuleRef.current?.style.setProperty('--mouse-y', `${y}%`);
  };

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
    <header className="w-full pt-3 pb-2 px-4 flex items-center justify-center z-30 shrink-0 select-none pointer-events-none">
      {/* ====================================================================
          FLOATING TOP SEARCH / COMMAND CAPSULE
          Outer wrapper has pointer-events-none; inner interactive elements get pointer-events-auto
          ==================================================================== */}
      <div
        ref={capsuleRef}
        onMouseMove={handleMouseMove}
        className="top-hud w-full max-w-4xl flex items-center gap-2 px-3 py-2 justify-between pointer-events-auto"
      >
        {/* Navigation Back/Forward Buttons */}
        <div className="hidden md:flex items-center gap-1 pl-1 pointer-events-auto">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="glass-pill w-8 h-8 flex items-center justify-center transition-all"
            style={{ minWidth: '36px' }}
          >
            <ChevronLeft className="w-4 h-4 text-tertiary" />
          </button>
          <button
            onClick={() => navigate(1)}
            aria-label="Forward"
            className="glass-pill w-8 h-8 flex items-center justify-center transition-all"
            style={{ minWidth: '36px' }}
          >
            <ChevronRight className="w-4 h-4 text-tertiary" />
          </button>
        </div>

        {/* Search Input Field */}
        <div ref={searchContainerRef} className="relative flex-1 mx-2 pointer-events-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-tertiary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                // Prevent Space from triggering play/pause when typing in search
                if (e.key === ' ') return;
              }}
              placeholder="Search songs, artists, albums, or lyrics..."
              className="search-input w-full pl-10 pr-12 py-2 rounded-full text-white placeholder-tertiary text-xs focus:outline-none"
            />
            <span className="absolute right-3 hidden sm:flex items-center text-[10px] font-mono text-tertiary px-2 py-1 rounded border border-white/10 bg-white/5">
              ⌘K
            </span>
          </form>

          {/* Floating Live Suggestions Dropdown */}
          {showSuggestions && searchQuery.trim().length > 0 && (
            <div className="glass-elevated absolute top-full left-0 right-0 mt-2 p-4 z-50 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto">
              {/* Header: Live Suggestions & Enter Hint */}
              <div className="flex items-center justify-between text-[11px] pb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-secondary">
                  <Zap className="w-3.5 h-3.5 text-white fill-current" />
                  <span>LIVE SUGGESTIONS</span>
                </div>
                <span className="text-muted text-[10px] font-mono">
                  Press Enter to search all
                </span>
              </div>

              {/* TRACKS Section */}
              {liveTracks.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-1">
                    TRACKS
                  </div>
                  <div className="flex flex-col gap-1">
                    {liveTracks.map((track) => (
                      <div
                        key={track.videoId}
                        className="track-row group flex items-center justify-between gap-3 p-2 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-white/40"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handlePlayLiveTrack(track);
                          }
                        }}
                        onClick={() => handlePlayLiveTrack(track)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={track.thumbnail || ''}
                            alt={track.title}
                            className="w-9 h-9 rounded-lg object-cover bg-neutral-800 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white group-hover:text-white truncate">
                              {track.title}
                            </div>
                            <div className="text-[11px] text-tertiary truncate mt-0.5">
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
                          className="glass-pill w-8 h-8 flex items-center justify-center transition-all"
                        >
                          <Sparkles className="w-4 h-4 fill-current translate-x-0.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ARTISTS Section */}
              {liveArtists.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-1">
                    ARTISTS
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {liveArtists.map((artist, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectArtist(artist)}
                        className="glass-pill px-3 py-1.5 text-xs font-medium text-tertiary hover:text-white transition-all"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                        <span>{artist}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isSearching && liveTracks.length === 0 && (
                <div className="py-6 text-center text-xs text-tertiary">
                  Searching tracks & artists...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Offline Indicator, Desktop.fm Link, Commands, EQ, Spatial, Zen, Settings */}
        <div className="flex items-center gap-1.5 pr-1 pointer-events-auto">
          {/* Offline Mode Indicator */}
          <OfflineStatusBadge />

          {/* Desktop.fm Teaser Button */}
          <button
            onClick={() => navigate('/desktop-fm')}
            aria-label="Desktop.fm Experience"
            title="Desktop.fm Teaser & Design System"
            className="glass-pill hidden lg:flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold tracking-tight transition-all"
            style={{ background: 'rgba(0, 255, 102, 0.15)', borderColor: 'rgba(0, 255, 102, 0.3)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_6px_#00ff66]" />
            <span className="text-[#00ff66] font-bold">Desktop.fm</span>
          </button>

          {/* Visualizer Mode Switcher */}
          <div className="visualizer-mode-selector hidden lg:flex" role="group" aria-label="Visualizer mode">
            {[
              { id: 'ferrofluid', label: 'Ferrofluid', icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: 'cymatics', label: 'Cymatics', icon: <Zap className="w-3.5 h-3.5" /> },
              { id: 'starfield', label: 'Starfield', icon: <Headphones className="w-3.5 h-3.5" /> },
              { id: 'stealth', label: 'Stealth', icon: <Moon className="w-3.5 h-3.5" /> },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setVisualizerMode(id as any)}
                aria-label={`${label} visualizer`}
                aria-pressed={visualizerMode === id}
                className={`visualizer-mode-option ${visualizerMode === id ? 'glass-pill-active' : ''}`}
                data-active={visualizerMode === id}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Command Palette / EQ Button */}
          <button
            onClick={onOpenCommandPalette}
            aria-label="Open command menu"
            title="Command menu"
            className="glass-pill w-9 h-9 flex items-center justify-center transition-all"
          >
            <SlidersHorizontal className="w-4 h-4 text-tertiary" />
          </button>

          {/* Spatial Audio Toggle */}
          <button
            onClick={toggleSpatialAudio}
            aria-label="Toggle Spatial Audio"
            title="Spatial Audio"
            className={`glass-pill w-9 h-9 flex items-center justify-center transition-all ${spatialAudio ? 'bg-white/15 text-white ring-1 ring-white/25' : ''}`}
          >
            <Headphones className="w-4 h-4" style={{ color: spatialAudio ? 'rgb(var(--accent-primary-rgb))' : 'rgba(255,255,255,0.7)' }} />
          </button>

          {/* Zen Mode Toggle */}
          <button
            onClick={() => useUIStore.getState().toggleZenMode()}
            aria-label="Toggle Zen Mode"
            title="Zen Mode"
            className="glass-pill w-9 h-9 flex items-center justify-center transition-all"
          >
            <Moon className="w-4 h-4 text-tertiary" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => navigate('/settings')}
            className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold shrink-0"
            title="Settings"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};