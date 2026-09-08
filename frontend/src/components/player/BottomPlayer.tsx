import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  ListMusic,
  Mic2,
  Heart,
  Loader2,
  Tv,
  Music,
  Sparkles,
  SlidersHorizontal,
  Headphones,
  Activity,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useEqualizerStore } from '@/stores/useEqualizerStore';
import { formatTime } from '@/lib/utils';
import { AddToPlaylistModal } from '@/components/common/AddToPlaylistModal';
import { SleepTimerModal } from '@/components/common/SleepTimerModal';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { api } from '@/api/client';
import {
  iconCrossfadeVariants,
  controlButtonHover,
  controlButtonTap,
  playButtonHover,
  playButtonTap,
} from '@/lib/motion';

export const BottomPlayer: React.FC = () => {
  const {
    currentTrack,
    atmospherePalette,
    isPlaying,
    isBuffering,
    playbackStatus,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    shuffleMode,
    isQueueOpen,
    isLyricsOpen,
    isVideoDockOpen,
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
    toggleVideoDock,
    togglePlayerExpanded,
    toggleQualityModal,
    getEffectiveQualityInfo,
    setBottomPlayerDimensions,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const { toggleOpen: toggleEqualizer, spatialAudio, toggleSpatialAudio } = useEqualizerStore();

  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [sleepTimerModalOpen, setSleepTimerModalOpen] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  const footerRef = React.useRef<HTMLElement>(null);

  // Measure actual rendered BottomPlayer height and calculate dynamic bottom clearance
  React.useEffect(() => {
    const updateDimensions = () => {
      const el = footerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const height = Math.round(rect.height);
      // Actual occupied space from bottom of viewport to the top of BottomPlayer
      const occupiedBottomSpace = Math.max(0, window.innerHeight - rect.top);
      // Small visual breathing margin (32px)
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

  // Minimal Empty State when no track is active
  if (!currentTrack) {
    return (
      <footer
        ref={footerRef}
        aria-label="Audio Player Standby"
        className="fixed bottom-4 md:bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] md:w-[68%] max-w-5xl h-14 md:h-16 z-40 bg-[#0e1117]/85 backdrop-blur-2xl rounded-[22px] border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.75)] px-4 md:px-6 flex items-center justify-between pointer-events-auto transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-neutral-300 shadow-sm">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold tracking-wide text-white">AAPESH Workstation</div>
            <div className="text-[10px] sm:text-[11px] text-neutral-400">Spatial sound engine ready • Select any track to start</div>
          </div>
        </div>

        <button
          onClick={() => {
            api
              .getRecommendations(8)
              .then((recs) => {
                if (recs && recs.length > 0) {
                  playTrack(recs[0], recs);
                }
              })
              .catch(() => {});
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full btn-play-aapesh font-bold text-xs transition-all duration-200 ease-out-expo shadow-md hover:scale-105 active:scale-95 text-black"
        >
          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5 text-black" />
          <span>Quick Play</span>
        </button>
      </footer>
    );
  }

  const liked = isLiked(currentTrack.videoId);
  const displayedTime = scrubValue !== null ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (displayedTime / duration) * 100 : 0;
  const currentVolume = isMuted ? 0 : volume;
  const qualityInfo = getEffectiveQualityInfo();

  return (
    <>
      <footer
        ref={footerRef}
        aria-label="Floating Audio Player"
        className="fixed bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] md:w-[76%] max-w-5xl h-20 md:h-[76px] z-40 bg-[#0d1016]/90 backdrop-blur-2xl rounded-[24px] border border-white/[0.09] shadow-[0_24px_64px_rgba(0,0,0,0.85)] px-3 md:px-5 flex items-center justify-between transition-all duration-300 pointer-events-auto select-none gap-2 md:gap-4"
      >
        {/* Subtle Ambient Artwork Glow */}
        {atmospherePalette && (
          <div
            className="absolute -inset-1 rounded-[24px] opacity-25 blur-2xl pointer-events-none -z-10 transition-all duration-700"
            style={{
              background: `radial-gradient(circle at 50% 100%, ${atmospherePalette.glow} 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Ambient Top Glow Progress Accent */}
        <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full bg-white/[0.05] overflow-hidden pointer-events-none">
          <div
            className="h-full bg-white/40 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ====================================================================
            LEFT: Artwork Thumbnail + Track Title + Artist + Like Button
            ==================================================================== */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 max-w-[180px] sm:max-w-[220px] lg:max-w-[260px] shrink-0">
          <motion.div
            onClick={togglePlayerExpanded}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative w-10 h-10 md:w-11 md:h-11 rounded-xl overflow-hidden bg-charcoal-800 shadow-md shrink-0 cursor-pointer border border-white/10"
            title="Expand player view"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack.videoId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                <ArtworkImage
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                  fallbackIconClassName="w-4 h-4 text-neutral-400"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack.videoId}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.18 }}
              >
                <div
                  onClick={togglePlayerExpanded}
                  className="font-bold text-xs sm:text-sm text-white truncate cursor-pointer hover:underline"
                  title={currentTrack.title}
                >
                  {currentTrack.title}
                </div>
                <div
                  className="text-[11px] text-neutral-400 truncate mt-0.5 flex items-center gap-1.5"
                  title={currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                >
                  <span className="truncate">{currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}</span>
                  {playbackStatus === 'prebuffering' && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-mono shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Preparing audio…
                    </span>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={() => toggleLike(currentTrack)}
            aria-label={liked ? 'Unlike track' : 'Like track'}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                liked ? 'text-rose-500 fill-current' : 'text-neutral-400'
              }`}
            />
          </motion.button>
        </div>

        {/* ====================================================================
            CENTER: Transport Controls + Integrated Scrubber
            ==================================================================== */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-md px-1 sm:px-3 min-w-0">
          {/* Top transport buttons row */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Shuffle */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={cycleShuffleMode}
              aria-label={`Shuffle: ${shuffleMode}`}
              title={
                shuffleMode === 'smart'
                  ? 'Smart Shuffle: Active'
                  : shuffleMode === 'standard'
                  ? 'Standard Shuffle'
                  : 'Shuffle Off'
              }
              className={`p-1.5 rounded-full transition-all ${
                shuffleMode === 'smart'
                  ? 'text-white bg-white/20 ring-1 ring-white/30 shadow-sm'
                  : shuffleMode === 'standard'
                  ? 'text-white bg-white/15'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {shuffleMode === 'smart' ? (
                <Sparkles className="w-3.5 h-3.5 text-white" />
              ) : (
                <Shuffle className="w-3.5 h-3.5" />
              )}
            </motion.button>

            {/* Previous Track */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={previous}
              aria-label="Previous Track"
              className="p-1.5 text-neutral-300 hover:text-white transition-colors"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </motion.button>

            {/* Focal Play/Pause Button */}
            <motion.button
              whileHover={playButtonHover}
              whileTap={playButtonTap}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="btn-play-aapesh w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-lg transition-transform"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isBuffering ? (
                  <motion.div
                    key="loader"
                    variants={iconCrossfadeVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  </motion.div>
                ) : isPlaying ? (
                  <motion.div
                    key="pause"
                    variants={iconCrossfadeVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Pause className="w-4 h-4 fill-current text-black" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    variants={iconCrossfadeVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Next Track */}
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={next}
              aria-label="Next Track"
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
                repeatMode !== 'off'
                  ? 'text-white bg-white/20 ring-1 ring-white/30 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {repeatMode === 'track' ? (
                <Repeat1 className="w-3.5 h-3.5" />
              ) : (
                <Repeat className="w-3.5 h-3.5" />
              )}
            </motion.button>
          </div>

          {/* Integrated Scrubber Bar with Time Stamps */}
          <div className="flex items-center gap-2 w-full mt-1">
            <span className="text-[10px] tabular-nums font-mono text-neutral-400 w-7 text-right select-none shrink-0">
              {formatTime(displayedTime)}
            </span>
            <div className="relative flex-1 flex items-center min-w-0">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={displayedTime}
                onPointerDown={() => setScrubValue(currentTime)}
                onChange={(e) => setScrubValue(Number(e.target.value))}
                onPointerUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  seek(val);
                  setScrubValue(null);
                }}
                onKeyUp={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    const val = Number((e.target as HTMLInputElement).value);
                    seek(val);
                    setScrubValue(null);
                  }
                }}
                aria-label="Seek Progress Bar"
                className="scrubber-slider-aapesh w-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255, 255, 255, 0.12) ${progressPercent}%)`,
                }}
              />
            </div>
            <span className="text-[10px] tabular-nums font-mono text-neutral-400 w-7 text-left select-none shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* ====================================================================
            RIGHT: Utilities (Spatial Audio, Synced Lyrics, Queue, VideoDock, EQ, Volume, Fullscreen)
            ==================================================================== */}
        <div className="flex items-center justify-end gap-1 sm:gap-1.5 shrink-0">
          {/* Streaming Quality Badge */}
          {qualityInfo && (
            <motion.button
              whileHover={controlButtonHover}
              whileTap={controlButtonTap}
              onClick={toggleQualityModal}
              aria-label="Streaming Quality"
              title={`Streaming Quality: ${qualityInfo.statusLabel} (${qualityInfo.providerName})`}
              className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-white/[0.04] hover:bg-white/10 text-neutral-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
            >
              <Activity className="w-3 h-3 text-neutral-400" />
              <span>{qualityInfo.shortBadge}</span>
            </motion.button>
          )}

          {/* Spatial Audio Pill */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleSpatialAudio}
            aria-label="Spatial Audio"
            title="Spatial Sound DSP"
            className={`hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all ${
              spatialAudio
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="w-1 h-1 rounded-full bg-rose-500" />
          </motion.button>

          {/* Lyrics Button */}
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
            <Mic2 className="w-4 h-4" />
          </motion.button>

          {/* Queue Button */}
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
            <ListMusic className="w-4 h-4" />
          </motion.button>

          {/* VideoDock Toggle */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleVideoDock}
            aria-label="Video Dock"
            title="Toggle Video Dock"
            className={`p-1.5 rounded-full transition-colors ${
              isVideoDockOpen
                ? 'text-white bg-white/20 ring-1 ring-white/25'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tv className="w-4 h-4" />
          </motion.button>

          {/* Equalizer Modal Trigger */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={toggleEqualizer}
            aria-label="Equalizer"
            title="10-Band Graphic Equalizer"
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors hidden sm:inline-flex"
          >
            <SlidersHorizontal className="w-4 h-4 text-rose-500" />
          </motion.button>

          {/* Volume Control */}
          <div className="hidden lg:flex items-center gap-1.5 ml-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-neutral-500" />
              ) : volume < 50 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </motion.button>
            <input
              type="range"
              min="0"
              max="100"
              value={currentVolume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume Slider"
              className="scrubber-slider-aapesh w-16"
              style={{
                background: `linear-gradient(to right, #ffffff ${currentVolume}%, rgba(255, 255, 255, 0.12) ${currentVolume}%)`,
              }}
            />
          </div>

          {/* Fullscreen Expand */}
          <motion.button
            whileHover={controlButtonHover}
            whileTap={controlButtonTap}
            onClick={togglePlayerExpanded}
            aria-label="Expand Fullscreen Player"
            title="Expand Fullscreen"
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors ml-0.5"
          >
            <Maximize2 className="w-4 h-4" />
          </motion.button>
        </div>
      </footer>

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        track={currentTrack}
        isOpen={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={sleepTimerModalOpen}
        onClose={() => setSleepTimerModalOpen(false)}
      />
    </>
  );
};
