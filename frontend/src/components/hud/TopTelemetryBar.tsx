import React from 'react';
import { motion } from 'motion/react';
import { Wifi, WifiOff, Cpu, Zap, Grid, Star, Battery, X } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { VisualizerModeSwitcher } from '../canvas/VisualizerModeSwitcher';
import { controlButtonHover, controlButtonTap } from '@/lib/motion';

interface TopTelemetryBarProps {
  className?: string;
  onOpenCommandPalette: () => void;
  onOpenEqualizerDrawer: () => void;
  onToggleZenMode: () => void;
}

/**
 * Top Telemetry Bar - 48px
 *
 * Left: AAPESH // OS status pill + FastAPI/SQLite sync indicator
 * Center: Command Palette (Cmd+K) omnibox
 * Right: Visualizer mode toggle, EQ drawer, Spatial Audio, Zen Mode
 */

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  className = '',
  onOpenCommandPalette,
  onOpenEqualizerDrawer,
  onToggleZenMode,
}) => {
  const { visualQuality, ambientGlowEnabled, zenMode, reducedMotion } = useUIStore();
  const { currentTrack, isPlaying, isBuffering, playbackStatus } = usePlayerStore();

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 h-12 px-4 md:px-6 flex items-center justify-between gap-4 ${className}`}
      style={{
        background: 'rgba(14, 15, 20, 0.72)',
        backdropFilter: 'blur(40px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
      role="banner"
    >
      {/* ========================================================================
          LEFT: Status Pill + Sync Indicator
          ======================================================================== */}
      <div className="flex items-center gap-3 min-w-0">
        {/* AAPESH // OS Status Pill */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <span className="font-mono text-xs font-bold tracking-widest text-white uppercase">
            AAPESH
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider border"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            OS
          </span>
        </motion.div>

        {/* Sync Status Dots */}
        <div className="flex items-center gap-1.5" aria-label="System status">
          {/* Backend/API Sync */}
          <div className="relative group">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{
                background: '#00F0FF',
                boxShadow: '0 0 8px #00F0FF, 0 0 16px #00F0FF',
              }}
            />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
              style={{
                background: 'rgba(14, 15, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#00F0FF',
              }}
            >
              API Connected
            </span>
          </div>

          {/* Database Sync */}
          <div className="relative group">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              className="w-2 h-2 rounded-full"
              style={{
                background: '#FF9E00',
                boxShadow: '0 0 6px #FF9E00',
              }}
            />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
              style={{
                background: 'rgba(14, 15, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FF9E00',
              }}
            >
              SQLite Synced
            </span>
          </div>

          {/* Network Status */}
          <div className="relative group">
            <motion.div
              className="w-2 h-2 rounded-full transition-colors"
              style={{
                background: isOnline ? '#10B981' : '#EF4444',
                boxShadow: isOnline ? '0 0 6px #10B981' : '0 0 6px #EF4444',
              }}
            />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
              style={{
                background: 'rgba(14, 15, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: isOnline ? '#10B981' : '#EF4444',
              }}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================
          CENTER: Command Palette Omnibox (Cmd+K)
          ======================================================================== */}
      <div className="flex-1 max-w-xl mx-4 flex items-center">
        <motion.button
          onClick={onOpenCommandPalette}
          whileHover={controlButtonHover}
          whileTap={controlButtonTap}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-full transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          aria-label="Open Command Palette (Cmd+K)"
        >
          <Zap className="w-4 h-4" style={{ color: '#00F0FF' }} />
          <span className="text-sm font-medium text-white flex-1 text-left">
            Search tracks, artists, albums...
          </span>
          <kbd className="px-2 py-0.5 rounded text-[10px] font-mono uppercase"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            ⌘K
          </kbd>
        </motion.button>
      </div>

      {/* ========================================================================
          RIGHT: Visualizer / EQ / Spatial / Zen Controls
          ======================================================================== */}
      <div className="flex items-center gap-2">
        {/* Visualizer Mode Switcher */}
        <div className="relative group">
          <VisualizerModeSwitcher />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
            style={{
              background: 'rgba(14, 15, 20, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            Visualizer Mode (V)
          </span>
        </div>

        {/* Equalizer Drawer Trigger */}
        <motion.button
          onClick={onOpenEqualizerDrawer}
          whileHover={controlButtonHover}
          whileTap={controlButtonTap}
          className="p-2 rounded-full transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
          aria-label="Open 10-Band Equalizer"
          title="Pro Graphic Equalizer (E)"
        >
          <Grid className="w-4 h-4 text-neutral-400 hover:text-white transition-colors" />
        </motion.button>

        {/* Spatial Audio Toggle */}
        <motion.button
          onClick={() => {}}
          whileHover={controlButtonHover}
          whileTap={controlButtonTap}
          className="p-2 rounded-full transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
          aria-label="Spatial Audio (saved preference, unavailable for YouTube streams)"
          title="Spatial Audio — saved preference"
        >
          <Cpu className="w-4 h-4 text-neutral-400 hover:text-white transition-colors" />
        </motion.button>

        {/* Zen Mode Toggle */}
        <motion.button
          onClick={onToggleZenMode}
          whileHover={controlButtonHover}
          whileTap={controlButtonTap}
          className={`p-2 rounded-full transition-all ${
            zenMode
              ? 'bg-white/20 text-white ring-1 ring-white/30 shadow-[0_0_12px_rgba(255,255,255,0.2)]'
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
          aria-label={zenMode ? 'Exit Zen Mode' : 'Enter Zen Mode'}
          title={zenMode ? 'Exit Zen Mode (Z)' : 'Zen Mode (Z) — Hide all chrome'}
        >
          {zenMode ? (
            <X className="w-4 h-4 text-white" />
          ) : (
            <Battery className="w-4 h-4 text-neutral-400 hover:text-white transition-colors" />
          )}
        </motion.button>

        {/* Visual Quality Indicator */}
        <div className="relative group ml-1">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono font-medium tracking-wider"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            {visualQuality.toUpperCase()}
          </div>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
            style={{
              background: 'rgba(14, 15, 20, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            Visual Quality: {visualQuality}
          </span>
        </div>
      </div>
    </motion.header>
  );
};