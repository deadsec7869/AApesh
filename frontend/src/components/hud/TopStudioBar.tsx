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
  Sun,
  Droplet,
  Palette,
  Music,
  Circle,
  Pause,
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
  { id: 'lumn', label: 'Lumn Prism', icon: Sparkles },
  { id: 'ripple', label: 'Liquid Ripple', icon: Droplet },
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
  const {
    viewMode,
    setViewMode,
    visualizerMode,
    setVisualizerMode,
    lumnMode,
    setLumnMode,
    lumnThickness,
    setLumnThickness,
    lumnIntensity,
    setLumnIntensity,
    lumnColorSync,
    setLumnColorSync,
    lumnCustomPrimary,
    setLumnCustomPrimary,
    lumnCustomSecondary,
    setLumnCustomSecondary,
  } = useUIStore();

  const [showVisualizerMenu, setShowVisualizerMenu] = useState(false);
  const [showLumnPopover, setShowLumnPopover] = useState(false);
  const visualizerMenuRef = useRef<HTMLDivElement>(null);
  const lumnPopoverRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (visualizerMenuRef.current && !visualizerMenuRef.current.contains(e.target as Node)) {
        setShowVisualizerMenu(false);
      }
      if (lumnPopoverRef.current && !lumnPopoverRef.current.contains(e.target as Node)) {
        setShowLumnPopover(false);
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

  // Lumn mode icon mapping
  const getLumnModeIcon = (mode: string) => {
    switch (mode) {
      case 'music-sync': return <Music className="w-4 h-4 shrink-0" />;
      case 'idle': return <Circle className="w-4 h-4 shrink-0" />;
      case 'still': return <Pause className="w-4 h-4 shrink-0" />;
      default: return <Music className="w-4 h-4 shrink-0" />;
    }
  };

  const getLumnModeLabel = (mode: string) => {
    switch (mode) {
      case 'music-sync': return 'Music Sync';
      case 'idle': return 'Idle';
      case 'still': return 'Still';
      default: return 'Music Sync';
    }
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

        {/* Right: Lumn Light Popover + Visualizer Dropdown + ⌘K Search + YT Stream Badge + Offline + Spatial + Zen */}
        <div className="flex items-center gap-1.5 pr-1 pointer-events-auto">
          {/* Lumn Light Popover — Signature Feature */}
          <div className="relative" ref={lumnPopoverRef}>
            <button
              onClick={() => setShowLumnPopover(!showLumnPopover)}
              aria-label={`Lumn Light: ${getLumnModeLabel(lumnMode)}`}
              aria-expanded={showLumnPopover}
              aria-haspopup="dialog"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all text-tertiary hover:text-white"
              style={{
                background: 'rgba(16, 16, 20, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '9999px',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              }}
            >
              {getLumnModeIcon(lumnMode)}
              <span className="hidden sm:inline">Lumn</span>
            </button>

            {showLumnPopover && (
              <div
                className="absolute right-0 top-full mt-2 w-72 z-50 animate-in fade-in zoom-in-95 duration-150 liquid-glass-strong rounded-xl p-4"
                style={{
                  boxShadow: '0 24px 60px -16px rgba(0, 0, 0, 0.7)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    LUMN LIGHT
                  </div>
                  <span className="text-[10px] text-tertiary">Colors from artwork</span>
                </div>

                {/* Animation Mode */}
                <div className="mb-4">
                  <label className="text-[10px] font-medium text-tertiary uppercase tracking-wider block mb-2">
                    Animation Mode
                  </label>
                  <div className="flex items-center gap-1 p-1 rounded-lg liquid-glass" style={{ background: 'rgba(16,16,20,0.6)' }}>
                    {['music-sync', 'idle', 'still'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setLumnMode(mode as any)}
                        aria-label={getLumnModeLabel(mode)}
                        aria-pressed={lumnMode === mode}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs transition-all ${
                          lumnMode === mode
                            ? 'bg-white/10 text-white ring-1 ring-white/20 shadow-sm font-semibold'
                            : 'text-tertiary hover:text-white'
                        }`}
                      >
                        {getLumnModeIcon(mode)}
                        <span className="hidden sm:inline">{getLumnModeLabel(mode)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thickness Slider */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-medium text-tertiary">Thickness</span>
                    <span className="font-mono text-white">{lumnThickness}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={lumnThickness}
                    onChange={(e) => setLumnThickness(Number(e.target.value))}
                    className="slider w-full"
                                      />
                </div>

                {/* Intensity Slider */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-medium text-tertiary">Intensity</span>
                    <span className="font-mono text-white">{lumnIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lumnIntensity}
                    onChange={(e) => setLumnIntensity(Number(e.target.value))}
                    className="slider w-full"
                                      />
                </div>

                {/* Color Sync Toggle */}
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button
                      onClick={() => setLumnColorSync(!lumnColorSync)}
                      aria-label={lumnColorSync ? 'Disable album color sync' : 'Enable album color sync'}
                      aria-pressed={lumnColorSync}
                      className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                        lumnColorSync
                          ? 'bg-white/10 text-white ring-1 ring-white/20 shadow-sm'
                          : 'text-tertiary hover:text-white'
                      }`}
                    >
                      <Palette className="w-4 h-4 shrink-0" />
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-tertiary whitespace-nowrap">
                        {lumnColorSync ? 'Album Sync' : 'Custom Colors'}
                      </span>
                    </button>
                    <div className="text-left">
                      <div className="text-xs font-medium text-white">Album Color Sync</div>
                      <div className="text-[10px] text-tertiary">
                        {lumnColorSync ? 'Primary & secondary sampled from artwork' : 'Use custom gradient below'}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Custom Color Pickers (shown when Album Sync is off) */}
                {!lumnColorSync && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-[10px] font-medium text-tertiary block mb-1">Custom Primary</label>
                      <div className="relative">
                        <input
                          type="color"
                          value={lumnCustomPrimary}
                          onChange={(e) => setLumnCustomPrimary(e.target.value)}
                          className="w-full h-10 rounded-lg border border-white/10 bg-white/5 cursor-pointer appearance-none"
                        />
                        <div className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-tertiary block mb-1">Custom Secondary</label>
                      <div className="relative">
                        <input
                          type="color"
                          value={lumnCustomSecondary}
                          onChange={(e) => setLumnCustomSecondary(e.target.value)}
                          className="w-full h-10 rounded-lg border border-white/10 bg-white/5 cursor-pointer appearance-none"
                        />
                        <div className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Live preview swatch */}
                <div className="rounded-lg p-3 liquid-glass" style={{ background: 'rgba(16,16,20,0.6)' }}>
                  <div className="text-[10px] font-medium text-tertiary mb-2">Live Preview</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg" style={{
                      background: `linear-gradient(135deg, ${lumnColorSync ? 'rgb(var(--lumn-primary-rgb))' : lumnCustomPrimary} 0%, ${lumnColorSync ? 'rgb(var(--lumn-secondary-rgb))' : lumnCustomSecondary} 100%)`,
                      boxShadow: '0 0 20px rgba(var(--lumn-primary-rgb), 0.3)',
                    }} />
                    <div className="text-[10px] text-tertiary">
                      Thickness: {lumnThickness}px<br/>
                      Intensity: {lumnIntensity}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

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