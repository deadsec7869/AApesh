import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Plus,
  Volume2,
  VolumeX,
  Volume1,
  Mic2,
  ListMusic,
  Share2,
  Loader2,
  Sparkles,
  Tv,
  ArrowUp,
  Trash2,
  Infinity as InfinityIcon,
  RotateCcw,
  SlidersHorizontal,
  Headphones,
  Disc,
  Activity,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useEqualizerStore } from '@/stores/useEqualizerStore';
import { useSyncedLyrics } from '@/hooks/useSyncedLyrics';
import { formatTime } from '@/lib/utils';
import { api } from '@/api/client';
import { LyricsResponse } from '@/types/music';
import { getLineDirection, getLineFontClass } from '@/utils/unicodeScript';
import { LyricsCalibrationToolbar } from './LyricsCalibrationToolbar';
import { LyricsSyncDiagnostics } from './LyricsSyncDiagnostics';
import { SyncedLineWords } from './SyncedLineWords';
import { SleepTimerModal } from '@/components/common/SleepTimerModal';
import { AddToPlaylistModal } from '@/components/common/AddToPlaylistModal';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { BlurText } from '@/components/react-bits';
import { getArtworkUrl } from '@/utils/artwork';
import {
  iconCrossfadeVariants,
  controlButtonHover,
  controlButtonTap,
  playButtonHover,
  playButtonTap,
  springGentle,
  transitionSmooth,
} from '@/lib/motion';

