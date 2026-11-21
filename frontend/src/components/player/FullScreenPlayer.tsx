import { VisualStageBoundary } from '@/components/canvas/VisualStageBoundary';
import { VisualizerModeSwitcher } from '@/components/canvas/VisualizerModeSwitcher';
import { useUIStore } from '@/stores/useUIStore';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown, Maximize2, Minimize2,
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
  RotateCcw,
  SlidersHorizontal,
  Headphones,
  Disc,
  Info,
  Moon,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useEqualizerStore } from '@/stores/useEqualizerStore';
import { useSyncedLyrics } from '@/hooks/useSyncedLyrics';
import { formatTime } from '@/lib/utils';
import { api } from '@/api/client';
import { LyricsResponse, LyricLine } from '@/types/music';
import { getLineDirection, getLineFontClass } from '@/utils/unicodeScript';
import { LyricsCalibrationToolbar } from './LyricsCalibrationToolbar';
import { LyricsSyncDiagnostics } from './LyricsSyncDiagnostics';
import { SyncedLineWords } from './SyncedLineWords';
import { QueueWorkstationContent } from './QueuePanel';
import { SleepTimerModal } from '@/components/common/SleepTimerModal';
import { AddToPlaylistModal } from '@/components/common/AddToPlaylistModal';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { getArtworkUrl } from '@/utils/artwork';
import { getHighestResArtworkUrl } from '@/components/layout/DynamicArtworkBackground';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';
import {
  iconCrossfadeVariants,
  controlButtonHover,
  controlButtonTap,
  playButtonHover,
  playButtonTap,
} from '@/lib/motion';

const SoundstageCanvas = React.lazy(() => import('@/components/canvas/SoundstageCanvas').then(module => ({ default: module.SoundstageCanvas })));
const preloadCache = new Set<string>();

interface FullScreenLyricLineItemProps {
  line: LyricLine;
  idx: number;
  isActive: boolean;
  distance: number;
  lineDir: 'ltr' | 'rtl';
  fontClass: string;
  translationMode: 'original' | 'dual' | 'translation';
  nextLineStartTime?: number;
  onSeekToLine: (idx: number) => void;
  onSeekToWord: (seconds: number) => void;
  setLyricsLineRef: (idx: number, el: HTMLDivElement | null) => void;
}

