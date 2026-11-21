import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Outlet } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { BottomTransportDock } from '../hud/BottomTransportDock';
import { FullScreenPlayer } from '../player/FullScreenPlayer';
import { QueuePanel } from '../player/QueuePanel';
import { LyricsPanel } from '../player/LyricsPanel';
import { AboutThisSongModal } from '../player/AboutThisSongModal';
import { VideoDock } from '../player/VideoDock';
import { CommandPalette } from '../common/CommandPalette';
import { EqualizerDrawer } from '../hud/EqualizerDrawer';
import { StreamingQualityModal } from '../common/StreamingQualityModal';
import { AuraStage } from '../hud/AuraStage';
import { TopStudioBar } from '../hud/TopStudioBar';
import { SoundstageCanvas } from '../canvas/SoundstageCanvas';
import { LiquidRippleVisualizer } from '../canvas/LiquidRippleVisualizer';
import { FloatingModuleDock } from '../hud/FloatingModuleDock';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useUIStore } from '@/stores/useUIStore';
import { Sparkles } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const fetchLibrary = useLibraryStore(s => s.fetchLibrary);
  const isPlayerExpanded = usePlayerStore(s => s.isPlayerExpanded);
  const theme = useThemeStore(s => s.theme);
  const { zenMode, setZenMode, equalizerDrawerOpen, setEqualizerDrawerOpen } = useUIStore();

  // Load library and restore player session on start
  useEffect(() => {
    fetchLibrary();
    usePlayerStore.getState().initEngine();
  }, [fetchLibrary]);

  // Keep the GlassyUI material aligned with the app's persisted theme.
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      root.dataset.lgTheme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    };
    applyTheme();
    if (theme !== 'system') return;
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  // Global Keyboard Shortcuts
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

      // Escape - close drawers, exit fullscreen, close modals
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isPlayerExpanded) {
          usePlayerStore.getState().setPlayerExpanded(false);
          return;
        }
        if (useUIStore.getState().leftDockOpen) {
          useUIStore.getState().setLeftDockOpen(false);
          return;
        }
        if (useUIStore.getState().rightDockOpen) {
          useUIStore.getState().setRightDockOpen(false);
          return;
        }
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
          return;
        }
        if (useUIStore.getState().equalizerDrawerOpen) {
          useUIStore.getState().setEqualizerDrawerOpen(false);
          return;
        }
        if (useUIStore.getState().zenMode) {
          setZenMode(false);
          return;
        }
      }

      // Cmd+K / Ctrl+K - Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Z - Zen Mode
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        setZenMode(!useUIStore.getState().zenMode);
        return;
      }

      const player = usePlayerStore.getState();

      // Space -> play/pause (only when not typing)
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
      // E -> Equalizer
      else if (e.key === 'e' || e.key === 'E') {
        setEqualizerDrawerOpen(!useUIStore.getState().equalizerDrawerOpen);
      }
      // / -> search focus (unless typing)
      else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
      // V - Visualizer mode cycle
      else if (e.key === 'v' || e.key === 'V') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
          e.preventDefault();
          useUIStore.getState().cycleVisualizerMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, isPlayerExpanded, zenMode]);

  return (
    <div className="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-black text-[var(--text-primary)] font-sans selection:bg-white/20 selection:text-white">
      <AuraStage />

      {/* Band 1 — fixed-height studio chrome */}
      {!isPlayerExpanded && !zenMode && <TopStudioBar
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenEqualizerDrawer={() => useUIStore.getState().setEqualizerDrawerOpen(true)}
        onToggleZenMode={() => setZenMode(!useUIStore.getState().zenMode)}
      />}

      {/* Band 2 — one bounded stage owns visuals, route content and modules */}
      <section className={`relative mx-3 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-white/10 bg-black/25 ${isPlayerExpanded ? 'hidden' : ''}`} aria-label="Studio stage">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <LiquidRippleVisualizer />
          <SoundstageCanvas />
        </div>
        <main className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-4 py-5 md:px-8 lg:px-12">
            <div className="mx-auto min-h-full w-full max-w-[1400px]">
              <React.Suspense fallback={<p role="status" className="p-8 text-center text-tertiary">Opening page…</p>}><Outlet /></React.Suspense>
            </div>
          </div>
        </main>
        {!zenMode && <FloatingModuleDock />}
      </section>

      {/* Band 3 — transport remains in document flow */}
      {!isPlayerExpanded && !zenMode && <BottomTransportDock />}

      {/* ====================================================================
          OVERLAYS & MODALS
          ==================================================================== */}
      {/* Official YouTube Compliance Video Dock */}
      <VideoDock />

      {/* Full-Screen Sheet */}
      <FullScreenPlayer />

      {/* Panels (for desktop when not using FloatingModuleDock) */}
      <QueuePanel />
      <LyricsPanel />
      <AboutThisSongModal />

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* 10-Band Pro Equalizer Drawer (Slide-over from right) */}
      <EqualizerDrawer
        isOpen={equalizerDrawerOpen}
        onClose={() => useUIStore.getState().setEqualizerDrawerOpen(false)}
      />

      {/* Streaming Quality Engine Modal */}
      <StreamingQualityModal />

      {/* Mobile Bottom Navigation (Hidden during Fullscreen & Zen) */}
      {!isPlayerExpanded && !useUIStore.getState().zenMode && <BottomNavigation />}

      {/* Zen Mode Overlay */}
      {useUIStore.getState().zenMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="glass-elevated p-8 rounded-2xl text-center pointer-events-auto max-w-md mx-4"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgb(var(--aura-primary-rgb)) 0%, rgb(var(--aura-secondary-rgb)) 100%)',
              boxShadow: '0 8px 32px rgba(var(--aura-primary-rgb), 0.3)',
            }}>
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="heading text-2xl font-bold text-white mb-2">Zen Mode</h2>
            <p className="body text-tertiary mb-6">Press <kbd className="px-2 py-1 rounded bg-white/10 font-mono">Z</kbd> or click to exit</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setZenMode(false)}
              className="btn-primary px-6 py-2"
            >
              Exit Zen Mode
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};