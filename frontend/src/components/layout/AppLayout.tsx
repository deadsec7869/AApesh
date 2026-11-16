import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNavigation } from './BottomNavigation';
import { BottomPlayer } from '../player/BottomPlayer';
import { FullScreenPlayer } from '../player/FullScreenPlayer';
import { QueuePanel } from '../player/QueuePanel';
import { LyricsPanel } from '../player/LyricsPanel';
import { AboutThisSongModal } from '../player/AboutThisSongModal';
import { VideoDock } from '../player/VideoDock';
import { CommandPalette } from '../common/CommandPalette';
import { EqualizerModal } from '../common/EqualizerModal';
import { StreamingQualityModal } from '../common/StreamingQualityModal';
import { DynamicArtworkBackground } from './DynamicArtworkBackground';
const SpatialArtworkEnvironment = React.lazy(() => import('../spatial/SpatialArtworkEnvironment').then(m => ({default:m.SpatialArtworkEnvironment})));
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useThemeStore } from '@/stores/useThemeStore';

export const AppLayout: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const fetchLibrary = useLibraryStore(s => s.fetchLibrary);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const bottomPlayerClearance = usePlayerStore(s => s.bottomPlayerClearance);
  const isPlayerExpanded = usePlayerStore(s => s.isPlayerExpanded);
  const ambientGlow = useThemeStore(s => s.ambientGlow);
  const visualQuality = useThemeStore(s => s.visualQuality);

  // Load library and restore player session on start
  useEffect(() => {
    fetchLibrary();
    usePlayerStore.getState().initEngine();
  }, [fetchLibrary]);

  // Global Keyboard Shortcuts (Imperative state lookup avoids listener re-registration)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user is typing in inputs or textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button, a, select, [role=dialog]') || e.defaultPrevented || target.isContentEditable
      ) {
        return;
      }

      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      const player = usePlayerStore.getState();

      // Space -> play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        player.togglePlay();
      }
      // ArrowRight -> seek +5s
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        player.seek(Math.min(player.duration, player.currentTime + 5));
      }
      // ArrowLeft -> seek -5s
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        player.seek(Math.max(0, player.currentTime - 5));
      }
      // ArrowUp -> vol +5
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        player.setVolume(Math.min(100, player.volume + 5));
      }
      // ArrowDown -> vol -5
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        player.setVolume(Math.max(0, player.volume - 5));
      }
      // N -> next track
      else if (e.key === 'n' || e.key === 'N') {
        player.next();
      }
      // P -> previous track
      else if (e.key === 'p' || e.key === 'P') {
        player.previous();
      }
      // M -> toggle mute
      else if (e.key === 'm' || e.key === 'M') {
        player.toggleMute();
      }
      // F -> full-screen player
      else if (e.key === 'f' || e.key === 'F') {
        player.togglePlayerExpanded();
      }
      // Q -> queue
      else if (e.key === 'q' || e.key === 'Q') {
        player.toggleQueue();
      }
      // L -> lyrics
      else if (e.key === 'l' || e.key === 'L') {
        player.toggleLyrics();
      }
      // V -> toggle VideoDock
      else if (e.key === 'v' || e.key === 'V') {
        player.toggleVideoDock();
      }
      // / -> search focus
      else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#050505] text-neutral-100 font-sans selection:bg-white/20 selection:text-white">
      {/* Dynamic Current-Song Artwork Background (Crossfading full-viewport atmospheric canvas) */}
      <DynamicArtworkBackground />

      {/* 3D Spatial Immersive WebGL Layer */}
      {currentTrack && ambientGlow && visualQuality !== 'off' && (
        <React.Suspense fallback={null}>
          <SpatialArtworkEnvironment />
        </React.Suspense>
      )}

      {/* Floating Left Navigation Rail (Hidden during Fullscreen) */}
      {!isPlayerExpanded && <Sidebar />}

      {/* Central Floating Workstation Area (Hidden during Fullscreen to eliminate conflicts and bleed) */}
      <div
        className={`edition-workspace flex-1 flex flex-col min-w-0 h-full overflow-hidden px-2 md:px-0 pl-2 md:pl-20 lg:pl-24 pr-2 md:pr-5 lg:pr-8 py-2 md:py-3.5 relative z-10 ${
          isPlayerExpanded ? 'hidden' : ''
        }`}
      >
        {/* Floating Top Header */}
        <TopBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

        {/* Main Floating Glass Canvas Workspace */}
        <div className="edition-canvas flex-1 flex flex-col min-w-0 overflow-hidden rounded-[24px] md:rounded-[32px] bg-[#14151a]/65 backdrop-blur-3xl border border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.75)] relative mt-1">
          {/* Scrollable Page Body - dynamic safe space for floating bottom player */}
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 scroll-smooth px-4 md:px-8 py-6"
            style={{
              paddingBottom: `${bottomPlayerClearance || (currentTrack ? 120 : 80)}px`,
            }}
          >
            <div className="w-full max-w-[1440px] mx-auto min-w-0">
              <React.Suspense fallback={<p role="status">Opening page…</p>}><Outlet /></React.Suspense>
            </div>
          </main>
        </div>
      </div>

      {/* Persistent Bottom Player (Hidden during Fullscreen to prevent duplicate controls) */}
      {!isPlayerExpanded && <BottomPlayer />}

      {/* Official YouTube Compliance Video Dock */}
      <VideoDock />

      {/* Full-Screen Sheet */}
      <FullScreenPlayer />

      {/* Panels */}
      <QueuePanel />
      <LyricsPanel />
      <AboutThisSongModal />

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* 10-Band Pro Equalizer Modal */}
      <EqualizerModal />

      {/* Streaming Quality Engine Modal */}
      <StreamingQualityModal />

      {/* Mobile Bottom Navigation (Hidden during Fullscreen) */}
      {!isPlayerExpanded && <BottomNavigation />}
    </div>
  );
};
