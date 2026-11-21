import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAudioDSPStore } from '@/stores/useAudioDSPStore';
import { useUIStore } from '@/stores/useUIStore';
import { QueuePanel } from '@/components/player/QueuePanel';
import { LyricsPanel } from '@/components/player/LyricsPanel';
import { EqualizerDrawer } from '@/components/hud/EqualizerDrawer';
import { AboutThisSongModal } from '@/components/player/AboutThisSongModal';
import { formatTime } from '@/lib/utils';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Heart, Plus, Moon, Maximize2,
  Loader2, Sparkles, Headphones, Mic2, ListMusic, SlidersHorizontal, Info
} from 'lucide-react';
import {
  controlButtonHover, controlButtonTap, playButtonHover, playButtonTap
} from '@/lib/motion';

type RightDrawerTab = 'queue' | 'lyrics' | 'eq';

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const RightDrawerContent: React.FC<RightDrawerProps> = ({ isOpen, onClose, isMobile }) => {
  const { isQueueOpen, isLyricsOpen, isAboutOpen, toggleQueue, toggleLyrics, toggleAbout, togglePlayerExpanded, openAbout } = usePlayerStore();
  const { spatialAudio, toggleSpatialAudio } = useAudioDSPStore();
  const { equalizerDrawerOpen, setEqualizerDrawerOpen } = useUIStore();
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const atmospherePalette = usePlayerStore(s => s.atmospherePalette);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isBuffering = usePlayerStore(s => s.isBuffering);
  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const next = usePlayerStore(s => s.next);
  const previous = usePlayerStore(s => s.previous);
  const seek = usePlayerStore(s => s.seek);
  const volume = usePlayerStore(s => s.volume);
  const isMuted = usePlayerStore(s => s.isMuted);
  const setVolume = usePlayerStore(s => s.setVolume);
  const toggleMute = usePlayerStore(s => s.toggleMute);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const shuffleMode = usePlayerStore(s => s.shuffleMode);
  const cycleShuffleMode = usePlayerStore(s => s.cycleShuffleMode);
  const toggleRepeat = usePlayerStore(s => s.toggleRepeat);
  const getEffectiveQualityInfo = usePlayerStore(s => s.getEffectiveQualityInfo);
  const { isLiked, toggleLike } = useLibraryStore();

  const [activeTab, setActiveTab] = useState<RightDrawerTab>('queue');
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [waveformLoading, setWaveformLoading] = useState(false);

  // Fetch waveform data when track changes
  useEffect(() => {
    if (!currentTrack) {
      setWaveformData(null);
      return;
    }
    setWaveformLoading(true);
    const synthetic = Array.from({ length: 256 }, (_, i) => {
      const t = i / 255;
      const envelope = Math.sin(t * Math.PI) * (0.3 + 0.7 * Math.random());
      return Math.max(0, Math.min(1, envelope));
    });
    setWaveformData(synthetic);
    setWaveformLoading(false);
  }, [currentTrack?.videoId]);

  const displayedTime = scrubValue !== null ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (displayedTime / duration) * 100 : 0;
  const currentVolume = isMuted ? 0 : volume;
  const qualityInfo = getEffectiveQualityInfo();
  const liked = currentTrack ? isLiked(currentTrack.videoId) : false;

  const handleTabChange = (tab: RightDrawerTab) => {
    setActiveTab(tab);
    useUIStore.getState().setActiveHUDPanel(tab === 'queue' ? 'queue' : tab === 'lyrics' ? 'lyrics' : 'equalizer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <motion.aside
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="drawer-panel fixed top-14 bottom-14 right-4 z-40 flex flex-col overflow-hidden w-[380px] max-w-[90vw]"
        aria-label="Playback panels"
        role="complementary"
      >
        <div className="flex flex-col h-full pointer-events-auto">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-tertiary">
                Now Playing
              </span>
              <div className="w-px h-4 bg-white/10 mx-2" />
              <span className="text-sm font-medium text-white truncate max-w-[200px]">
                {currentTrack?.title || 'Nothing playing'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="glass-pill w-8 h-8 flex items-center justify-center transition-all"
              aria-label="Close panel"
            >
              <X className="w-4 h-4 text-tertiary" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 px-3 pointer-events-auto">
            {[
              { id: 'queue', label: 'Queue', icon: <ListMusic className="w-4 h-4" /> },
              { id: 'lyrics', label: 'Lyrics', icon: <Mic2 className="w-4 h-4" /> },
              { id: 'eq', label: 'EQ', icon: <SlidersHorizontal className="w-4 h-4" /> },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id as RightDrawerTab)}
                aria-label={label}
                aria-pressed={activeTab === id}
                className={`visualizer-mode-option ${activeTab === id ? 'glass-pill-active' : ''}`}
                data-active={activeTab === id}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden pointer-events-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'queue' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-hidden"
                >
                  <QueuePanel />
                </motion.div>
              )}

              {activeTab === 'lyrics' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-hidden"
                >
                  <LyricsPanel />
                </motion.div>
              )}

              {activeTab === 'eq' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-hidden p-4"
                >
                  <EqualizerDrawer
                    isOpen={true}
                    onClose={() => handleTabChange('queue')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mini Player Controls at bottom of drawer */}
          {currentTrack && (
            <div className="border-t border-white/10 p-4 pointer-events-auto">
              {/* Track Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 flex-shrink-0">
                  <img
                    src={currentTrack.thumbnail || ''}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-white truncate">{currentTrack.title}</div>
                  <div className="text-xs text-tertiary truncate">{currentTrack.artists?.map((a) => a.name).join(', ')}</div>
                </div>
                <button
                  onClick={() => toggleLike(currentTrack)}
                  aria-label={liked ? 'Unlike' : 'Like'}
                  className="glass-pill w-8 h-8 flex items-center justify-center"
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-current text-rose-500' : 'text-tertiary'}`} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-100 ease-out"
                    style={{
                      width: `${progressPercent}%`,
                      background: `linear-gradient(90deg, rgb(var(--accent-primary-rgb)), rgb(var(--accent-secondary-rgb)))`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-tertiary mt-1">
                  <span>{formatTime(displayedTime)}</span>
                  <span>{duration > 0 ? `-${formatTime(Math.max(0, duration - displayedTime))}` : '0:00'}</span>
                </div>
              </div>

              {/* Transport Controls */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={cycleShuffleMode}
                  aria-label={`Shuffle: ${shuffleMode}`}
                  className={`control-btn ${shuffleMode !== 'off' ? 'bg-white/10 text-white' : 'text-tertiary'}`}
                >
                  {shuffleMode === 'smart' ? <Sparkles className="w-4 h-4 text-white" /> : <Shuffle className="w-4 h-4" />}
                </button>

                <button onClick={previous} aria-label="Previous" className="control-btn">
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="control-btn-primary"
                >
                  {isBuffering ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current translate-x-0.5" />
                  )}
                </button>

                <button onClick={next} aria-label="Next" className="control-btn">
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>

                <button
                  onClick={toggleRepeat}
                  aria-label={`Repeat: ${repeatMode}`}
                  className={`control-btn ${repeatMode !== 'off' ? 'bg-white/10 text-white' : 'text-tertiary'}`}
                >
                  {repeatMode === 'track' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>

              {/* Volume & Extras */}
              <div className="flex items-center justify-center gap-3 mt-3 text-tertiary">
                <button onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'} className="hover:text-white transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : volume < 50 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0" max="100" value={currentVolume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="slider w-32"
                />
                <span className="text-[10px] font-mono w-6 text-right">{currentVolume}%</span>

                <div className="w-px h-4 bg-white/10 mx-1" />

                <button onClick={() => toggleLike(currentTrack)} aria-label={liked ? 'Unlike' : 'Like'} className="hover:text-white transition-colors">
                  <Heart className={`w-4 h-4 ${liked ? 'fill-current text-rose-500' : ''}`} />
                </button>
                <button onClick={() => openAbout(currentTrack)} aria-label="About" className="hover:text-white transition-colors">
                  <Info className="w-4 h-4" />
                </button>
                <button onClick={togglePlayerExpanded} aria-label="Expand" className="hover:text-white transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

export const RightDrawer: React.FC = () => {
  const { rightDockOpen, setRightDockOpen } = useUIStore();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRightDockOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setRightDockOpen]);

  const isOpen = isMobile ? useUIStore.getState().rightDockOpen : true;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {isMobile && (
            <div
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
              onClick={() => useUIStore.getState().setRightDockOpen(false)}
              aria-hidden="true"
            />
          )}
          <RightDrawerContent isOpen={isOpen} onClose={() => setRightDockOpen(false)} isMobile={isMobile} />
        </>
      )}
    </AnimatePresence>
  );
};

export default RightDrawer;