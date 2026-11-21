import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Heart, Plus, Moon, Maximize2,
  Loader2, Sparkles, Headphones, Minus, ChevronLeft, ChevronRight,
  Radio, Mic2,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAudioDSPStore } from '@/stores/useAudioDSPStore';
import { useUIStore } from '@/stores/useUIStore';
import { formatTime } from '@/lib/utils';
import { getArtworkUrl } from '@/utils/artwork';
import { WaveformScrubber } from './WaveformScrubber';
import { SleepTimerModal } from '@/components/common/SleepTimerModal';
import { AddToPlaylistModal } from '@/components/common/AddToPlaylistModal';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import {
  iconCrossfadeVariants,
  controlButtonHover,
  controlButtonTap,
  playButtonHover,
  playButtonTap,
} from '@/lib/motion';
import { Magnet } from '@/components/react-bits';

interface BottomTransportDockProps {
  className?: string;
}

export const BottomTransportDock: React.FC<BottomTransportDockProps> = ({ className = '' }) => {
  // ALWAYS call all hooks first - never conditionally skip hooks
  const {
    currentTrack,
    atmospherePalette,
    isPlaying,
    isBuffering,
    playbackStatus,
    error,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    shuffleMode,
    isQueueOpen,
    isLyricsOpen,
    isVideoDockOpen,
    isAboutOpen,
    togglePlay,
    playTrack,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    cycleShuffleMode,
    toggleRepeat,
    toggleQueue,
    toggleLyrics,
    toggleAbout,
    toggleVideoDock,
    togglePlayerExpanded,
    toggleQualityModal,
    getEffectiveQualityInfo,
    setBottomPlayerDimensions,
    isPlayerExpanded,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const { toggleOpen: toggleEqualizer, spatialAudio, toggleSpatialAudio, playbackSpeed } = useAudioDSPStore();
  const { visualQuality } = useUIStore();

  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [sleepTimerModalOpen, setSleepTimerModalOpen] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [abLoopDrag, setAbLoopDrag] = useState<'a' | 'b' | null>(null);

  const footerRef = React.useRef<HTMLElement>(null);

  // Fetch waveform data when track changes
  useEffect(() => {
    if (!currentTrack) {
      setWaveformData(null);
      setAbLoop({ a: null, b: null });
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
    setAbLoop({ a: null, b: null });
  }, [currentTrack?.videoId]);

  // Measure actual rendered BottomPlayer height and calculate dynamic bottom clearance
  useEffect(() => {
    const updateDimensions = () => {
      const el = footerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const height = Math.round(rect.height);
      const occupiedBottomSpace = Math.max(0, window.innerHeight - rect.top);
      const breathingMargin = 0;
      const clearance = Math.round(occupiedBottomSpace + breathingMargin);

      setBottomPlayerDimensions(height, clearance);
      document.documentElement.style.setProperty('--bottom-player-height', `${height}px`);
      document.documentElement.style.setProperty('--bottom-player-clearance', `${clearance}px`);
    };

    updateDimensions();

    const el = footerRef.current;
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateDimensions();
      });
      observer.observe(el);
    }

    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      if (observer && el) observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, [currentTrack, setBottomPlayerDimensions]);

  // A-B Loop handlers
  const handleAbLoopMouseDown = (e: React.MouseEvent, which: 'a' | 'b') => {
    e.preventDefault();
    e.stopPropagation();
    setAbLoopDrag(which);
  };

  const handleAbLoopMouseMove = (e: MouseEvent) => {
    if (!abLoopDrag || !duration || !footerRef.current) return;
    const rect = footerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = x * duration;
    setAbLoop(prev => ({ ...prev, [abLoopDrag]: time }));
  };

  const handleAbLoopMouseUp = () => {
    setAbLoopDrag(null);
  };

  const handleFooterMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handleAbLoopMouseMove(e.nativeEvent);
  };

  const handleFooterMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    handleAbLoopMouseUp();
  };

  useEffect(() => {
    if (abLoopDrag) {
      window.addEventListener('mousemove', handleAbLoopMouseMove as EventListener);
      window.addEventListener('mouseup', handleAbLoopMouseUp as EventListener);
    }
    return () => {
      window.removeEventListener('mousemove', handleAbLoopMouseMove as EventListener);
      window.removeEventListener('mouseup', handleAbLoopMouseUp as EventListener);
    };
  }, [abLoopDrag]);

  // Early return AFTER all hooks - renders null but hooks still called
  if (isPlayerExpanded) {
    return null;
  }

  // Empty State
  if (!currentTrack) {
    return (
      <footer
        ref={footerRef}
        aria-label="Audio Player Standby"
        className={`playback-dock !h-auto relative z-30 w-full shrink-0 rounded-none px-4 py-2 md:px-6 flex items-center justify-between pointer-events-auto transition-all duration-300 select-none ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgb(var(--accent-primary-rgb)) 0%, rgb(var(--accent-secondary-rgb)) 100%)',
            boxShadow: '0 4px 16px rgba(var(--accent-primary-rgb), 0.25)',
          }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white">Nothing playing</div>
            <div className="text-[11px] text-tertiary">Select any track to begin</div>
          </div>
        </div>
        <span className="text-[11px] font-mono tracking-wider text-tertiary uppercase px-3 py-1 rounded-full glass-pill">
          Standby
        </span>
      </footer>
    );
  }

  const liked = isLiked(currentTrack.videoId);
  const displayedTime = scrubValue !== null ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (displayedTime / duration) * 100 : 0;
  const currentVolume = isMuted ? 0 : volume;
  const qualityInfo = getEffectiveQualityInfo();

  const primaryColor = atmospherePalette?.primary || '#ffffff';
  const glowColor = atmospherePalette?.glow || 'rgba(255, 255, 255, 0.12)';

  return (
    <>
      <footer
        ref={footerRef}
        aria-label="Audio Player Transport"
        className={`playback-dock !h-auto relative z-30 w-full shrink-0 rounded-none px-4 py-2 md:px-8 flex flex-col items-center justify-between transition-all duration-300 pointer-events-auto select-none gap-1 ${className}`}
        onMouseMove={handleFooterMouseMove}
        onMouseUp={handleFooterMouseUp}
        style={{ background: '#000000' }}
      >
        {/* Ambient Artwork Glow */}
        {atmospherePalette && (
          <div
            className="absolute -inset-1 rounded-full opacity-25 blur-2xl pointer-events-none -z-10 transition-all duration-700"
            style={{
              background: `radial-gradient(circle at 50% 100%, ${glowColor} 0%, transparent 70%)`,
            }}
          />
        )}

        {/* ====================================================================
            TOP ROW: Full-Width Interactive Waveform Scrubber with A-B Loop Region
            ==================================================================== */}
        <div className="w-full pointer-events-auto" style={{ height: 'var(--waveform-height)' }}>
          <WaveformScrubber
            waveformData={waveformData}
            currentTime={displayedTime}
            duration={duration}
            onSeek={seek}
            loading={waveformLoading}
            className="min-w-0 flex-1 h-full"
            height={40}
            abLoop={abLoop}
            onAbLoopChange={setAbLoop}
          />
          <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-tertiary select-none gap-2 mt-1">
            <span>{formatTime(displayedTime)}</span>
            <span>{duration > 0 ? `-${formatTime(Math.max(0, duration - displayedTime))}` : '0:00'}</span>
          </div>
        </div>

        {/* ====================================================================
            BOTTOM ROW: Studio Transport Bar on solid black background
            ==================================================================== */}
        <div className="flex items-center justify-between gap-4 w-full pointer-events-auto">
          {/* Left: Context Title + View Density Pills */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {currentTrack && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0">
                  <ArtworkImage
                    item={currentTrack}
                    src={getArtworkUrl(currentTrack)}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                    fallbackIconClassName="w-3 h-3 text-tertiary"
                  />
                </div>
                <div className="min-w-0 hidden sm:block">
                  <div className="text-xs font-semibold text-white truncate" title={currentTrack.title}>
                    {currentTrack.title}
                  </div>
                  <div className="text-[10px] text-tertiary truncate" title={currentTrack.artists?.map((a) => a.name).join(', ')}>
                    {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                  </div>
                </div>
              </div>
            )}

            {/* View Density Quick Pills */}
            <div className="flex items-center gap-1 hidden sm:flex" role="group" aria-label="View density">
              <button
                aria-label="Minimize view"
                title="Minimize"
                className="w-8 h-8 rounded-full glass-pill flex items-center justify-center transition-all text-tertiary hover:text-white"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => usePlayerStore.getState().setPlayerExpanded(false)}
                aria-label="Player view"
                title="Player"
                className="w-8 h-8 rounded-full glass-pill flex items-center justify-center transition-all text-tertiary hover:text-white"
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => usePlayerStore.getState().toggleLyrics()}
                aria-label="Lyrics view"
                title="Lyrics"
                className={`w-8 h-8 rounded-full glass-pill flex items-center justify-center transition-all ${isLyricsOpen ? 'bg-white/15 text-white ring-1 ring-white/20' : 'text-tertiary hover:text-white'}`}
              >
                <Mic2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center: Studio Transport Controls */}
          <div className="flex flex-col items-center gap-1 flex-1 max-w-2xl pointer-events-auto">
            {/* Transport Controls Row */}
            <div className="flex items-center gap-2">
              {/* Shuffle */}
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={cycleShuffleMode}
                aria-label={`Shuffle: ${shuffleMode}`}
                title={
                  shuffleMode === 'smart' ? 'Smart Shuffle: Active' :
                  shuffleMode === 'standard' ? 'Standard Shuffle' : 'Shuffle Off'
                }
                className={`control-btn transition-all ${shuffleMode === 'smart' ? 'bg-white/15 text-white ring-1 ring-white/30 shadow-sm' : shuffleMode === 'standard' ? 'bg-white/10 text-white' : 'text-tertiary hover:text-white'}`}
              >
                {shuffleMode === 'smart' ? (
                  <Sparkles className="w-4 h-4 text-white" />
                ) : (
                  <Shuffle className="w-4 h-4" />
                )}
              </motion.button>

              {/* -10s */}
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={() => seek(Math.max(0, currentTime - 10))}
                aria-label="Seek backward 10 seconds"
                className="control-btn"
              >
                <ChevronLeft className="w-4 h-4 fill-current" />
              </motion.button>

              {/* Previous */}
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={previous}
                aria-label="Previous track"
                className="control-btn"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </motion.button>

              {/* Magnetic Play/Pause Button */}
              <Magnet padding={35} magnetStrength={0.35}>
                <motion.button
                  whileHover={playButtonHover}
                  whileTap={playButtonTap}
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="control-btn-primary"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isBuffering ? (
                      <motion.div key="loader" variants={iconCrossfadeVariants} initial="initial" animate="animate" exit="exit">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#050507' }} />
                      </motion.div>
                    ) : isPlaying ? (
                      <motion.div key="pause" variants={iconCrossfadeVariants} initial="initial" animate="animate" exit="exit">
                        <Pause className="w-6 h-6 fill-current" style={{ color: '#050507' }} />
                      </motion.div>
                    ) : (
                      <motion.div key="play" variants={iconCrossfadeVariants} initial="initial" animate="animate" exit="exit">
                        <Play className="w-6 h-6 fill-current translate-x-0.5" style={{ color: '#050507' }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </Magnet>

              {/* Next */}
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={next}
                aria-label="Next track"
                className="control-btn"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </motion.button>

              {/* +10s */}
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={() => seek(Math.min(duration, currentTime + 10))}
                aria-label="Seek forward 10 seconds"
                className="control-btn"
              >
                <ChevronRight className="w-4 h-4 fill-current" />
              </motion.button>

              {/* Repeat */}
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={toggleRepeat}
                aria-label={`Repeat: ${repeatMode}`}
                title={`Repeat: ${repeatMode}`}
                className={`control-btn transition-all ${repeatMode !== 'off' ? 'bg-white/10 text-white ring-1 ring-white/25 shadow-sm' : 'text-tertiary hover:text-white'}`}
              >
                {repeatMode === 'track' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </motion.button>
            </div>
          </div>

          {/* Right: EQ/DSP Badge, Volume, Stealth/GPU Status */}
          <div className="flex items-center justify-end gap-2 min-w-0 shrink-0 pointer-events-auto">
            {/* EQ / DSP Toggle Badge */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={toggleEqualizer}
              aria-label="Equalizer"
              title="10-Band Parametric Equalizer"
              className="control-btn hidden sm:inline-flex"
            >
              <Sparkles className="w-4 h-4 text-tertiary" />
            </motion.button>

            {/* Spatial Audio */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={toggleSpatialAudio}
              aria-label="Spatial Audio"
              title="Spatial Audio — saved preference (unavailable for YouTube streams)"
              className={`control-btn transition-all ${spatialAudio ? 'bg-white/15 text-white ring-1 ring-white/25' : ''}`}
            >
              <Headphones className="w-4 h-4" style={{ color: spatialAudio ? 'rgb(var(--accent-primary-rgb))' : 'rgba(255,255,255,0.7)' }} />
            </motion.button>

            {/* Volume Control */}
            <div className="hidden lg:flex items-center gap-2 ml-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="control-btn"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-neutral-500" /> : volume < 50 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </motion.button>
              <input
                type="range"
                min="0"
                max="100"
                value={currentVolume}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={currentVolume}
                aria-valuetext={`${currentVolume}% volume`}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume Slider"
                className="slider"
                style={{
                  width: '100px',
                  maxWidth: '100px',
                }}
              />
            </div>

            {/* Playback Speed */}
            <div className="hidden lg:flex items-center gap-1.5 ml-1">
              <span className="glass-pill px-3 py-1 text-[10px] font-mono tabular-nums text-tertiary">
                {playbackSpeed}x
              </span>
            </div>

            {/* Visual Quality Toggle */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={() => useUIStore.getState().setVisualQuality(visualQuality === 'high' ? 'medium' : visualQuality === 'medium' ? 'low' : 'high')}
              aria-label="Visual Quality"
              title={`Visual Quality: ${visualQuality}`}
              className="control-btn hidden sm:inline-flex"
            >
              <Sparkles className="w-4 h-4 text-tertiary" />
            </motion.button>

            {/* Stealth / GPU Status Pill */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-pill text-[10px] font-mono text-tertiary transition-all"
              style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>GPU</span>
            </span>

            {/* Fullscreen Expand */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={togglePlayerExpanded}
              aria-label="Expand Fullscreen Player"
              title="Expand Fullscreen (F)"
              className="control-btn ml-1"
            >
              <Maximize2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SleepTimerModal
        isOpen={sleepTimerModalOpen}
        onClose={() => setSleepTimerModalOpen(false)}
      />
      <AddToPlaylistModal
        track={currentTrack}
        isOpen={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
      />
    </>
  );
};