const FullScreenLyricLineItem: React.FC<FullScreenLyricLineItemProps> = React.memo(
  ({
    line,
    idx,
    isActive,
    distance,
    lineDir,
    fontClass,
    translationMode,
    nextLineStartTime,
    onSeekToLine,
    onSeekToWord,
    setLyricsLineRef,
  }) => {
    const isRTL = lineDir === 'rtl';

    const opacity = isActive
      ? 1.0
      : distance === 1
      ? 0.65
      : distance === 2
      ? 0.35
      : 0.18;

    return (
      <div
        ref={(el) => setLyricsLineRef(idx, el)}
        onClick={() => onSeekToLine(idx)}
        dir={lineDir}
        aria-current={isActive ? 'true' : undefined}
        style={{
          opacity,
          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`cursor-pointer py-2.5 px-3 sm:px-4 rounded-2xl max-w-2xl transition-all duration-300 select-text ${
          isRTL ? 'text-right' : 'text-left lg:text-left text-center'
        } ${fontClass} ${
          isActive
            ? 'lyric-line-active text-2xl sm:text-3xl lg:text-[34px] xl:text-[38px] leading-snug font-bold scale-[1.01]'
            : distance === 1
            ? 'lyric-line-nearby text-lg sm:text-xl lg:text-2xl font-medium'
            : distance === 2
            ? 'lyric-line-distant text-base sm:text-lg lg:text-xl font-normal'
            : 'lyric-line-distant text-sm sm:text-base lg:text-lg font-light'
        }`}
      >
        <SyncedLineWords
          line={line}
          nextLineStartTime={nextLineStartTime}
          isActive={isActive}
          size="lg"
          dir={lineDir}
          translationMode={translationMode}
          onSeekToWord={onSeekToWord}
        />
      </div>
    );
  }
);
FullScreenLyricLineItem.displayName = 'FullScreenLyricLineItem';

export const FullScreenPlayer: React.FC = () => {
  const visualizerMode = useUIStore(s => s.visualizerMode);
  const {
    currentTrack,
    atmospherePalette,
    isPlaying,
    isBuffering,
    playbackStatus, error,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    shuffleMode,
    isPlayerExpanded,
    togglePlayerExpanded,
    setPlayerExpanded,
    isAboutOpen,
    toggleAbout,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    cycleShuffleMode,
    toggleRepeat,
    fullscreenTab,
    setFullscreenTab,
    getEffectiveQualityInfo,
    openAbout,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const currentArtworkUrl = getHighestResArtworkUrl(currentTrack) || getArtworkUrl(currentTrack);
  const {
    toggleOpen: toggleEqualizer,
    spatialAudio,
    toggleSpatialAudio,
  } = useEqualizerStore();

  const [theater, setTheater] = useState(false);
  const [screenError, setScreenError] = useState('');
  useEffect(() => {
    const sync = () => setTheater(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  useEffect(() => { if (!isPlayerExpanded && document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {}); }, [isPlayerExpanded]);
  const activeTab = fullscreenTab;
  const setActiveTab = setFullscreenTab;

  const hasInitializedTabRef = useRef(false);
  useEffect(() => {
    if (isPlayerExpanded && !hasInitializedTabRef.current) {
      hasInitializedTabRef.current = true;
      if (fullscreenTab === 'art') {
        setFullscreenTab('lyrics');
      }
    } else if (!isPlayerExpanded) {
      hasInitializedTabRef.current = false;
    }
  }, [isPlayerExpanded, fullscreenTab, setFullscreenTab]);

  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [translationMode] = useState<'original' | 'dual' | 'translation'>('original');
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [sleepTimerModalOpen, setSleepTimerModalOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [shareToast, setShareToast] = useState(false);

  const [activeBg, setActiveBg] = useState<string | null>(currentArtworkUrl || null);
  const [prevBg, setPrevBg] = useState<string | null>(null);
  const [isCrossfadingBg, setIsCrossfadingBg] = useState(false);
  const bgTimerRef = useRef<any>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });
  const [isPointerHovered, setIsPointerHovered] = useState(false);
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const currentTiltRef = useRef({ x: 0, y: 0 });

  const [beatScale, setBeatScale] = useState(1.0);
  const [fluidDrift, setFluidDrift] = useState({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const [isVinylMode, setIsVinylMode] = useState(false);

  const displayedTime = scrubValue !== null ? scrubValue : currentTime;
  const qualityInfo = getEffectiveQualityInfo();

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!currentArtworkUrl) return;
    if (currentArtworkUrl === activeBg) return;

    const executeCrossfade = () => {
      setPrevBg(activeBg);
      setActiveBg(currentArtworkUrl);
      setIsCrossfadingBg(true);

      if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
      bgTimerRef.current = setTimeout(() => {
        setPrevBg(null);
        setIsCrossfadingBg(false);
      }, 950);
    };

    if (preloadCache.has(currentArtworkUrl)) {
      executeCrossfade();
    } else {
      const img = new Image();
      img.src = currentArtworkUrl;
      img.onload = () => {
        if (preloadCache.size >= 64) preloadCache.delete(preloadCache.values().next().value!);
        preloadCache.add(currentArtworkUrl);
        executeCrossfade();
      };
      img.onerror = () => {
        executeCrossfade();
      };
    }

    return () => {
      if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
    };
  }, [currentArtworkUrl, activeBg]);

  useEffect(() => {
    if (!isPlayerExpanded || reducedMotion || visualizerMode === 'stealth') return;

    const handlePointerMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseTargetRef.current.x = nx;
      mouseTargetRef.current.y = ny;

      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          setIsPointerHovered(true);
          const localX = ((e.clientX - rect.left) / rect.width) * 100;
          const localY = ((e.clientY - rect.top) / rect.height) * 100;
          setGlarePosition({ x: localX, y: localY, opacity: 0.18 });
        } else {
          setIsPointerHovered(false);
          setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
        }
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, [reducedMotion, isPlayerExpanded]);

  useEffect(() => {
    if (!isPlayerExpanded || reducedMotion || visualizerMode === 'stealth') return;
    let animId: number;
    let phase = 0;

    let lastFrame = 0;
    const updateScene = (time: number) => {
      if (document.hidden || time - lastFrame < (document.hasFocus() ? 50 : 250)) { animId = requestAnimationFrame(updateScene); return; }
      lastFrame = time;
      if (!reducedMotion) {
        currentTiltRef.current.x += (mouseTargetRef.current.x - currentTiltRef.current.x) * 0.05;
        currentTiltRef.current.y += (mouseTargetRef.current.y - currentTiltRef.current.y) * 0.05;

        const rx = -currentTiltRef.current.y * 3.5;
        const ry = currentTiltRef.current.x * 3.5;
        setTilt({ rotateX: rx, rotateY: ry });

        const phaseStep = isPlaying ? 0.006 : 0.002;
        phase += phaseStep;
        setFluidDrift({
          x1: Math.sin(phase * 0.8) * 32,
          y1: Math.cos(phase * 0.6) * 28,
          x2: Math.cos(phase * 0.7) * -30,
          y2: Math.sin(phase * 0.9) * 24,
        });
      }

      const features = audioReactiveEngine.getFeatures();
      const playMult = isPlaying ? 1.0 : 0.15;
      const targetScale = reducedMotion
        ? 1.0
        : 1.0 + (features.bass * 0.012 + features.transient * 0.008) * playMult;

      setBeatScale((prev) => prev + (targetScale - prev) * 0.1);
      animId = requestAnimationFrame(updateScene);
    };

    animId = requestAnimationFrame(updateScene);
    return () => cancelAnimationFrame(animId);
  }, [reducedMotion, isPlaying, isPlayerExpanded, visualizerMode]);

  const {
    activeLineIndex,
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
    isActive: isPlayerExpanded && activeTab === 'lyrics',
    isDiagnosticsOpen,
  });

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && usePlayerStore.getState().isPlayerExpanded) {
        setPlayerExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setPlayerExpanded]);

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

  const primaryColor = atmospherePalette?.primary || '#ffffff';
  const glowColor = atmospherePalette?.glow || 'rgba(255, 255, 255, 0.12)';

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        data-visual-mode={visualizerMode}
        className="immersive-edition fixed inset-0 z-50 flex flex-col bg-[var(--color-void)] text-white overflow-hidden select-none font-sans"
      >
        {spatialAudio && visualizerMode !== 'stealth' && (
          <VisualStageBoundary>
            <React.Suspense fallback={null}>
              <SoundstageCanvas />
            </React.Suspense>
          </VisualStageBoundary>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10"
        >
          {prevBg && (
            <div
              key="prev-bg"
              className="absolute inset-0 bg-cover bg-center scale-125 blur-[90px] opacity-0 transition-opacity duration-1000 ease-out will-change-transform"
              style={{ backgroundImage: `url(${prevBg})` }}
            />
          )}

          {activeBg && (
            <div
              key="active-bg"
              className={`absolute inset-0 bg-cover bg-center scale-125 blur-[90px] transition-opacity duration-1000 ease-out will-change-transform ${
                isCrossfadingBg ? 'opacity-35 animate-fade-in' : 'opacity-35'
              }`}
              style={{ backgroundImage: `url(${activeBg})` }}
            />
          )}

          <div
            className="absolute -top-[12%] -right-[8%] w-[75vw] h-[75vw] max-w-[950px] max-h-[950px] rounded-full opacity-35 blur-[140px] pointer-events-none transition-transform duration-700 ease-out will-change-transform"
            style={{
              background: `radial-gradient(circle, ${primaryColor} 0%, rgba(0, 0, 0, 0.25) 50%, transparent 72%)`,
              transform: reducedMotion
                ? 'none'
                : `translate3d(${fluidDrift.x1}px, ${fluidDrift.y1}px, 0) scale(${1.0 + (beatScale - 1.0) * 2.0})`,
            }}
          />

          <div
            className="absolute -bottom-[14%] -left-[8%] w-[65vw] h-[65vw] max-w-[850px] max-h-[850px] rounded-full opacity-30 blur-[140px] pointer-events-none transition-transform duration-700 ease-out will-change-transform"
            style={{
              background: `radial-gradient(circle, ${glowColor} 0%, rgba(0, 0, 0, 0.3) 55%, transparent 75%)`,
              transform: reducedMotion
                ? 'none'
                : `translate3d(${fluidDrift.x2}px, ${fluidDrift.y2}px, 0) scale(${1.0 + (beatScale - 1.0) * 1.8})`,
            }}
          />

          <div className="absolute inset-0 bg-black/60 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 pointer-events-none" />
        </div>

        <header className="relative z-30 flex items-center justify-between px-6 sm:px-10 lg:px-14 h-16 sm:h-20 w-full max-w-7xl mx-auto shrink-0">
          <button
            onClick={togglePlayerExpanded}
            aria-label="Collapse Fullscreen Player"
            title="Collapse (Esc)"
            className="w-10 h-10 rounded-full glass-pill flex items-center justify-center text-tertiary hover:text-white transition-all shadow-md active:scale-95"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <nav
            aria-label="Fullscreen View Modes"
            className="flex items-center gap-1 p-1 rounded-full glass-pill shadow-2xl"
          >
            <button
              onClick={() => setActiveTab('art')}
              aria-label="Cover Art View"
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'art'
                  ? 'glass-pill-active'
                  : 'text-tertiary hover:text-white'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Cover</span>
            </button>
            <button
              onClick={() => setActiveTab('lyrics')}
              aria-label="Synchronized Lyrics View"
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'lyrics'
                  ? 'glass-pill-active'
                  : 'text-tertiary hover:text-white'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>Lyrics</span>
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              aria-label="Play Queue View"
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'queue'
                  ? 'glass-pill-active'
                  : 'text-tertiary hover:text-white'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Queue</span>
            </button>
            <button
              onClick={() => setActiveTab('video')}
              aria-label="Official Video View"
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'video'
                  ? 'glass-pill-active'
                  : 'text-tertiary hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {document.fullscreenEnabled && (
              <button
                className="p-2 rounded-full glass-pill"
                aria-label={theater ? 'Exit full screen' : 'Enter full screen'}
                onClick={async () => {
                  try {
                    setScreenError('');
                    if (document.fullscreenElement) await document.exitFullscreen();
                    else await document.documentElement.requestFullscreen();
                  } catch {
                    setScreenError('Full screen is unavailable in this browser.');
                  }
                }}
              >
                {theater ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
            {screenError && <span role="status" className="text-xs">{screenError}</span>}

            <button
              onClick={() => openAbout(currentTrack)}
              aria-label="About this song"
              title="Song Information, Credits & Context"
              className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all shadow-sm ${
                isAboutOpen
                  ? 'glass-pill-active'
                  : 'glass-pill hover:bg-white/10'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-secondary" />
              <span>About</span>
            </button>

            <button
              onClick={toggleEqualizer}
              aria-label="Open Pro Graphic Equalizer"
              title="10-Band Graphic Pro Equalizer"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-pill text-xs text-secondary hover:text-white transition-all shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-secondary" />
              <span>Equalizer</span>
            </button>

            <button
              onClick={toggleSpatialAudio}
              aria-label="Toggle 3D visual stage"
              title="Toggle visual stage (does not change audio routing)"
              className={`hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all ${
                spatialAudio
                  ? 'glass-pill-active shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                  : 'glass-pill hover:bg-white/10'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-white" />
              <span>3D Stage</span>
            </button>

            <button
              onClick={handleShare}
              aria-label="Share current track"
              title="Share Link"
              className="w-10 h-10 rounded-full glass-pill flex items-center justify-center text-secondary hover:text-white transition-all shadow-md relative"
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

        {spatialAudio && <div className="relative z-30 flex justify-center px-3 pb-2"><VisualizerModeSwitcher /></div>}

        <main className="relative z-20 flex-1 min-h-0 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-2 sm:py-4 flex flex-col lg:flex-row items-center lg:items-center justify-between gap-8 lg:gap-14 overflow-hidden">
          <section
            aria-label="Track Player Controls"
            className="w-full lg:w-[380px] xl:w-[420px] 2xl:w-[450px] flex flex-col items-center lg:items-start shrink-0 min-h-0"
          >
            <div
              ref={cardRef}
              style={{
                perspective: 1000,
                transformStyle: 'preserve-3d',
              }}
              className="relative shrink-0"
            >
              <motion.div
                style={{
                  rotateX: tilt.rotateX,
                  rotateY: tilt.rotateY,
                  scale: beatScale,
                  transformStyle: 'preserve-3d',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 26,
                  mass: 0.7,
                }}
                className="immersive-sleeve relative w-48 h-48 sm:w-56 sm:h-56 md:w-60 md:h-60 lg:w-64 lg:h-64 aspect-square rounded-[22px] sm:rounded-[26px] overflow-hidden shadow-[0_24px_54px_rgba(0,0,0,0.85)] border border-white/[0.14] bg-[var(--color-ink)] will-change-transform group"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTrack.videoId}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full"
                  >
                    <ArtworkImage
                      item={currentTrack}
                      src={currentArtworkUrl || undefined}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      fallbackIconClassName="w-16 h-16 text-tertiary"
                    />
                  </motion.div>
                </AnimatePresence>

                {!reducedMotion && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
                    style={{
                      opacity: isPointerHovered ? glarePosition.opacity : 0.06,
                      background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)`,
                    }}
                  />
                )}

                <div className="absolute inset-0 rounded-[22px] sm:rounded-[26px] ring-1 ring-inset ring-white/20 pointer-events-none" />
              </motion.div>
            </div>

            <div className="w-full mt-5 text-center lg:text-left min-w-0">
              <span className="caption">Now playing</span>
              <h2 className="heading text-xl sm:text-2xl lg:text-[26px] font-bold text-white tracking-tight leading-tight line-clamp-2">
                {currentTrack.title}
              </h2>
              <p className="text-sm sm:text-base text-tertiary font-medium truncate mt-1">
                {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
              </p>
            </div>

            {currentTrack.album && <p className="body text-tertiary">{currentTrack.album}</p>}
            {error && <p role="alert" className="body text-tertiary">{error}</p>}

            <div className="w-full flex flex-col gap-1 mt-5">
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
                  className="slider w-full cursor-pointer h-1 hover:h-1.5 transition-all"
                  style={{
                    background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255, 255, 255, 0.18) ${progressPercent}%)`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-tertiary select-none">
                <span>{formatTime(displayedTime)}</span>
                <span>{duration > 0 ? `-${formatTime(Math.max(0, duration - displayedTime))}` : '0:00'}</span>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-5 sm:gap-6 w-full mt-4">
              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={cycleShuffleMode}
                aria-label={`Shuffle: ${shuffleMode}`}
                className={`control-btn transition-all ${
                  shuffleMode !== 'off' ? 'bg-white/15 text-white' : 'text-tertiary hover:text-white'
                }`}
              >
                {shuffleMode === 'smart' ? (
                  <Sparkles className="w-4 h-4 text-white" />
                ) : (
                  <Shuffle className="w-4 h-4" />
                )}
              </motion.button>

              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={previous}
                aria-label="Previous track"
                className="control-btn"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </motion.button>

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
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-void)' }} />
                    </motion.div>
                  ) : isPlaying ? (
                    <motion.div key="pause" variants={iconCrossfadeVariants} initial="initial" animate="animate" exit="exit">
                      <Pause className="w-5 h-5 fill-current" style={{ color: 'var(--color-void)' }} />
                    </motion.div>
                  ) : (
                    <motion.div key="play" variants={iconCrossfadeVariants} initial="initial" animate="animate" exit="exit">
                      <Play className="w-5 h-5 fill-current translate-x-0.5" style={{ color: 'var(--color-void)' }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={next}
                aria-label="Next track"
                className="control-btn"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </motion.button>

              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={toggleRepeat}
                aria-label={`Repeat: ${repeatMode}`}
                className={`control-btn transition-all ${
                  repeatMode !== 'off' ? 'bg-white/15 text-white' : 'text-tertiary hover:text-white'
                }`}
              >
                {repeatMode === 'track' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </motion.button>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-3 w-full mt-4 text-tertiary">
              <button
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="hover:text-white transition-colors"
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
                className="slider w-24 sm:w-28 h-1"
                style={{
                  background: `linear-gradient(to right, #ffffff ${currentVolume}%, rgba(255, 255, 255, 0.18) ${currentVolume}%)`,
                }}
              />

              <span className="text-[11px] font-mono tabular-nums text-tertiary w-7 text-right select-none">
                {currentVolume}%
              </span>

              <div className="w-px h-3.5 bg-white/10 mx-1" />

              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={() => toggleLike(currentTrack)}
                aria-label={liked ? 'Unlike track' : 'Like track'}
                title={liked ? 'Liked' : 'Like'}
                className="p-1.5 rounded-full hover:bg-white/10 text-tertiary hover:text-white transition-colors"
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-current text-rose-500' : ''}`} />
              </motion.button>

              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={() => setPlaylistModalOpen(true)}
                aria-label="Add to playlist"
                title="Add to Playlist"
                className="p-1.5 rounded-full hover:bg-white/10 text-tertiary hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileHover={controlButtonHover}
                whileTap={controlButtonTap}
                onClick={() => setSleepTimerModalOpen(true)}
                aria-label="Sleep timer"
                title="Sleep Timer"
                className="p-1.5 rounded-full hover:bg-white/10 text-tertiary hover:text-white transition-colors"
              >
                <Moon className="w-4 h-4" />
              </motion.button>
            </div>
          </section>

          <section
            aria-label="Workstation Focus Content"
            className="flex-1 w-full h-[50vh] sm:h-[56vh] lg:h-[72vh] min-h-0 flex flex-col justify-center relative overflow-hidden"
          >
            {activeTab === 'lyrics' && (
              <div className="relative w-full h-full flex flex-col justify-center overflow-hidden">
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

                <div className="absolute top-2 right-2 z-30 flex items-center gap-2">
                  {lyricsData?.synced && (
                    <button
                      onClick={() => setIsCalibrationOpen((prev) => !prev)}
                      className="p-2 rounded-full glass-pill hover:bg-white/15 border border-white/10 text-tertiary hover:text-white transition-colors"
                      title="Adjust lyrics offset"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isCalibrationOpen && lyricsData?.hasLyrics && lyricsData.synced && (
                  <div className="absolute top-12 inset-x-4 z-40">
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

                {isAutoFollowPaused && lyricsData?.synced && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resumeAutoFollow}
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-elevated text-xs font-bold text-white shadow-2xl hover:bg-white/15 transition-all duration-150"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-tertiary" />
                      <span>Resume Auto-Scroll</span>
                    </motion.button>
                  </motion.div>
                )}

                <div
                  ref={lyricsContainerRef}
                  onScroll={handleUserScroll}
                  className="flex-1 w-full overflow-y-auto py-16 px-4 sm:px-6 scroll-smooth select-text"
                  style={{
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
                  }}
                >
                  {lyricsLoading ? (
                    <div className="py-20 flex flex-col items-center gap-6 max-w-xl mx-auto w-full animate-pulse">
                      <div className="h-8 w-3/4 bg-white/[0.08] rounded-2xl" />
                      <div className="h-10 w-full bg-white/[0.12] rounded-2xl" />
                      <div className="h-8 w-4/5 bg-white/[0.08] rounded-2xl" />
                      <div className="h-7 w-2/3 bg-white/[0.06] rounded-2xl" />
                    </div>
                  ) : lyricsError ? (
                    <div className="py-20 text-tertiary text-center flex flex-col items-center gap-3">
                      <Mic2 className="w-10 h-10 text-neutral-600 mb-1" />
                      <h3 className="body text-secondary">Couldn't load lyrics</h3>
                      <button
                        onClick={() => fetchLyrics(currentTrack.videoId)}
                        className="mt-2 px-4 py-1.5 rounded-full glass-pill text-white text-xs font-semibold transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : lyricsData?.hasLyrics ? (
                    <div className="w-full flex flex-col items-center lg:items-start gap-6 sm:gap-7 py-12">
                      {lyricsData.lines.map((line, idx) => {
                        const lineDir = getLineDirection(line.text, line.direction);
                        const fontClass = getLineFontClass(line.text, line.script);

                        if (lyricsData.synced) {
                          const isActive = idx === activeLineIndex;
                          const distance = Math.abs(idx - activeLineIndex);

                          return (
                            <FullScreenLyricLineItem
                              key={line.id || idx}
                              line={line}
                              idx={idx}
                              isActive={isActive}
                              distance={distance}
                              lineDir={lineDir}
                              fontClass={fontClass}
                              translationMode={translationMode}
                              nextLineStartTime={lyricsData.lines[idx + 1]?.startTime}
                              onSeekToLine={seekToLine}
                              onSeekToWord={seek}
                              setLyricsLineRef={setLyricsLineRef}
                            />
                          );
                        }

                        return (
                          <div
                            key={line.id || idx}
                            dir={lineDir}
                            className={`body text-tertiary text-lg sm:text-xl font-normal leading-relaxed max-w-xl py-1.5 ${
                              lineDir === 'rtl' ? 'text-right' : 'text-left'
                            } ${fontClass}`}
                          >
                            {line.text}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-24 text-tertiary text-center flex flex-col items-center gap-3">
                      <Mic2 className="w-10 h-10 text-neutral-600 mb-1" />
                      <h3 className="body text-secondary">Lyrics unavailable</h3>
                      <p className="caption max-w-xs">No lyrics available for this track.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'queue' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full max-w-2xl mx-auto w-full rounded-[26px] glass-shell border border-white/10 shadow-2xl overflow-hidden"
              >
                <QueueWorkstationContent isCompactHeader />
              </motion.div>
            )}

            {activeTab === 'video' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex-1 w-full max-w-4xl mx-auto my-auto pointer-events-none"
              />
            )}

            {activeTab === 'art' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center w-full max-w-lg mx-auto h-full p-6 sm:p-8 rounded-[28px] glass-shell border border-white/10 shadow-2xl relative"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center p-1 rounded-full glass-pill border border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsVinylMode(false)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        !isVinylMode ? 'bg-white text-black shadow-md' : 'text-tertiary hover:text-white'
                      }`}
                    >
                      Showcase
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsVinylMode(true)}
                      data-testid="vinyl-toggle-button"
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isVinylMode ? 'bg-white text-black shadow-md' : 'text-tertiary hover:text-white'
                      }`}
                    >
                      <Disc className="w-3.5 h-3.5" />
                      <span>Vinyl</span>
                    </button>
                  </div>
                </div>

                {isVinylMode ? (
                  <div
                    data-testid="vinyl-record-view"
                    onClick={togglePlay}
                    className="relative w-64 h-64 sm:w-80 sm:h-80 aspect-square rounded-full flex items-center justify-center cursor-pointer group shadow-[0_24px_64px_rgba(0,0,0,0.9)] border-2 border-neutral-800 my-auto"
                    style={{
                      background:
                        'repeating-radial-gradient(circle, #0e0f12 0px, #0e0f12 2px, #1a1b20 3px, #0e0f12 4px)',
                    }}
                    title={isPlaying ? 'Click to Pause' : 'Click to Play'}
                  >
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background:
                          'conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.09) 60deg, transparent 120deg, rgba(255,255,255,0.09) 240deg, transparent 300deg)',
                      }}
                    />

                    <div
                      className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-white/20 shadow-inner flex items-center justify-center relative ${
                        isPlaying && !reducedMotion ? 'animate-spin-slow' : ''
                      }`}
                    >
                      <img
                        src={currentArtworkUrl || ''}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute w-5 h-5 rounded-full bg-black/90 border border-white/30 shadow-md flex items-center justify-center" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center lg:items-start justify-center w-full">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full glass-pill border border-white/15 text-xs font-semibold text-secondary mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>Now Playing Showcase</span>
                    </div>
                    <h3 className="heading text-2xl sm:text-3xl font-bold text-white tracking-tight text-center lg:text-left">
                      {currentTrack.title}
                    </h3>
                    <p className="body text-secondary font-medium mt-1 text-center lg:text-left">
                      {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                    </p>
                    {currentTrack.album && (
                      <p className="caption text-tertiary mt-1 text-center lg:text-left">
                        Album • {currentTrack.album}
                      </p>
                    )}
                    <div className="mt-6 pt-5 border-t border-white/10 w-full flex flex-col gap-3">
                      <div className="flex items-center justify-between caption text-tertiary">
                        <span>Engine Stream</span>
                        <span className="font-mono text-white">{qualityInfo.statusLabel}</span>
                      </div>
                      <div className="flex items-center justify-between caption text-tertiary">
                        <span>Spatial preference</span>
                        <span className="font-mono text-white">{spatialAudio ? 'Saved · unavailable for stream' : 'Off'}</span>
                      </div>
                      <div className="flex items-center justify-between caption text-tertiary">
                        <span>Source</span>
                        <span className="font-mono text-white">YouTube Music High Quality</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </section>
        </main>

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