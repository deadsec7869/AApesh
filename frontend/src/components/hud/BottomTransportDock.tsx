import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Heart, Plus, Moon, Maximize2,
  Loader2, Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAudioDSPStore } from '@/stores/useAudioDSPStore';
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
 * Bottom Transport Dock - Floating Pill (84px)
 *
 * Left: Mini artwork + title/artist + ♥ like toggle
 * Center: Precision transport (Shuffle, Prev, Magnetic Play/Pause, Next, Repeat) + Waveform Scrubber
 * Right: Volume slider, Playback speed, PiP toggle, Fullscreen expand
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
  const { toggleOpen: toggleEqualizer, spatialAudio, toggleSpatialAudio } = useAudioDSPStore();

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
        className={`fixed bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] md:w-[60%] max-w-2xl h-12 md:h-14 z-40 rounded-full px-4 md:px-6 flex items-center justify-between pointer-events-auto transition-all duration-300 select-none ${className}`}
        style={{
          background: 'rgba(14, 17, 24, 0.85)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.14)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold tracking-wide text-white">Nothing playing</div>
            <div className="text-[10px] sm:text-[11px] text-neutral-400">Select any track to begin</div>
          </div>
        </div>
        <span className="text-[11px] font-mono tracking-wider text-neutral-400 uppercase px-2.5 py-1 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
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
  const glowColor = atmospherePalette?.glow || 'rgba(255, 255, 255, 0.15)';

  return (
    <>
      <footer
        ref={footerRef}
        aria-label="Floating Audio Player"
        className={`fixed bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] md:w-[88%] max-w-6xl h-20 md:h-22 z-40 px-4 md:px-6 flex items-center justify-between transition-all duration-300 pointer-events-auto select-none gap-3 md:gap-5 ${className}`}
        style={{
          background: 'rgba(14, 17, 24, 0.82)',
          backdropFilter: 'blur(32px) saturate(1.7)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '9999px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.14)',
        }}
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
            LEFT: Mini Artwork + Title/Artist + Like Button
            ==================================================================== */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <button
            onClick={togglePlayerExpanded}
            className="flex items-center gap-2.5 p-1 rounded-full transition-all cursor-pointer min-w-0 max-w-[200px] shrink-0"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
            aria-label="Expand to fullscreen player"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden bg-neutral-900 shrink-0 shadow-sm"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
            >
              <ArtworkImage
                item={currentTrack}
                src={getArtworkUrl(currentTrack)}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                fallbackIconClassName="w-3.5 h-3.5 text-neutral-500"
              />
            </div>
            <div className="min-w-0 flex-1 pr-2 hidden sm:block">
              <div className="font-semibold text-xs text-white truncate" title={currentTrack.title}>
                {currentTrack.title}
              </div>
              <div className="text-[10px] text-neutral-400 truncate mt-0.5" title={currentTrack.artists?.map((a) => a.name).join(', ')}>
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
            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors shrink-0"
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current text-rose-500' : ''}`} />
          </motion.button>
        </div>

        {/* ====================================================================
            CENTER: Transport Controls + Waveform Scrubber
            ==================================================================== */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 max-w-3xl">
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
              className={`p-1.5 rounded-full transition-all ${
                shuffleMode === 'smart' ? 'text-white bg-white/20 ring-1 ring-white/30 shadow-sm' :
                shuffleMode === 'standard' ? 'text-white bg-white/15' :
                'text-neutral-400 hover:text-white'
              }`}
            >
              {shuffleMode === 'smart' ? (
                <Sparkles className="w-3.5 h-3.5 text-white" />
              ) : (
                <Shuffle className="w-3.5 h-3.5" />
              )}
            </motion.button>

            {/* Previous */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={previous}
              aria-label="Previous track"
              className="p-1.5 text-neutral-300 hover:text-white transition-colors"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </motion.button>

            {/* Magnetic Play/Pause Button */}
            <Magnet padding={30} magnetStrength={0.3}>
              <motion.button
                whileHover={playButtonHover}
                whileTap={playButtonTap}
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white text-black flex items-center justify-center shadow-[0_4px_24px_rgba(255,255,255,0.3)] transition-transform shrink-0"
                style={{
                  boxShadow: '0 4px 24px rgba(255,255,255,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isBuffering ? (
                    <motion.div key="loader" variants={iconCrossfadeVariants} initial="initial" animate="animate" exit="exit">
                      <Loader2 className="w-5 h-5 animate-spin text-black" />
                    </motion.div>
                  ) : isPlaying ? (
                    <motion.div key="pause" variants={iconCrossfadeVariants} initial="initial" animate="animate" exit="exit">
                      <Pause className="w-5 h-5 fill-current text-black" />
                    </motion.div>
                  ) : (
                    <motion.div key="play" variants={iconCrossfadeVariants} initial="initial" animate="animate" exit="exit">
                      <Play className="w-5 h-5 fill-current translate-x-0.5 text-black" />
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
              className="p-1.5 text-neutral-300 hover:text-white transition-colors"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </motion.button>

            {/* Repeat */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={toggleRepeat}
              aria-label={`Repeat: ${repeatMode}`}
              title={`Repeat: ${repeatMode}`}
              className={`p-1.5 rounded-full transition-all ${
                repeatMode !== 'off' ? 'text-white bg-white/20 ring-1 ring-white/30 shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {repeatMode === 'track' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
            </motion.button>
          </div>

          {/* Waveform Scrubber */}
          <div className="w-full max-w-xl">
            <WaveformScrubber
              waveformData={waveformData}
              currentTime={displayedTime}
              duration={duration}
              onSeek={seek}
              loading={waveformLoading}
              height={40}
            />
            <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-neutral-400 select-none mt-1">
              <span>{formatTime(displayedTime)}</span>
              <span>{duration > 0 ? `-${formatTime(Math.max(0, duration - displayedTime))}` : '0:00'}</span>
            </div>
          </div>
        </div>

        {/* ====================================================================
            RIGHT: Volume, Speed, EQ, Fullscreen
            ==================================================================== */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 min-w-0 shrink-0">
          {error && (
            <span role="alert" title={error} className="absolute bottom-full right-3 mb-1 px-3 py-2 rounded-lg text-xs max-w-xs"
              style={{
                background: 'rgba(14, 17, 24, 0.95)',
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
            className={`p-1.5 rounded-full transition-all ${
              spatialAudio
                ? 'bg-white/20 text-white ring-1 ring-white/30'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Volume2 className="w-4 h-4" />
          </motion.button>

          {/* Lyrics */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleLyrics}
            aria-label="Lyrics"
            title="Synced Lyrics"
            className={`p-1.5 rounded-full transition-colors ${
              isLyricsOpen
                ? 'text-white bg-white/20 ring-1 ring-white/25'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Volume1 className="w-4 h-4" />
          </motion.button>

          {/* Queue */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleQueue}
            aria-label="Queue"
            title="Play Queue"
            className={`p-1.5 rounded-full transition-colors ${
              isQueueOpen
                ? 'text-white bg-white/20 ring-1 ring-white/25'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <VolumeX className="w-4 h-4" />
          </motion.button>

          {/* About */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleAbout}
            aria-label="About This Song"
            title="About This Song (Credits & Metadata)"
            className={`p-1.5 rounded-full transition-colors ${
              isAboutOpen
                ? 'text-white bg-white/20 ring-1 ring-white/25'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Plus className="w-4 h-4" />
          </motion.button>

          {/* Equalizer */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleEqualizer}
            aria-label="Equalizer"
            title="10-Band Graphic Equalizer"
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors hidden sm:inline-flex"
          >
            <Maximize2 className="w-4 h-4" />
          </motion.button>

          {/* Video Dock */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleVideoDock}
            aria-label="Video Player Dock"
            title="Toggle Official Video"
            className={`p-1.5 rounded-full transition-colors hidden sm:inline-flex ${
              isVideoDockOpen
                ? 'text-white bg-white/20 ring-1 ring-white/25'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Moon className="w-4 h-4" />
          </motion.button>

          {/* Volume Control */}
          <div className="hidden lg:flex items-center gap-1.5 ml-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="text-neutral-400 hover:text-white transition-colors p-1"
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
              className="w-16 h-1 appearance-none bg-transparent cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ffffff ${currentVolume}%, rgba(255, 255, 255, 0.12) ${currentVolume}%)`,
                borderRadius: '9999px',
              }}
            />
          </div>

          {/* Playback Speed */}
          <div className="hidden lg:flex items-center gap-1.5 ml-1">
            <span className="text-[10px] font-mono tabular-nums text-neutral-400 px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {useAudioDSPStore.getState().playbackSpeed}x
            </span>
          </div>

          {/* Fullscreen Expand */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={togglePlayerExpanded}
            aria-label="Expand Fullscreen Player"
            title="Expand Fullscreen (F)"
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors ml-1"
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