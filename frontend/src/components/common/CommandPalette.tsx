import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Home,
  Compass,
  Library,
  Heart,
  History,
  Settings,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  Moon,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { modalBackdropVariants, modalSurfaceVariants } from '@/lib/motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const {
    isPlaying,
    togglePlay,
    next,
    previous,
    shuffleMode,
    cycleShuffleMode,
    toggleRepeat,
    toggleMute,
    isMuted,
    autoplayEnabled,
    toggleAutoplay,
    sleepTimer,
    setSleepTimer,
    cancelSleepTimer,
    toggleQualityModal,
    streamingQuality,
  } = usePlayerStore();

  const { theme, setTheme, toggleAmbientGlow } = useThemeStore();

  const commands = [
    {
      id: 'settings-quality',
      label: `Streaming Quality: ${streamingQuality.replace('_', ' ').toUpperCase()} (Settings)`,
      category: 'Audio Engine',
      icon: Activity,
      action: () => toggleQualityModal(),
    },
    {
      id: 'nav-home',
      label: 'Go to Home',
      category: 'Navigation',
      icon: Home,
      action: () => navigate('/'),
    },
    {
      id: 'nav-discover',
      label: 'Go to Discover',
      category: 'Navigation',
      icon: Compass,
      action: () => navigate('/discover'),
    },
    {
      id: 'nav-search',
      label: 'Search Catalog',
      category: 'Navigation',
      icon: Search,
      action: () => navigate('/search'),
    },
    {
      id: 'nav-library',
      label: 'Open Library',
      category: 'Navigation',
      icon: Library,
      action: () => navigate('/library'),
    },
    {
      id: 'nav-liked',
      label: 'Liked Songs',
      category: 'Navigation',
      icon: Heart,
      action: () => navigate('/library/liked'),
    },
    {
      id: 'nav-history',
      label: 'Listening History',
      category: 'Navigation',
      icon: History,
      action: () => navigate('/history'),
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      category: 'Navigation',
      icon: Settings,
      action: () => navigate('/settings'),
    },
    {
      id: 'play-toggle',
      label: isPlaying ? 'Pause Playback' : 'Resume Playback',
      category: 'Playback',
      icon: isPlaying ? Pause : Play,
      action: () => togglePlay(),
    },
    {
      id: 'play-next',
      label: 'Next Song',
      category: 'Playback',
      icon: SkipForward,
      action: () => next(),
    },
    {
      id: 'play-prev',
      label: 'Previous Song',
      category: 'Playback',
      icon: SkipBack,
      action: () => previous(),
    },
    {
      id: 'play-smart-shuffle',
      label: `Shuffle Mode: ${shuffleMode === 'smart' ? 'Smart Shuffle' : shuffleMode === 'standard' ? 'Standard Shuffle' : 'Off'} (Cycle)`,
      category: 'Playback',
      icon: shuffleMode === 'smart' ? Sparkles : Shuffle,
      action: () => cycleShuffleMode(),
    },
    {
      id: 'play-autoplay',
      label: `Autoplay: ${autoplayEnabled ? 'Enabled' : 'Disabled'} (Toggle)`,
      category: 'Playback',
      icon: Radio,
      action: () => toggleAutoplay(),
    },
    {
      id: 'play-repeat',
      label: 'Toggle Repeat Mode',
      category: 'Playback',
      icon: Repeat,
      action: () => toggleRepeat(),
    },
    {
      id: 'play-mute',
      label: isMuted ? 'Unmute Audio' : 'Mute Audio',
      category: 'Playback',
      icon: isMuted ? Volume2 : VolumeX,
      action: () => toggleMute(),
    },
    {
      id: 'timer-15',
      label: 'Sleep Timer: 15 Minutes',
      category: 'Sleep Timer',
      icon: Moon,
      action: () => setSleepTimer(15),
    },
    {
      id: 'timer-30',
      label: 'Sleep Timer: 30 Minutes',
      category: 'Sleep Timer',
      icon: Moon,
      action: () => setSleepTimer(30),
    },
    {
      id: 'timer-end-track',
      label: 'Sleep Timer: End of Current Track',
      category: 'Sleep Timer',
      icon: Moon,
      action: () => setSleepTimer('track'),
    },
    ...(sleepTimer
      ? [
          {
            id: 'timer-cancel',
            label: 'Sleep Timer: Turn Off',
            category: 'Sleep Timer',
            icon: Moon,
            action: () => cancelSleepTimer(),
          },
        ]
      : []),
    {
      id: 'theme-toggle',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      category: 'Appearance',
      icon: Sparkles,
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'glow-toggle',
      label: 'Toggle Ambient Artwork Glow',
      category: 'Appearance',
      icon: Sparkles,
      action: () => toggleAmbientGlow(),
    },
  ];

  const filteredCommands = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      } else if (query.trim()) {
        navigate(`/search/${encodeURIComponent(query.trim())}`);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-[10001] flex items-start justify-center pt-[15vh] p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            variants={modalSurfaceVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl glass-modal border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Search Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
              <Search className="w-5 h-5 text-neutral-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search music..."
                className="w-full bg-transparent text-white placeholder-neutral-500 text-base focus:outline-none"
              />
              <kbd className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-white/10 text-neutral-400 border border-white/10">
                Esc
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-[380px] overflow-y-auto p-2 flex flex-col gap-1">
              {query.trim() && (
                <div
                  onClick={() => {
                    navigate(`/search/${encodeURIComponent(query.trim())}`);
                    onClose();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-neutral-200 cursor-pointer transition-colors"
                >
                  <Search className="w-4 h-4 text-neutral-400" />
                  <span>Search music for <strong className="text-white">"{query}"</strong></span>
                </div>
              )}

              {filteredCommands.length === 0 && !query.trim() ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No matching commands
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm cursor-pointer transition-all duration-150 ${
                        isSelected ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.08]' : 'text-neutral-300 hover:bg-white/[0.06] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
                        <span>{cmd.label}</span>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'text-neutral-500 bg-white/5'
                        }`}
                      >
                        {cmd.category}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
