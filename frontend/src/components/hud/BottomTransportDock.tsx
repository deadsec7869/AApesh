import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Heart, Plus, Moon, Maximize2,
  Loader2, Sparkles, Headphones,
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

/**
 * Bottom Transport Dock - Floating Glass Pill (84px)
 *
 * Left: Mini artwork + title/artist + ♥ like toggle
 * Center: Precision transport (Shuffle, Prev, Play/Pause, Next, Repeat) + Waveform Scrubber
 * Right: Volume slider, Playback speed, EQ, Fullscreen expand
 */

export const BottomTransportDock: React.FC<BottomTransportDockProps> = ({ className = '' }) => {
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
    isPlayerExpanded,
    togglePlayerExpanded,
    toggleQualityModal,
    getEffectiveQualityInfo,
    setBottomPlayerDimensions,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const { toggleOpen: toggleEqualizer, spatialAudio, toggleSpatialAudio, playbackSpeed } = useAudioDSPStore();
  const { visualQuality } = useUIStore();

  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [sleepTimerModalOpen, setSleepTimerModalOpen] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [waveformLoading, setWaveformLoading] = useState(false);

  const footerRef = React.useRef<HTMLElement>(null);

  // Fetch waveform data when track changes
  useEffect(() => {
    if (!currentTrack) {
      setWaveformData(null);
      return;
    }
    setWaveformLoading(true);
    // In a real implementation, this would fetch from an API
    // For now, generate synthetic waveform
    const synthetic = Array.from({ length: 256 }, (_, i) => {
      const t = i / 255;
      const envelope = Math.sin(t * Math.PI) * (0.3 + 0.7 * Math.random());
      return Math.max(0, Math.min(1, envelope));
    });
    setWaveformData(synthetic);
    setWaveformLoading(false);
  }, [currentTrack?.videoId]);

  // Measure actual rendered BottomPlayer height and calculate dynamic bottom clearance
  useEffect(() => {
    const updateDimensions = () => {
      const el = footerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const height = Math.round(rect.height);
      const occupiedBottomSpace = Math.max(0, window.innerHeight - rect.top);
      const breathingMargin = 32;
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

  // Never render BottomTransportDock when Fullscreen Player is active
  if (isPlayerExpanded) {
    return null;
  }

  // Empty State
  if (!currentTrack) {
    return (
      <footer
        ref={footerRef}
        aria-label="Audio Player Standby"
        className={`playback-dock !fixed bottom-[4.5rem] md:bottom-4 inset-x-0 mx-auto w-[calc(100%-2rem)] md:w-[60%] max-w-2xl h-14 z-40 px-4 md:px-6 flex items-center justify-between pointer-events-auto transition-all duration-300 select-none ${className}`}
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
        aria-label="Floating Audio Player"
        className={`playback-dock h-16 xl:h-[84px] !fixed bottom-[4.5rem] md:bottom-4 inset-x-0 mx-auto w-[calc(100%-2rem)] md:w-[90%] max-w-7xl z-50 px-4 md:px-8 flex items-center justify-between transition-all duration-300 pointer-events-auto select-none gap-4 md:gap-6 ${className}`}
      >
        {/* Ambient Artwork Glow */}
        {atmospherePalette && (
          <div
            className="absolute -inset-1 rounded-full opacity-20 blur-2xl pointer-events-none -z-10 transition-all duration-700"
            style={{
              background: `radial-gradient(circle at 50% 100%, ${glowColor} 0%, transparent 70%)`,
            }}
          />
        )}

        {/* ====================================================================
            LEFT: Mini Artwork + Title/Artist + Like Button
            ==================================================================== */}
        <div className="glass-interactive flex items-center gap-3 min-w-0 flex-1 xl:flex-initial px-2 py-1 rounded-xl max-w-[240px]">
          <button
            onClick={togglePlayerExpanded}
            className="flex items-center gap-3 p-1 rounded-xl transition-all cursor-pointer min-w-0 flex-1 text-left"
            aria-label="Expand to fullscreen player"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden bg-neutral-900 shrink-0 shadow-sm"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
            >
              <ArtworkImage
                item={currentTrack}
                src={getArtworkUrl(currentTrack)}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                fallbackIconClassName="w-4 h-4 text-tertiary"
              />
            </div>
            <div className="min-w-0 flex-1 pr-2">
              <div className="font-semibold text-xs text-white truncate" title={currentTrack.title}>
                {currentTrack.title}
              </div>
              <div className="text-[10px] text-tertiary truncate mt-0.5" title={currentTrack.artists?.map((a) => a.name).join(', ')}>
                {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
              </div>
            </div>
          </button>

          {/* Like Button */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={() => toggleLike(currentTrack)}
            aria-label={liked ? 'Unlike track' : 'Like track'}
            title={liked ? 'Liked' : 'Like'}
            className="glass-pill w-9 h-9 hidden sm:flex items-center justify-center shrink-0 transition-all"
          >
            <Heart className={`w-4 h-4 transition-all ${liked ? 'fill-current text-rose-500' : 'text-tertiary'}`} />
          </motion.button>
        </div>

        {/* ====================================================================
            CENTER: Transport Controls + Waveform Scrubber
            ==================================================================== */}
        <div className="flex flex-col items-center gap-0 xl:flex-1 min-w-0 max-w-4xl">
          {/* Transport Controls Row */}
          <div className="flex items-center gap-2 sm:gap-3">
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
              className={`control-btn transition-all ${
                shuffleMode === 'smart' ? 'bg-white/15 text-white ring-1 ring-white/25 shadow-sm' :
                shuffleMode === 'standard' ? 'bg-white/10 text-white' :
                'text-tertiary hover:text-white'
              }`}
            >
              {shuffleMode === 'smart' ? (
                <Sparkles className="w-4 h-4 text-white" />
              ) : (
                <Shuffle className="w-4 h-4" />
              )}
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

            {/* Repeat */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={toggleRepeat}
              aria-label={`Repeat: ${repeatMode}`}
              title={`Repeat: ${repeatMode}`}
              className={`control-btn transition-all ${
                repeatMode !== 'off' ? 'bg-white/10 text-white ring-1 ring-white/25 shadow-sm' : 'text-tertiary hover:text-white'
              }`}
            >
              {repeatMode === 'track' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </motion.button>
          </div>

          {/* Waveform Scrubber */}
          <div className="hidden xl:flex items-center gap-2 w-full max-w-2xl">
            <WaveformScrubber
              waveformData={waveformData}
              currentTime={displayedTime}
              duration={duration}
              onSeek={seek}
              loading={waveformLoading}
              className="min-w-0 flex-1"
              height={18}
            />
            <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-tertiary select-none gap-2">
              <span>{formatTime(displayedTime)}</span>
              <span>{duration > 0 ? `-${formatTime(Math.max(0, duration - displayedTime))}` : '0:00'}</span>
            </div>
          </div>
        </div>

        {/* ====================================================================
            RIGHT: Volume, Speed, EQ, Fullscreen
            ==================================================================== */}
        <div className="flex items-center justify-end gap-2 min-w-0 shrink-0 max-xl:contents max-xl:[&>button]:hidden">
          {error && (
            <span role="alert" title={error} className="absolute bottom-full right-3 mb-1 px-3 py-2 rounded-lg text-xs max-w-xs"
              style={{
                background: 'rgba(10, 10, 13, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 100, 100, 0.9)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              {error}
            </span>
          )}

          {/* Spatial Audio */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleSpatialAudio}
            aria-label="Spatial Audio"
            title="Spatial Audio — saved preference (unavailable for YouTube streams)"
            className={`control-btn transition-all ${
              spatialAudio ? 'bg-white/15 text-white ring-1 ring-white/25' : ''
            }`}
          >
            <Headphones className="w-4 h-4" style={{ color: spatialAudio ? 'rgb(var(--accent-primary-rgb))' : 'rgba(255,255,255,0.7)' }} />
          </motion.button>

          {/* Lyrics */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleLyrics}
            aria-label="Lyrics"
            title="Synced Lyrics"
            className={`control-btn transition-all ${
              isLyricsOpen ? 'bg-white/15 text-white ring-1 ring-white/20' : ''
            }`}
          >
            <Sparkles className="w-4 h-4" style={{ color: isLyricsOpen ? 'rgb(var(--accent-primary-rgb))' : 'rgba(255,255,255,0.7)' }} />
          </motion.button>

          {/* Queue */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleQueue}
            aria-label="Queue"
            title="Play Queue"
            className={`control-btn transition-all ${
              isQueueOpen ? 'bg-white/15 text-white ring-1 ring-white/20' : ''
            }`}
          >
            <Sparkles className="w-4 h-4" style={{ color: isQueueOpen ? 'rgb(var(--accent-primary-rgb))' : 'rgba(255,255,255,0.7)' }} />
          </motion.button>

          {/* About */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleAbout}
            aria-label="About This Song"
            title="About This Song (Credits & Metadata)"
            className={`control-btn transition-all ${
              isAboutOpen ? 'bg-white/15 text-white ring-1 ring-white/20' : ''
            }`}
          >
            <Sparkles className="w-4 h-4" style={{ color: isAboutOpen ? 'rgb(var(--accent-primary-rgb))' : 'rgba(255,255,255,0.7)' }} />
          </motion.button>

          {/* Equalizer */}
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

          {/* Video Dock */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleVideoDock}
            aria-label="Video Player Dock"
            title="Toggle Official Video"
            className={`control-btn transition-all hidden sm:inline-flex ${
              isVideoDockOpen ? 'bg-white/15 text-white ring-1 ring-white/20' : ''
            }`}
          >
            <Moon className="w-4 h-4" style={{ color: isVideoDockOpen ? 'rgb(var(--accent-primary-rgb))' : 'rgba(255,255,255,0.7)' }} />
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