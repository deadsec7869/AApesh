import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Zap,
  Play,
  SlidersHorizontal,
  Headphones,
  Moon,
  Sparkles,
  Radio,
  Terminal,
  Maximize2,
  Minimize2,
  LayoutDashboard,
  Grid,
  Menu,
  X,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useEqualizerStore } from '@/stores/useEqualizerStore';
import { Track } from '@/types/music';
import { OfflineStatusBadge } from '@/components/common/OfflineStatusBadge';
import { useUIStore } from '@/stores/useUIStore';

const VIEW_MODES = [
  { id: 'discover', label: 'Discover', icon: LayoutDashboard },
  { id: 'studio', label: 'Studio', icon: Grid },
  { id: 'stage', label: 'Stage', icon: Radio },
] as const;

const VISUALIZER_MODES = [
  { id: 'ripple', label: 'Liquid Ripple', icon: Sparkles },
  { id: 'ferrofluid', label: 'Ferrofluid', icon: Zap },
  { id: 'cymatics', label: 'Cymatics', icon: Radio },
  { id: 'starfield', label: 'Starfield', icon: Headphones },
  { id: 'stealth', label: 'Stealth', icon: Moon },
] as const;

interface TopStudioBarProps {
  onOpenCommandPalette: () => void;
  onOpenEqualizerDrawer: () => void;
  onToggleZenMode: () => void;
}

export const TopStudioBar: React.FC<TopStudioBarProps> = ({
  onOpenCommandPalette,
  onOpenEqualizerDrawer,
  onToggleZenMode,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTrack, playTrack, queue } = usePlayerStore();
  const { toggleOpen: toggleEqualizer, spatialAudio, toggleSpatialAudio } = useEqualizerStore();
  const { viewMode, setViewMode, visualizerMode, setVisualizerMode } = useUIStore();

  const [showVisualizerMenu, setShowVisualizerMenu] = useState(false);
  const visualizerMenuRef = useRef<HTMLDivElement>(null);

  // Close visualizer menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (visualizerMenuRef.current && !visualizerMenuRef.current.contains(e.target as Node)) {
        setShowVisualizerMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentVisualizer = VISUALIZER_MODES.find(v => v.id === visualizerMode) || VISUALIZER_MODES[0];

  const getContextTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'AAPESH';
    if (currentTrack) return currentTrack.title;
    if (path.startsWith('/discover')) return 'Discovery';
    if (path.startsWith('/search')) return 'Search';
    if (path.startsWith('/album/')) return 'Album';
    if (path.startsWith('/artist/')) return 'Artist';
    if (path.startsWith('/playlist/')) return 'Playlist';
    if (path.startsWith('/library')) return 'Library';
    if (path.startsWith('/history')) return 'History';
    if (path.startsWith('/settings')) return 'Settings';
    return 'AAPESH';
  };

  return (
    <header className="relative z-40 flex h-12 w-full shrink-0 items-center px-3 bg-black/95 border-b border-white/5">
      <div className="top-hud h-full w-full max-w-none flex items-center gap-2 px-2 py-1 justify-between pointer-events-auto flex-nowrap">
        {/* Left: Back button + Context Title */}
        <div className="flex items-center gap-2 pl-1 pointer-events-auto min-w-0">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-white/10 hover:border-white/20"
            style={{ minWidth: '36px' }}
          >
            <ChevronLeft className="w-4 h-4 text-tertiary" />
          </button>
          <span className="text-sm font-medium text-white truncate max-w-[200px] hidden sm:block">
            {getContextTitle()}
          </span>
        </div>

        {/* Center: 3-segment View Mode Pill */}
        <nav
          aria-label="View Modes"
          className="flex items-center gap-1 p-1 rounded-full pointer-events-auto mx-auto"
          style={{
            background: 'rgba(16, 16, 20, 0.6)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '4px',
            borderRadius: '9999px',
          }}
        >
          {VIEW_MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id as any)}
              aria-label={label}
              aria-pressed={viewMode === id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                viewMode === id
                  ? 'bg-white/10 text-white ring-1 ring-white/20 shadow-sm font-semibold'
                  : 'text-tertiary hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        {/* Right: Visualizer Dropdown + ⌘K Search + YT Stream Badge + Offline + Zen */}
        <div className="flex items-center gap-1.5 pr-1 pointer-events-auto">
          {/* Visualizer Mode Dropdown */}
          <div className="relative" ref={visualizerMenuRef}>
            <button
              onClick={() => setShowVisualizerMenu(!showVisualizerMenu)}
              aria-label={`Visualizer: ${currentVisualizer.label}`}
              aria-expanded={showVisualizerMenu}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all text-tertiary hover:text-white"
              style={{
                background: 'rgba(16, 16, 20, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '9999px',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              }}
            >
              <currentVisualizer.icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{currentVisualizer.label}</span>
            </button>

            {showVisualizerMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-150"
                style={{
                  background: 'rgba(16, 16, 20, 0.95)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  boxShadow: '0 24px 60px -16px rgba(0, 0, 0, 0.7)',
                }}
              >
                <div className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-wider border-b border-white/10">
                  VISUALIZER
                </div>
                <div className="flex flex-col gap-1 p-2">
                  {VISUALIZER_MODES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setVisualizerMode(id as any);
                        setShowVisualizerMenu(false);
                      }}
                      aria-label={label}
                      aria-pressed={visualizerMode === id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        visualizerMode === id
                          ? 'bg-white/10 text-white'
                          : 'text-tertiary hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ⌘K Search / Command Palette */}
          <button
            onClick={onOpenCommandPalette}
            aria-label="Open command menu (⌘K)"
            title="Command menu (⌘K)"
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-white/10 hover:border-white/20"
          >
            <Search className="w-4 h-4 text-tertiary" />
          </button>

          {/* YT Stream Badge */}
          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-emerald-400 border-emerald-500/30 text-[10px] font-mono font-semibold"
            style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            YT Stream
          </span>

          {/* Offline Mode Indicator */}
          <OfflineStatusBadge />

          {/* Spatial Audio Toggle */}
          <button
            onClick={toggleSpatialAudio}
            aria-label="Toggle Spatial Audio"
            title="Spatial Audio"
            className={`w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all ${spatialAudio ? 'bg-white/15 text-white ring-1 ring-white/30' : 'hover:bg-white/10 hover:border-white/20'}`}
          >
            <Headphones className="w-4 h-4" style={{ color: spatialAudio ? 'rgb(var(--accent-primary-rgb))' : 'rgba(255,255,255,0.7)' }} />
          </button>

          {/* Zen Mode Toggle */}
          <button
            onClick={() => useUIStore.getState().toggleZenMode()}
            aria-label="Toggle Zen Mode"
            title="Zen Mode"
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-white/10 hover:border-white/20"
          >
            <Moon className="w-4 h-4 text-tertiary" />
          </button>
        </div>
      </div>
    </header>
  );
};