export const FullScreenPlayer: React.FC = () => {
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
    queue,
    currentIndex,
    autoplayEnabled,
    toggleAutoplay,
    removeFromQueue,
    moveQueueItem,
    isPlayerExpanded,
    togglePlayerExpanded,
    setPlayerExpanded,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    cycleShuffleMode,
    toggleRepeat,
    playTrack,
    fullscreenTab,
    setFullscreenTab,
    toggleQualityModal,
    getEffectiveQualityInfo,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const currentArtworkUrl = getArtworkUrl(currentTrack);
  const {
    toggleOpen: toggleEqualizer,
    spatialAudio,
    toggleSpatialAudio,
  } = useEqualizerStore();

  const activeTab = fullscreenTab;
  const setActiveTab = setFullscreenTab;
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [translationMode, setTranslationMode] = useState<'original' | 'dual' | 'translation'>('original');
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [sleepTimerModalOpen, setSleepTimerModalOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [shareToast, setShareToast] = useState(false);

  const displayedTime = scrubValue !== null ? scrubValue : currentTime;
  const qualityInfo = getEffectiveQualityInfo();

  // Synchronized Lyrics Engine
  const {
    activeLineIndex,
    lineProgress,
    seekToLine,
    containerRef: lyricsContainerRef,
    setLineRef: setLyricsLineRef,
    isAutoFollowPaused,
    resumeAutoFollow,
    handleUserScroll,
    lyricsOffsetMs,
    adjustLyricsOffsetMs,
    resetLyricsOffset,
    highResTimeMs,
    effectiveTimeMs,
    currentLineTimestamp,
    activeLyricText,
    activeWordText,
    activeWordProgress,
    activeCharProgress,
    timingLevel,
    isWordEstimated,
    provider,
    syncConfidence,
    durationDifference,
  } = useSyncedLyrics({
    lyrics: lyricsData,
    currentTime,
    isPlaying,
    isActive: isPlayerExpanded,
  });

  // Global shortcut for diagnostics HUD (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setIsDiagnosticsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlayerExpanded) {
        setPlayerExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayerExpanded, setPlayerExpanded]);

  // Fetch lyrics with cancellation
  const fetchLyrics = useCallback((videoId: string) => {
    const controller = new AbortController();
    setLyricsLoading(true);
    setLyricsError(null);
    setLyricsData(null);

    api
      .getLyrics(videoId)
      .then((data) => {
        if (!controller.signal.aborted) {
          setLyricsData(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('Lyrics fetch failed:', err);
          setLyricsError('Failed to load lyrics');
          setLyricsData({
            videoId,
            synced: false,
            hasLyrics: false,
            lines: [],
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLyricsLoading(false);
        }
      });

    return controller;
  }, []);

  useEffect(() => {
    if (!currentTrack) return;
    const controller = fetchLyrics(currentTrack.videoId);
    return () => {
      controller.abort();
    };
  }, [currentTrack?.videoId, fetchLyrics]);

  if (!isPlayerExpanded || !currentTrack) {
    return null;
  }

  const liked = isLiked(currentTrack.videoId);
  const progressPercent = duration > 0 ? (displayedTime / duration) * 100 : 0;
  const currentVolume = isMuted ? 0 : volume;
  const upNextTracks = queue.slice(currentIndex + 1);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/song/${currentTrack.videoId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTrack.title,
          text: `Listening to ${currentTrack.title} on AAPESH`,
          url: shareUrl,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      } catch {
        alert('Link copied to clipboard!');
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 flex flex-col bg-[#050507]/85 backdrop-blur-3xl text-white overflow-hidden select-none font-sans"
      >
        {/* ====================================================================
            LAYER 1 — ENVIRONMENT
            (Atmospheric radial aura, heavy blur, artwork color glow, vignette)
            ==================================================================== */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[950px] max-h-[950px] rounded-full opacity-35 blur-[140px] pointer-events-none transition-all duration-1000 will-change-transform"
          style={{
            background: atmospherePalette?.primary
              ? `radial-gradient(circle, ${atmospherePalette.primary} 0%, transparent 70%)`
              : 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
          }}
        />

        <div
          className="absolute bottom-10 right-10 w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full opacity-25 blur-[150px] pointer-events-none transition-all duration-1000"
          style={{
            background: atmospherePalette?.glow
              ? `radial-gradient(circle, ${atmospherePalette.glow} 0%, transparent 70%)`
              : 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)',
          }}
        />

        {/* Soft background artwork blur fill */}
        {currentArtworkUrl && (
          <div
            className="absolute inset-0 opacity-10 blur-[150px] scale-125 bg-center bg-cover pointer-events-none transition-all duration-1000"
            style={{ backgroundImage: `url(${currentArtworkUrl})` }}
          />
        )}

        {/* Deep Contrast Atmosphere Overlay for Crisp Lyrics Readability */}
        <div className="absolute inset-0 bg-[#07090e]/60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/85 pointer-events-none" />

        {/* ====================================================================
            LAYER 3 — UI: TOP NAVIGATION & UTILITY BAR
            (Collapse on left, floating segmented control center, tools on right)
            ==================================================================== */}
        <header className="relative z-30 flex items-center justify-between px-6 md:px-12 h-20 w-full max-w-7xl mx-auto shrink-0">
          {/* Top-Left: Circular Collapse Control */}
          <button
            onClick={togglePlayerExpanded}
            aria-label="Collapse Fullscreen Player"
            title="Collapse (Esc)"
            className="w-10 h-10 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all shadow-md active:scale-95"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          {/* Top-Center: Floating Translucent Segmented Control: [ Cover | Lyrics | Queue | Video ] */}
          <nav
            aria-label="Fullscreen View Modes"
            className="flex items-center gap-1 p-1 rounded-full bg-black/50 backdrop-blur-2xl border border-white/[0.12] shadow-2xl"
          >
            <button
              onClick={() => setActiveTab('art')}
              aria-label="Cover Art View"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'art'
                  ? 'bg-white/20 text-white border border-white/25 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Cover</span>
            </button>
            <button
              onClick={() => setActiveTab('lyrics')}
              aria-label="Synchronized Lyrics View"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'lyrics'
                  ? 'bg-white/20 text-white border border-white/25 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>Lyrics</span>
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              aria-label="Play Queue View"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'queue'
                  ? 'bg-white/20 text-white border border-white/25 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Queue</span>
            </button>
            <button
              onClick={() => setActiveTab('video')}
              aria-label="Official Video View"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'video'
                  ? 'bg-white/20 text-white border border-white/25 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </nav>

          {/* Top-Right: [ Equalizer ] [ Spatial Audio ] [ Share ] */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 10-Band Pro Equalizer Trigger */}
            <button
              onClick={toggleEqualizer}
              aria-label="Open Pro Graphic Equalizer"
              title="10-Band Graphic Pro Equalizer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/[0.10] text-xs text-neutral-300 hover:text-white transition-all shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-200" />
              <span className="font-semibold">Equalizer</span>
            </button>

            {/* Spatial Audio DSP Pill */}
            <button
              onClick={toggleSpatialAudio}
              aria-label="Toggle Spatial Audio DSP"
              title="Spatial Sound 3D DSP Engine"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all ${
                spatialAudio
                  ? 'bg-white/20 text-white border border-white/40 shadow-[0_0_14px_rgba(255,255,255,0.25)] font-semibold'
                  : 'bg-white/[0.07] hover:bg-white/[0.14] border border-white/[0.10] text-neutral-300 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-white" />
              <span>Spatial Audio</span>
            </button>

            {/* Share Control */}
            <button
              onClick={handleShare}
              aria-label="Share current track"
              title="Share Link"
              className="w-10 h-10 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all shadow-md relative"
            >
              <Share2 className="w-4 h-4" />
              {shareToast && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-white text-black text-[10px] font-bold whitespace-nowrap shadow-lg animate-fade-in">
                  Link Copied!
                </span>
              )}
            </button>
          </div>
        </header>

        {/* ====================================================================
            LAYER 2 — CONTENT: MAIN WORKSTATION CANVAS
            ==================================================================== */}
        <main className="relative z-20 flex-1 flex flex-col justify-center items-center min-h-0 w-full overflow-y-auto px-4 md:px-8 py-2">
          {/* ==================================================================
              MODE 1: COVER / HERO ARTWORK WORKSTATION (Screenshot 2 Match)
              ================================================================== */}
          {activeTab === 'art' && (
            <motion.div
              key={currentTrack.videoId}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center gap-6 w-full max-w-xl mx-auto my-auto"
            >
              {/* Responsive Hero Artwork Card */}
              <div className="relative group shrink-0">
                <motion.div
                  animate={{
                    scale: isPlaying ? [1, 1.018, 1] : 1,
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 6,
                    ease: 'easeInOut',
                  }}
                  className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 max-h-[44vh] aspect-square rounded-[28px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.92)] border border-white/[0.12] bg-[#12141a]"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentTrack.videoId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="w-full h-full"
                    >
                      <ArtworkImage
                        item={currentTrack}
                        src={currentArtworkUrl}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        fallbackIconClassName="w-16 h-16 text-neutral-500"
                      />
                    </motion.div>
                  </AnimatePresence>
                  <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/15 pointer-events-none" />
                </motion.div>

                {/* Ambient Floor Shadow */}
                <div
                  className="absolute -bottom-6 inset-x-6 h-14 rounded-full opacity-35 blur-2xl pointer-events-none -z-10 transition-all duration-700"
                  style={{
                    background: atmospherePalette?.glow
                      ? `radial-gradient(ellipse, ${atmospherePalette.glow} 0%, transparent 70%)`
                      : 'radial-gradient(ellipse, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* ==================================================================
              MODE 2: SYNCHRONIZED LYRICS (Screenshot 1 Match - Centered Cinematic)
              ================================================================== */}
          {activeTab === 'lyrics' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto h-[48vh] sm:h-[52vh] relative"
            >
              {isDiagnosticsOpen && (
                <LyricsSyncDiagnostics
                  highResTimeMs={highResTimeMs}
                  effectiveTimeMs={effectiveTimeMs}
                  currentLineTimestamp={currentLineTimestamp}
                  activeLineIndex={activeLineIndex}
                  activeLyricText={activeLyricText}
                  activeWordText={activeWordText}
                  activeWordProgress={activeWordProgress}
                  activeCharProgress={activeCharProgress}
                  timingLevel={timingLevel}
                  isWordEstimated={isWordEstimated}
                  lyricsOffsetMs={lyricsOffsetMs}
                  provider={provider}
                  syncConfidence={syncConfidence}
                  durationDifference={durationDifference}
                  onClose={() => setIsDiagnosticsOpen(false)}
                />
              )}

              {/* Top Lyrics Calibration / Action Tool */}
              <div className="absolute top-0 right-2 z-30 flex items-center gap-2">
                {lyricsData?.synced && (
                  <button
                    onClick={() => setIsCalibrationOpen((prev) => !prev)}
                    className="p-2 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/10 text-neutral-400 hover:text-white transition-colors"
                    title="Adjust lyrics offset"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Calibration Toolbar */}
              {isCalibrationOpen && lyricsData?.hasLyrics && lyricsData.synced && (
                <div className="absolute top-10 inset-x-4 z-40">
                  <LyricsCalibrationToolbar
                    isOpen={isCalibrationOpen}
                    onToggleOpen={() => setIsCalibrationOpen((prev) => !prev)}
                    lyricsOffsetMs={lyricsOffsetMs}
                    onAdjustOffset={adjustLyricsOffsetMs}
                    onResetOffset={resetLyricsOffset}
                    isDiagnosticsOpen={isDiagnosticsOpen}
                    onToggleDiagnostics={() => setIsDiagnosticsOpen((prev) => !prev)}
                    syncConfidence={syncConfidence}
                  />
                </div>
              )}

              {/* Return to Current Lyric Floating Pill */}
              {isAutoFollowPaused && lyricsData?.synced && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resumeAutoFollow}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#10131b]/95 backdrop-blur-2xl border border-white/20 text-xs font-bold text-white shadow-2xl hover:bg-white/[0.15] transition-all duration-150"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-neutral-300" />
                    <span>AUTO-FOLLOW PAUSED • Follow Current Line</span>
                  </motion.button>
                </motion.div>
              )}

              {/* Scrolling Lyric Lines Stream (Centered) */}
              <div
                ref={lyricsContainerRef}
                onScroll={handleUserScroll}
                className="flex-1 w-full overflow-y-auto pt-4 pb-16 px-4 scroll-smooth select-text text-center"
                style={{
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                }}
              >
                {lyricsLoading ? (
                  <div className="py-16 flex flex-col items-center gap-6 max-w-xl mx-auto w-full animate-pulse">
                    <div className="h-7 w-3/4 bg-white/[0.08] rounded-xl" />
                    <div className="h-9 w-full bg-white/[0.12] rounded-xl" />
                    <div className="h-7 w-4/5 bg-white/[0.08] rounded-xl" />
                    <div className="h-6 w-2/3 bg-white/[0.06] rounded-xl" />
                  </div>
                ) : lyricsError ? (
                  <div className="py-16 text-neutral-400 text-center flex flex-col items-center gap-3">
                    <Mic2 className="w-10 h-10 text-neutral-600 mb-1" />
                    <h3 className="text-base font-semibold text-neutral-200">Couldn't load lyrics</h3>
                    <button
                      onClick={() => fetchLyrics(currentTrack.videoId)}
                      className="mt-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : lyricsData?.hasLyrics ? (
                  <div className="w-full flex flex-col items-center gap-6 sm:gap-7 py-8">
                    {lyricsData.lines.map((line, idx) => {
                      const lineDir = getLineDirection(line.text, line.direction);
                      const fontClass = getLineFontClass(line.text, line.script);

                      if (lyricsData.synced) {
                        const isActive = idx === activeLineIndex;
                        const distance = Math.abs(idx - activeLineIndex);
                        const isNearby = distance <= 2;

                        return (
                          <motion.div
                            key={line.id || idx}
                            ref={(el) => setLyricsLineRef(idx, el as unknown as HTMLDivElement)}
                            onClick={() => seekToLine(idx)}
                            dir={lineDir}
                            aria-current={isActive ? 'true' : undefined}
                            animate={{
                              opacity: isActive ? 1 : isNearby ? 0.65 : 0.35,
                            }}
                            transition={transitionSmooth}
                            className={`cursor-pointer py-1.5 px-4 rounded-xl max-w-2xl text-center ${fontClass} ${
                              isActive
                                ? 'lyric-line-active text-2xl sm:text-3xl lg:text-[32px] leading-snug font-bold'
                                : isNearby
                                ? 'lyric-line-nearby text-lg sm:text-xl lg:text-2xl font-medium'
                                : 'lyric-line-distant text-base sm:text-lg lg:text-xl font-normal'
                            }`}
                          >
                            <SyncedLineWords
                              line={line}
                              nextLineStartTime={lyricsData.lines[idx + 1]?.startTime}
                              currentTimeMs={effectiveTimeMs}
                              isActive={isActive}
                              size="lg"
                              dir={lineDir}
                              translationMode={translationMode}
                              onSeekToWord={seek}
                            />
                          </motion.div>
                        );
                      }

                      return (
                        <div
                          key={line.id || idx}
                          dir={lineDir}
                          className={`text-neutral-300 text-lg sm:text-xl font-normal leading-relaxed max-w-xl py-1.5 text-center ${fontClass}`}
                        >
                          {line.text}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-20 text-neutral-400 text-center flex flex-col items-center gap-3">
                    <Mic2 className="w-10 h-10 text-neutral-600 mb-1" />
                    <h3 className="text-base font-semibold text-neutral-200">Lyrics unavailable</h3>
                    <p className="text-xs text-neutral-500 max-w-xs">No lyrics could be found for this track.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================================
              MODE 3: PLAY QUEUE
              ================================================================== */}
          {activeTab === 'queue' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col h-[48vh] sm:h-[52vh] max-w-2xl mx-auto w-full rounded-[24px] bg-[#14151a]/85 backdrop-blur-2xl border border-white/10 p-5 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-neutral-300" />
                  <span className="font-bold text-sm text-white">Play Queue</span>
                </div>
                <button
                  onClick={toggleAutoplay}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    autoplayEnabled ? 'bg-white text-black shadow-sm' : 'bg-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  <InfinityIcon className="w-3.5 h-3.5" />
                  <span>Autoplay</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pt-3 flex flex-col gap-2">
                {upNextTracks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-500">
                    Queue is empty. Turn on Autoplay to automatically queue music.
                  </div>
                ) : (
                  upNextTracks.map((track, relativeIdx) => {
                    const actualIdx = currentIndex + 1 + relativeIdx;
                    return (
                      <div
                        key={`${track.videoId}-${actualIdx}`}
                        className="group flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors"
                      >
                        <div
                          onClick={() => playTrack(track)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                            <ArtworkImage
                              item={track}
                              src={getArtworkUrl(track)}
                              alt={track.title}
                              className="w-full h-full object-cover"
                              fallbackIconClassName="w-4 h-4 text-neutral-400"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                              {track.title}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate">
                              {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {relativeIdx > 0 && (
                            <button
                              onClick={() => moveQueueItem(actualIdx, actualIdx - 1)}
                              className="p-1 rounded text-neutral-400 hover:text-white"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => removeFromQueue(actualIdx)}
                            className="p-1 rounded text-neutral-400 hover:text-white"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================================
              MODE 4: VIDEO MODE
              ================================================================== */}
          {activeTab === 'video' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1 w-full max-w-4xl mx-auto my-auto pointer-events-none"
            />
          )}

          {/* ==================================================================
              UNIFIED PERSISTENT BOTTOM CONTROLS STACK (Screenshots 1 & 2 Match)
              ================================================================== */}
          <div className="flex flex-col items-center gap-3.5 w-full max-w-xl mx-auto pt-3 pb-2 z-30">
            {/* Track Title + Artist + Like Action Row */}
            <div className="flex items-start justify-between w-full px-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  <BlurText
                    key={currentTrack.videoId}
                    text={currentTrack.title}
                    delay={35}
                    className="truncate"
                  />
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 font-medium truncate mt-0.5">
                  {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                </p>
              </div>

              {/* Action Button (+) */}
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={() => toggleLike(currentTrack)}
                aria-label="Add or Like"
                className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/15 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all shrink-0 ml-3"
              >
                {liked ? <Heart className="w-4 h-4 fill-current text-rose-500" /> : <Plus className="w-4 h-4" />}
              </motion.button>
            </div>

            {/* Precision Scrubber Line with Timestamps */}
            <div className="flex flex-col gap-1 w-full px-2">
              <div className="relative flex items-center w-full py-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={displayedTime}
                  aria-valuemin={0}
                  aria-valuemax={duration || 100}
                  aria-valuenow={Math.round(displayedTime)}
                  aria-valuetext={`${formatTime(displayedTime)} of ${formatTime(duration)}`}
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
                  aria-label="Audio Timeline Scrubber"
                  className="scrubber-slider-aapesh w-full cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%)`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] tabular-nums font-mono text-neutral-400 select-none">
                <span>{formatTime(displayedTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Transport Controls Row: Shuffle, Prev, Solid White Play Button, Next, Repeat */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 w-full">
              {/* Shuffle */}
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={cycleShuffleMode}
                aria-label={`Shuffle: ${shuffleMode}`}
                className={`p-2 rounded-full transition-all ${
                  shuffleMode !== 'off' ? 'text-white bg-white/20' : 'text-neutral-400 hover:text-white'
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
                className="p-2 text-neutral-300 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </motion.button>

              {/* Focal Circular Solid White Play/Pause Button */}
              <motion.button
                whileHover={playButtonHover}
                whileTap={playButtonTap}
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="btn-play-aapesh w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-black shadow-[0_8px_30px_rgba(255,255,255,0.2)] transition-transform"
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
                      <Loader2 className="w-5 h-5 animate-spin text-black" />
                    </motion.div>
                  ) : isPlaying ? (
                    <motion.div
                      key="pause"
                      variants={iconCrossfadeVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <Pause className="w-5 h-5 fill-current text-black" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="play"
                      variants={iconCrossfadeVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <Play className="w-5 h-5 fill-current translate-x-0.5 text-black" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Next */}
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={next}
                aria-label="Next track"
                className="p-2 text-neutral-300 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </motion.button>

              {/* Repeat */}
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={toggleRepeat}
                aria-label={`Repeat: ${repeatMode}`}
                className={`p-2 rounded-full transition-all ${
                  repeatMode !== 'off' ? 'text-white bg-white/20' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {repeatMode === 'track' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </motion.button>
            </div>

            {/* Volume Row with Percentage Readout */}
            <div className="flex items-center justify-center gap-3 w-72 max-w-full px-2">
              <button
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
              </button>
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
                className="scrubber-slider-aapesh flex-1"
                style={{
                  background: `linear-gradient(to right, #ffffff ${currentVolume}%, rgba(255, 255, 255, 0.15) ${currentVolume}%)`,
                }}
              />
              <span className="text-[11px] font-mono text-neutral-400 w-8 text-right select-none">
                {currentVolume}%
              </span>
            </div>

            {/* Volume Boost Preset Pills (Screenshots 1 & 2 Match) */}
            <div className="flex items-center justify-center gap-2 pt-0.5 flex-wrap">
              <button
                onClick={() => setVolume(50)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.05] hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all"
              >
                50%
              </button>
              <button
                onClick={() => setVolume(100)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.05] hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all"
              >
                100%
              </button>
              <button
                onClick={() => setVolume(100)}
                className="px-3.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 transition-all"
              >
                150% Boost
              </button>
              <button
                onClick={() => setVolume(100)}
                className="px-3.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 transition-all"
              >
                200% Max Boost
              </button>
            </div>
          </div>
        </main>

        {/* Minimalist Floating Workstation Status Surface (Lower Left) */}
        <div className="fixed bottom-6 left-6 z-40 hidden md:block">
          <button
            onClick={toggleQualityModal}
            className="rounded-full bg-black/40 backdrop-blur-xl border border-white/[0.08] px-3.5 py-1.5 shadow-xl flex items-center gap-2 opacity-70 hover:opacity-100 hover:border-white/20 transition-all cursor-pointer group text-left"
            title="Configure Streaming Quality"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
            <span className="text-[10px] font-mono font-normal text-neutral-400 group-hover:text-neutral-200 transition-colors">
              AAPESH Engine • {playbackStatus === 'prebuffering' ? 'Preparing audio… • ' : ''}{qualityInfo.statusLabel} {spatialAudio ? '• Spatial DSP 3D' : ''}
            </span>
          </button>
        </div>

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
      </motion.div>
    </AnimatePresence>
  );
};
