import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNavigation } from './BottomNavigation';
import { BottomPlayer } from '../player/BottomPlayer';
import { FullScreenPlayer } from '../player/FullScreenPlayer';
import { QueuePanel } from '../player/QueuePanel';
import { LyricsPanel } from '../player/LyricsPanel';
import { VideoDock } from '../player/VideoDock';
import { CommandPalette } from '../common/CommandPalette';
import { EqualizerModal } from '../common/EqualizerModal';
import { DynamicArtworkBackground } from './DynamicArtworkBackground';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';

export const AppLayout: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { fetchLibrary } = useLibraryStore();

  // Load library on start
  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Global Keyboard Shortcuts (Imperative state lookup avoids listener re-registration)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user is typing in inputs or textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
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
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#050505] text-neutral-100 font-sans p-0 md:p-3.5 gap-0 md:gap-3.5 selection:bg-white/20 selection:text-white">
      {/* Dynamic Current-Song Artwork Background (Crossfading full-viewport atmospheric canvas) */}
      <DynamicArtworkBackground />

      {/* Floating Sidebar / Navigation Rail */}
      <Sidebar />

      {/* Main Floating Glass Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden md:rounded-[28px] glass-floating md:border md:border-white/[0.08] shadow-2xl relative">
        {/* Top Header */}
        <TopBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

        {/* Scrollable Page Body - extra padding for floating dock */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-44 md:pb-32 min-w-0">
          <div className="w-full max-w-[1500px] mx-auto min-w-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Persistent Bottom Player */}
      <BottomPlayer />

      {/* Official YouTube Compliance Video Dock */}
      <VideoDock />

      {/* Full-Screen Sheet */}
      <FullScreenPlayer />

      {/* Panels */}
      <QueuePanel />
      <LyricsPanel />

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* 10-Band Pro Equalizer Modal */}
      <EqualizerModal />

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};
