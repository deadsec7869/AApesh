import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export const FullScreenPlayer: React.FC = () => {
  const {
    currentTrack,
    atmospherePalette,
    isPlaying,
    isBuffering,
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
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const {
    toggleOpen: toggleEqualizer,
    spatialAudio,
    toggleSpatialAudio,
  } = useEqualizerStore();

  const activeTab = fullscreenTab;
  const setActiveTab = setFullscreenTab;
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [sleepTimerModalOpen, setSleepTimerModalOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [isUserScrolledAway, setIsUserScrolledAway] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const displayedTime = scrubValue !== null ? scrubValue : currentTime;

  // Synchronized Lyrics Engine
  const {
    activeLineIndex,
    seekToLine,
    containerRef: lyricsContainerRef,
    setLineRef: setLyricsLineRef,
    lyricsOffsetMs,
    adjustLyricsOffsetMs,
    resetLyricsOffset,
    highResTimeMs,
    effectiveTimeMs,
    currentLineTimestamp,
    activeLyricText,
    provider,
    syncConfidence,
    durationDifference,
  } = useSyncedLyrics({
    lyrics: lyricsData,
    currentTime,
    isPlaying,
  });

  // Track manual scrolling
  const handleLyricsScroll = useCallback(() => {
    const container = lyricsContainerRef.current;
    if (!container || activeLineIndex < 0) return;

    const activeEl = container.querySelector('[aria-current="true"]') as HTMLElement | null;
    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      const distanceFromCenter = Math.abs(
        elRect.top + elRect.height / 2 - (containerRect.top + containerRect.height / 2)
      );

      if (distanceFromCenter > 160) {
        setIsUserScrolledAway(true);
      } else {
        setIsUserScrolledAway(false);
      }
    }
  }, [activeLineIndex, lyricsContainerRef]);

  const scrollToCurrentLyric = useCallback(() => {
    const container = lyricsContainerRef.current;
    if (!container || activeLineIndex < 0) return;

    const activeEl = container.querySelector('[aria-current="true"]') as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsUserScrolledAway(false);
    }
  }, [activeLineIndex, lyricsContainerRef]);

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
  useEffect(() => {
    if (!currentTrack) return;

    const controller = new AbortController();
    setLyricsLoading(true);
    setLyricsData(null);
    setIsUserScrolledAway(false);

    api
      .getLyrics(currentTrack.videoId)
      .then((data) => {
        if (!controller.signal.aborted) {
          setLyricsData(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('Lyrics fetch failed:', err);
          setLyricsData({
            videoId: currentTrack.videoId,
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

    return () => {
      controller.abort();
    };
  }, [currentTrack?.videoId]);

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
        {currentTrack.thumbnail && (
          <div
            className="absolute inset-0 opacity-12 blur-[150px] scale-125 bg-center bg-cover pointer-events-none transition-all duration-1000"
            style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
          />
        )}

        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85 pointer-events-none" />

        {/* ====================================================================
            LAYER 3 — UI: TOP NAVIGATION & UTILITY BAR
            (Collapse on left, floating segmented control center, tools on right)
            ==================================================================== */}
        <header className="relative z-30 flex items-center justify-between px-6 py-5 md:px-12 md:py-6 w-full max-w-7xl mx-auto shrink-0">
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
        <main className="relative z-20 flex-1 flex flex-col justify-center min-h-0 w-full overflow-y-auto px-4 md:px-8 py-2 md:py-4">
          {/* ==================================================================
              MODE 1: COVER / HERO ARTWORK WORKSTATION
              ================================================================== */}
          {activeTab === 'art' && (
            <motion.div
              key={currentTrack.videoId}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center gap-6 w-full max-w-lg mx-auto my-auto"
            >
              {/* Responsive Hero Artwork Card */}
              <div className="relative group shrink-0">
                <div className="relative w-64 h-64 sm:w-76 sm:h-76 md:w-88 md:h-88 lg:w-[380px] lg:h-[380px] xl:w-[410px] xl:h-[410px] max-h-[44vh] aspect-square rounded-[28px] overflow-hidden shadow-[0_28px_70px_rgba(0,0,0,0.9)] border border-white/[0.12] bg-[#12141a]">
                  <ArtworkImage
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    fallbackIconClassName="w-14 h-14 text-neutral-500"
                  />
                  <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/15 pointer-events-none" />
                </div>

                {/* Ambient Floor Shadow */}
                <div
                  className="absolute -bottom-6 inset-x-6 h-12 rounded-full opacity-35 blur-2xl pointer-events-none -z-10 transition-all duration-700"
                  style={{
                    background: atmospherePalette?.glow
                      ? `radial-gradient(ellipse, ${atmospherePalette.glow} 0%, transparent 70%)`
                      : 'radial-gradient(ellipse, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
                  }}
                />
              </div>

              {/* Track Hierarchy: Title, Artist, Actions */}
              <div className="flex items-center justify-between w-full px-1">
                <div className="min-w-0 pr-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight truncate">
                    {currentTrack.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-400 font-medium truncate mt-1">
                    {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleLike(currentTrack)}
                    aria-label={liked ? 'Unlike song' : 'Like song'}
                    title={liked ? 'Unlike' : 'Like'}
                    className={`w-9 h-9 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center transition-all ${
                      liked ? 'text-white shadow-[0_0_12px_rgba(255,255,255,0.4)] bg-white/20' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => setPlaylistModalOpen(true)}
                    aria-label="Add to playlist"
                    title="Add to playlist"
                    className="w-9 h-9 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Scrubber & Monospace Tabular Timestamps */}
              <div className="flex flex-col gap-1.5 w-full">
                <div className="relative flex items-center w-full py-1">
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
                    aria-label="Audio Timeline Scrubber"
                    className="scrubber-slider-aapesh w-full cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%)`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] tabular-nums font-mono text-neutral-400 select-none">
                  <span>{formatTime(displayedTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Transport Controls: Shuffle, Prev, Solid White Play Button, Next, Repeat */}
              <div className="flex items-center justify-between w-full max-w-sm px-4">
                {/* Shuffle */}
                <button
                  onClick={cycleShuffleMode}
                  aria-label={`Shuffle: ${shuffleMode}`}
                  title={shuffleMode === 'smart' ? 'Smart Shuffle' : 'Shuffle'}
                  className={`p-2.5 rounded-full transition-all ${
                    shuffleMode !== 'off'
                      ? 'text-white bg-white/20 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {shuffleMode === 'smart' ? (
                    <Sparkles className="w-4 h-4 text-white" />
                  ) : (
                    <Shuffle className="w-4 h-4" />
                  )}
                </button>

                {/* Previous */}
                <button
                  onClick={previous}
                  aria-label="Previous track"
                  className="p-2.5 text-neutral-300 hover:text-white transition-colors"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                {/* Focal White Circular Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="btn-play-aapesh w-14 h-14 rounded-full flex items-center justify-center text-black shadow-[0_10px_35px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 transition-transform"
                >
                  {isBuffering ? (
                    <Loader2 className="w-6 h-6 animate-spin text-black" />
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6 fill-current text-black" />
                  ) : (
                    <Play className="w-6 h-6 fill-current translate-x-0.5 text-black" />
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={next}
                  aria-label="Next track"
                  className="p-2.5 text-neutral-300 hover:text-white transition-colors"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>

                {/* Repeat */}
                <button
                  onClick={toggleRepeat}
                  aria-label={`Repeat: ${repeatMode}`}
                  title={`Repeat: ${repeatMode}`}
                  className={`p-2.5 rounded-full transition-all ${
                    repeatMode !== 'off'
                      ? 'text-white bg-white/20 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {repeatMode === 'track' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Volume Slider Below Transport */}
              <div className="flex items-center justify-center gap-2.5 w-64 max-w-full">
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
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume Slider"
                  className="scrubber-slider-aapesh w-full"
                  style={{
                    background: `linear-gradient(to right, #ffffff ${currentVolume}%, rgba(255, 255, 255, 0.15) ${currentVolume}%)`,
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* ==================================================================
              MODE 2: SYNCHRONIZED LYRICS (Apple / Workstation Layout)
              ================================================================== */}
          {activeTab === 'lyrics' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full max-w-7xl mx-auto w-full items-center my-auto"
            >
              {/* Left Column Anchor: Artwork + Info + Scrubber & Controls */}
              <div className="hidden lg:flex lg:col-span-5 flex-col items-center justify-center gap-4 my-auto">
                <div className="relative group shrink-0">
                  <div className="relative w-64 h-64 xl:w-76 xl:h-76 rounded-[28px] overflow-hidden shadow-2xl border border-white/10 bg-[#12141a] shrink-0">
                    <ArtworkImage
                      src={currentTrack.thumbnail}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                      fallbackIconClassName="w-12 h-12 text-neutral-500"
                    />
                    <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/15 pointer-events-none" />
                  </div>

                  {/* Ambient Floor Shadow */}
                  <div
                    className="absolute -bottom-6 inset-x-4 h-12 rounded-full opacity-35 blur-2xl pointer-events-none -z-10 transition-all duration-700"
                    style={{
                      background: atmospherePalette?.glow
                        ? `radial-gradient(ellipse, ${atmospherePalette.glow} 0%, transparent 70%)`
                        : 'radial-gradient(ellipse, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
                    }}
                  />
                </div>

                <div className="text-center max-w-sm px-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 truncate mt-0.5">
                    {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                  </p>
                </div>

                {/* Compact Scrubber Timeline */}
                <div className="flex flex-col gap-1 w-full max-w-xs px-2">
                  <div className="relative flex items-center w-full">
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
                      aria-label="Audio Timeline"
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

                {/* Compact Transport Controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={cycleShuffleMode}
                    aria-label={`Shuffle: ${shuffleMode}`}
                    className={`p-2 rounded-full transition-all ${
                      shuffleMode !== 'off' ? 'text-white bg-white/20' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {shuffleMode === 'smart' ? (
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Shuffle className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={previous}
                    aria-label="Previous track"
                    className="p-2 text-neutral-300 hover:text-white transition-colors"
                  >
                    <SkipBack className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="btn-play-aapesh w-11 h-11 rounded-full flex items-center justify-center text-black shadow-xl hover:scale-105 active:scale-95 transition-transform"
                  >
                    {isBuffering ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : isPlaying ? (
                      <Pause className="w-4 h-4 fill-current text-black" />
                    ) : (
                      <Play className="w-4 h-4 fill-current translate-x-0.5 text-black" />
                    )}
                  </button>
                  <button
                    onClick={next}
                    aria-label="Next track"
                    className="p-2 text-neutral-300 hover:text-white transition-colors"
                  >
                    <SkipForward className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    onClick={toggleRepeat}
                    aria-label={`Repeat: ${repeatMode}`}
                    className={`p-2 rounded-full transition-all ${
                      repeatMode !== 'off' ? 'text-white bg-white/20' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {repeatMode === 'track' ? (
                      <Repeat1 className="w-3.5 h-3.5" />
                    ) : (
                      <Repeat className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: High-Res Scrolling Synced Lyrics */}
              <div className="lg:col-span-7 h-[74vh] flex flex-col relative">
                {isDiagnosticsOpen && (
                  <LyricsSyncDiagnostics
                    highResTimeMs={highResTimeMs}
                    effectiveTimeMs={effectiveTimeMs}
                    currentLineTimestamp={currentLineTimestamp}
                    activeLineIndex={activeLineIndex}
                    activeLyricText={activeLyricText}
                    lyricsOffsetMs={lyricsOffsetMs}
                    provider={provider}
                    syncConfidence={syncConfidence}
                    durationDifference={durationDifference}
                    onClose={() => setIsDiagnosticsOpen(false)}
                  />
                )}

                {/* Top Lyrics Toolbar */}
                <div className="flex items-center justify-between px-4 pb-3 border-b border-white/[0.08] shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Lyrics
                    </span>
                    {lyricsData?.synced && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>Synchronized</span>
                      </span>
                    )}
                  </div>

                  {lyricsData?.hasLyrics && lyricsData.synced && (
                    <button
                      onClick={() => setIsCalibrationOpen((prev) => !prev)}
                      className="px-3 py-1 rounded-full bg-white/[0.07] hover:bg-white/15 border border-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-colors"
                      title="Adjust lyrics synchronization offset"
                    >
                      Adjust Sync
                    </button>
                  )}
                </div>

                {/* Calibration Toolbar */}
                {isCalibrationOpen && lyricsData?.hasLyrics && lyricsData.synced && (
                  <div className="pt-2 px-2 shrink-0">
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

                {/* Return to Current Lyric */}
                {isUserScrolledAway && lyricsData?.synced && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
                  >
                    <button
                      onClick={scrollToCurrentLyric}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#12141a]/95 backdrop-blur-2xl border border-white/20 text-xs font-bold text-white shadow-2xl hover:scale-105 transition-transform"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-neutral-300" />
                      <span>Return to current lyric</span>
                    </button>
                  </motion.div>
                )}

                {/* Scrolling Lyric Lines Stream */}
                <div
                  ref={lyricsContainerRef}
                  onScroll={handleLyricsScroll}
                  className="flex-1 overflow-y-auto py-24 px-4 sm:px-8 scroll-smooth select-text"
                  style={{
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
                  }}
                >
                  {lyricsLoading ? (
                    <div className="py-28 flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-neutral-300 animate-spin" />
                      <span className="text-neutral-400 text-sm font-medium">Synchronizing lyrics...</span>
                    </div>
                  ) : lyricsData?.hasLyrics ? (
                    <div className="w-full flex flex-col gap-6 py-20">
                      {lyricsData.lines.map((line, idx) => {
                        const lineDir = getLineDirection(line.text, line.direction);
                        const fontClass = getLineFontClass(line.text, line.script);

                        if (lyricsData.synced) {
                          const isActive = idx === activeLineIndex;
                          const distance = Math.abs(idx - activeLineIndex);
                          const isNearby = distance <= 2;

                          return (
                            <div
                              key={line.id}
                              ref={(el) => setLyricsLineRef(idx, el)}
                              onClick={() => {
                                seekToLine(idx);
                                setIsUserScrolledAway(false);
                              }}
                              dir={lineDir}
                              aria-current={isActive ? 'true' : undefined}
                              className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-xl max-w-2xl ${
                                lineDir === 'rtl' ? 'text-right lyric-line-rtl' : 'text-left lyric-line-ltr'
                              } ${fontClass} ${
                                isActive
                                  ? 'lyric-line-active text-2xl sm:text-3xl md:text-4xl'
                                  : isNearby
                                  ? 'lyric-line-nearby text-xl sm:text-2xl hover:opacity-90'
                                  : 'lyric-line-distant text-lg sm:text-xl hover:opacity-60'
                              }`}
                            >
                              <div
                                className={`flex items-baseline ${
                                  lineDir === 'rtl' ? 'justify-end' : 'justify-start'
                                } gap-2`}
                              >
                                <SyncedLineWords
                                  line={line}
                                  nextLineStartTime={lyricsData.lines[idx + 1]?.startTime}
                                  currentTimeMs={effectiveTimeMs}
                                  isActive={isActive}
                                  size="lg"
                                  dir={lineDir}
                                  onSeekToWord={seek}
                                />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={line.id}
                            dir={lineDir}
                            className={`text-neutral-200 text-xl sm:text-2xl font-medium leading-relaxed max-w-xl py-1 ${fontClass} ${
                              lineDir === 'rtl' ? 'lyric-line-rtl text-right' : 'lyric-line-ltr text-left'
                            }`}
                          >
                            {line.text}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-28 text-neutral-400 text-center flex flex-col items-center">
                      <Mic2 className="w-12 h-12 text-neutral-600 mb-3" />
                      <h3 className="text-lg font-medium text-neutral-300">No lyrics available</h3>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================================
              MODE 3: QUEUE MODE
              ================================================================== */}
          {activeTab === 'queue' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-2xl mx-auto h-[74vh] bg-[#12151c]/90 backdrop-blur-2xl rounded-[28px] border border-white/10 p-5 md:p-7 flex flex-col shadow-2xl my-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
                <div className="flex items-center gap-2.5">
                  <ListMusic className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-bold text-white tracking-tight">Play Queue</h2>
                  <span className="text-xs font-mono text-neutral-400">({queue.length})</span>
                </div>

                <button
                  onClick={toggleAutoplay}
                  aria-label="Toggle Autoplay"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${
                    autoplayEnabled
                      ? 'bg-white/20 border-white/30 text-white font-semibold'
                      : 'bg-white/[0.05] border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  <InfinityIcon className="w-3.5 h-3.5" />
                  <span>Autoplay {autoplayEnabled ? 'On' : 'Off'}</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pt-4 flex flex-col gap-5 pr-1">
                {/* Now Playing Card */}
                <div>
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                    Now Playing
                  </span>
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.08] border border-white/10 shadow-sm">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                      <ArtworkImage
                        src={currentTrack.thumbnail}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                        fallbackIconClassName="w-5 h-5 text-neutral-400"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white truncate">
                        {currentTrack.title}
                      </div>
                      <div className="text-xs text-neutral-400 truncate mt-0.5">
                        {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                      </div>
                    </div>
                    {isPlaying && (
                      <div className="flex items-end gap-[3px] h-4 pr-2">
                        <span className="w-1 rounded-full eq-aapesh-1" />
                        <span className="w-1 rounded-full eq-aapesh-2" />
                        <span className="w-1 rounded-full eq-aapesh-3" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Up Next List */}
                <div className="flex flex-col gap-2 flex-1">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Up Next ({upNextTracks.length})
                  </span>

                  {upNextTracks.length === 0 ? (
                    <div className="py-12 text-center text-xs text-neutral-500">
                      Queue is empty. Turn on Autoplay to automatically play related music.
                    </div>
                  ) : (
                    upNextTracks.map((track, relativeIdx) => {
                      const actualIdx = currentIndex + 1 + relativeIdx;
                      return (
                        <div
                          key={`${track.videoId}-${actualIdx}`}
                          className="group flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors"
                        >
                          <div
                            onClick={() => playTrack(track)}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                              <ArtworkImage
                                src={track.thumbnail}
                                alt={track.title}
                                className="w-full h-full object-cover"
                                fallbackIconClassName="w-4 h-4 text-neutral-400"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-neutral-200 group-hover:text-white truncate">
                                {track.title}
                              </div>
                              <div className="text-xs text-neutral-400 truncate">
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
                                aria-label="Move track up in queue"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => removeFromQueue(actualIdx)}
                              className="p-1 rounded text-neutral-400 hover:text-white"
                              title="Remove"
                              aria-label="Remove track from queue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================================
              MODE 4: VIDEO MODE
              ================================================================== */}
          {activeTab === 'video' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center gap-6 w-full max-w-4xl mx-auto my-auto"
            >
              <div className="relative w-full aspect-[16/9] rounded-[24px] overflow-hidden shadow-2xl bg-black border border-white/10">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${currentTrack.videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`}
                  title={currentTrack.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </motion.div>
          )}
        </main>

        {/* Minimalist Floating Workstation Status Surface (Lower Left) */}
        <div className="fixed bottom-6 left-6 z-40 hidden md:block">
          <div className="rounded-full bg-black/60 backdrop-blur-2xl border border-white/10 px-4 py-2 shadow-2xl flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] font-mono font-medium text-neutral-300">
              AAPESH Engine • {spatialAudio ? 'Spatial DSP 3D' : 'Lossless Stereo'} • 48kHz
            </span>
          </div>
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
