import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LyricsResponse, LyricLine, LyricTimingLevel } from '@/types/music';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { defaultPlaybackEngine } from '@/services/player/YouTubeIframeProvider';
import {
  getLineWords,
  getWordProgress,
  getCharacterProgress,
  determineLyricsTimingLevel,
} from '@/utils/wordSync';
import { getLineDirection } from '@/utils/unicodeScript';

export interface UseSyncedLyricsOptions {
  lyrics: LyricsResponse | null;
  currentTime: number; // in seconds from PlayerStore
  isPlaying: boolean;
  isActive?: boolean;
  isDiagnosticsOpen?: boolean;
  onSeek?: (seconds: number) => void;
}

export interface UseSyncedLyricsReturn {
  activeLineIndex: number;
  lineProgress: number; // 0.0 to 1.0
  seekToLine: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  setLineRef: (index: number, el: HTMLDivElement | null) => void;
  // Auto-follow / Manual scroll state
  isAutoFollowPaused: boolean;
  resumeAutoFollow: () => void;
  handleUserScroll: () => void;
  // Offset Calibration
  lyricsOffsetMs: number;
  setLyricsOffsetMs: (offset: number) => void;
  adjustLyricsOffsetMs: (delta: number) => void;
  resetLyricsOffset: () => void;
  // Real-time Diagnostics & Karaoke State
  highResTimeMs: number;
  effectiveTimeMs: number;
  currentLineTimestamp: number | null;
  activeLyricText: string | null;
  activeWordText: string | null;
  activeWordProgress: number;
  activeCharProgress: string | null;
  timingLevel: LyricTimingLevel;
  isWordEstimated: boolean;
  provider: string | null;
  syncConfidence: 'excellent' | 'good' | 'uncertain' | 'poor' | null;
  durationDifference: number | null;
}

/**
 * Binary search to efficiently locate the active lyric line in O(log N).
 * Returns the highest index whose startTime <= timeMs.
 * Returns -1 if timeMs is before the first timed line (instrumental intro).
 */
export function findActiveLyricLine(lines: LyricLine[] | undefined, timeMs: number): number {
  if (!lines || lines.length === 0) return -1;
  const firstStart = lines[0].startTime;
  if (firstStart === undefined || timeMs < firstStart) return -1;

  let low = 0;
  let high = lines.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = lines[mid].startTime;

    if (start !== undefined && start <= timeMs) {
      result = mid;
      low = mid + 1; // Check if a later line also started <= timeMs
    } else {
      high = mid - 1;
    }
  }

  return result;
}

/**
 * Fast monotonic active line finder with O(1) average time complexity,
 * falling back to binary search O(log N) on seeks, rewinds, or clock jumps.
 */
export function getActiveLineIndexFast(
  lines: LyricLine[] | undefined,
  timeMs: number,
  currentIndex: number
): number {
  if (!lines || lines.length === 0) return -1;
  const total = lines.length;

  // Check if current line is still active (monotonic forward check - O(1))
  if (currentIndex >= 0 && currentIndex < total) {
    const currentStart = lines[currentIndex].startTime ?? 0;
    const nextStart = currentIndex + 1 < total ? lines[currentIndex + 1].startTime : undefined;

    // Standard case: within current line's time span
    if (timeMs >= currentStart && (nextStart === undefined || timeMs < nextStart)) {
      return currentIndex;
    }

    // Monotonic next line: moved into immediately subsequent line
    if (currentIndex + 1 < total) {
      const nextLineStart = lines[currentIndex + 1].startTime ?? 0;
      const nextNextStart = currentIndex + 2 < total ? lines[currentIndex + 2].startTime : undefined;
      if (timeMs >= nextLineStart && (nextNextStart === undefined || timeMs < nextNextStart)) {
        return currentIndex + 1;
      }
    }
  }

  // If time is before the first line starts: intro silence
  const firstStart = lines[0].startTime;
  if (firstStart === undefined || timeMs < firstStart) {
    return -1;
  }

  // Fallback to binary search for seeking or clock jumps
  return findActiveLyricLine(lines, timeMs);
}

/**
 * Direct DOM update for intra-line karaoke word reveal.
 * Bypasses React reconciliation and updates styles / classes directly at native display refresh rate.
 */
export function updateActiveLineKaraokeDom(
  lineEl: HTMLElement | null | undefined,
  timeMs: number,
  isRtl: boolean
): void {
  if (!lineEl) return;
  const wordEls = lineEl.querySelectorAll<HTMLElement>('.lyric-word');
  if (!wordEls || wordEls.length === 0) return;

  for (let i = 0; i < wordEls.length; i++) {
    const el = wordEls[i];
    const startAttr = el.getAttribute('data-start-time');
    const endAttr = el.getAttribute('data-end-time');
    if (!startAttr) continue;

    const start = parseInt(startAttr, 10);
    const end = endAttr ? parseInt(endAttr, 10) : start + 350;

    if (timeMs < start) {
      // Upcoming word
      if (!el.classList.contains('lyric-word-upcoming')) {
        el.classList.remove('lyric-word-active', 'lyric-word-sung', 'text-white');
        el.classList.add('lyric-word-upcoming', 'text-white/40');
        el.style.backgroundImage = '';
        el.style.webkitBackgroundClip = '';
        el.style.backgroundClip = '';
        el.style.webkitTextFillColor = '';
        el.style.color = '';
      }
    } else if (timeMs >= end) {
      // Sung word
      if (!el.classList.contains('lyric-word-sung')) {
        el.classList.remove('lyric-word-active', 'lyric-word-upcoming', 'text-white/40');
        el.classList.add('lyric-word-sung', 'text-white');
        el.style.backgroundImage = '';
        el.style.webkitBackgroundClip = '';
        el.style.backgroundClip = '';
        el.style.webkitTextFillColor = '';
        el.style.color = '';
      }
    } else {
      // Active word
      if (!el.classList.contains('lyric-word-active')) {
        el.classList.remove('lyric-word-upcoming', 'lyric-word-sung', 'text-white/40', 'text-white');
        el.classList.add('lyric-word-active');
      }
      const dur = Math.max(1, end - start);
      const prog = Math.max(0, Math.min(1, (timeMs - start) / dur));
      const pct = (prog * 100).toFixed(1);

      const bgGradient = isRtl
        ? `linear-gradient(to left, #ffffff ${pct}%, rgba(255, 255, 255, 0.40) ${pct}%)`
        : `linear-gradient(to right, #ffffff ${pct}%, rgba(255, 255, 255, 0.40) ${pct}%)`;

      el.style.backgroundImage = bgGradient;
      el.style.setProperty('--karaoke-progress', `${pct}%`);
      el.style.webkitBackgroundClip = 'text';
      el.style.backgroundClip = 'text';
      el.style.webkitTextFillColor = 'transparent';
      el.style.color = 'transparent';
    }
  }
}

export const useSyncedLyrics = ({
  lyrics,
  currentTime,
  isPlaying,
  isActive = true,
  isDiagnosticsOpen = false,
  onSeek,
}: UseSyncedLyricsOptions): UseSyncedLyricsReturn => {
  // Structural React State: only changes when the active line changes (every ~3-5s) or on manual user actions
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const [lyricsOffsetMs, setLyricsOffsetState] = useState<number>(0);
  const [isAutoFollowPaused, setIsAutoFollowPaused] = useState<boolean>(false);

  // Diagnostics state: throttled to 10 FPS and only active when HUD is open
  const [diagnosticsState, setDiagnosticsState] = useState<{
    highResTimeMs: number;
    effectiveTimeMs: number;
    activeWordText: string | null;
    activeWordProgress: number;
    activeCharProgress: string | null;
    isWordEstimated: boolean;
  }>({
    highResTimeMs: 0,
    effectiveTimeMs: 0,
    activeWordText: null,
    activeWordProgress: 0,
    activeCharProgress: null,
    isWordEstimated: false,
  });

  const containerRef = useRef<HTMLDivElement>(null!);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previousLineRef = useRef<number>(-1);
  const activeLineIndexRef = useRef<number>(-1);
  const offsetRef = useRef<number>(0);
  const isAutoFollowPausedRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const lyricsRef = useRef<LyricsResponse | null>(lyrics);
  const isDiagnosticsOpenRef = useRef<boolean>(isDiagnosticsOpen);

  // Keep refs synchronized with props/state
  lyricsRef.current = lyrics;
  isPlayingRef.current = isPlaying;
  isDiagnosticsOpenRef.current = isDiagnosticsOpen;
  isAutoFollowPausedRef.current = isAutoFollowPaused;

  const seekFromStore = usePlayerStore((s) => s.seek);

  // Authoritative Playback Clock Anchoring with performance.now() sub-interval interpolation
  const anchorRef = useRef<{
    baseTimeMs: number;
    basePerfNow: number;
    isPlaying: boolean;
  }>({
    baseTimeMs: Math.round(currentTime * 1000),
    basePerfNow: typeof performance !== 'undefined' ? performance.now() : 0,
    isPlaying,
  });

  // Load per-track offset from localStorage whenever track/videoId changes
  useEffect(() => {
    setIsAutoFollowPaused(false);
    isAutoFollowPausedRef.current = false;
    previousLineRef.current = -1;
    activeLineIndexRef.current = -1;
    setActiveLineIndex(-1);

    if (!lyrics?.videoId) {
      setLyricsOffsetState(0);
      offsetRef.current = 0;
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved =
          window.localStorage.getItem(`aapesh_lyrics_offset_${lyrics.videoId}`) ??
          window.localStorage.getItem(`aurora_lyrics_offset_${lyrics.videoId}`);
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) {
            setLyricsOffsetState(parsed);
            offsetRef.current = parsed;
            return;
          }
        }
      }
    } catch {}

    setLyricsOffsetState(0);
    offsetRef.current = 0;
  }, [lyrics?.videoId]);

  // Set & persist per-track offset
  const setLyricsOffsetMs = useCallback(
    (offset: number) => {
      const clamped = Math.max(-5000, Math.min(5000, offset));
      setLyricsOffsetState(clamped);
      offsetRef.current = clamped;

      if (lyrics?.videoId && typeof window !== 'undefined' && window.localStorage) {
        try {
          if (clamped === 0) {
            window.localStorage.removeItem(`aapesh_lyrics_offset_${lyrics.videoId}`);
            window.localStorage.removeItem(`aurora_lyrics_offset_${lyrics.videoId}`);
          } else {
            window.localStorage.setItem(`aapesh_lyrics_offset_${lyrics.videoId}`, String(clamped));
          }
        } catch {}
      }
    },
    [lyrics?.videoId]
  );

  const adjustLyricsOffsetMs = useCallback(
    (delta: number) => {
      setLyricsOffsetMs(offsetRef.current + delta);
    },
    [setLyricsOffsetMs]
  );

  const resetLyricsOffset = useCallback(() => {
    setLyricsOffsetMs(0);
  }, [setLyricsOffsetMs]);

  // Resynchronize anchor when authoritative currentTime from player updates
  useEffect(() => {
    const perfNow = performance.now();
    const prev = anchorRef.current;
    const newCoarseTimeMs = Math.round(currentTime * 1000);

    // If player engine reports time, use it to cross-check
    const engineTime = defaultPlaybackEngine.getCurrentTime();
    const authoritativeMs = engineTime > 0 ? Math.round(engineTime * 1000) : newCoarseTimeMs;

    const elapsed = prev.isPlaying ? (perfNow - prev.basePerfNow) : 0;
    const currentEstMs = prev.baseTimeMs + elapsed;
    const drift = Math.abs(currentEstMs - authoritativeMs);

    // If drift is significant (> 350ms, e.g. seek) or play state changed, snap immediately
    if (drift > 350 || prev.isPlaying !== isPlaying) {
      anchorRef.current = {
        baseTimeMs: authoritativeMs,
        basePerfNow: perfNow,
        isPlaying,
      };

      // Recalculate active line immediately on seek/clock jump
      const currentLines = lyricsRef.current?.lines;
      if (currentLines && currentLines.length > 0) {
        const effectiveMs = Math.max(0, authoritativeMs + offsetRef.current);
        const snappedLineIdx = findActiveLyricLine(currentLines, effectiveMs);
        if (snappedLineIdx !== activeLineIndexRef.current) {
          activeLineIndexRef.current = snappedLineIdx;
          setActiveLineIndex(snappedLineIdx);
        }
      }
    } else {
      // Smooth continuous sync anchor
      anchorRef.current = {
        baseTimeMs: authoritativeMs,
        basePerfNow: perfNow,
        isPlaying,
      };
    }
  }, [currentTime, isPlaying]);

  // Compute interpolated high-res time
  const getInterpolatedTimeMs = useCallback(() => {
    const anchor = anchorRef.current;
    let ms = anchor.baseTimeMs;
    if (anchor.isPlaying) {
      ms += performance.now() - anchor.basePerfNow;
    }
    return Math.max(0, Math.round(ms));
  }, []);

  // Smoothly center a specific line inside the container
  const scrollLineIntoView = useCallback((lineIndex: number, instant = false) => {
    if (lineIndex < 0) return;
    const container = containerRef.current;
    const targetElement = lineRefs.current[lineIndex];

    if (container && targetElement) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      const containerRect = container.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      const relativeTop = targetRect.top - containerRect.top;
      // Position active line around 46% of container height for natural visual balance
      const targetOffset = relativeTop - container.clientHeight * 0.46 + targetRect.height / 2;

      container.scrollBy({
        top: targetOffset,
        behavior: instant || prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  }, []);

  // Auto-scroll: ONLY trigger when activeLineIndex changes AND auto-follow is NOT paused
  useEffect(() => {
    if (activeLineIndex === previousLineRef.current) return;
    previousLineRef.current = activeLineIndex;

    if (activeLineIndex < 0 || isAutoFollowPausedRef.current) return;

    scrollLineIntoView(activeLineIndex);
  }, [activeLineIndex, scrollLineIntoView]);

  // Handle user manual scroll: detect if user scrolled away from the active line
  const handleUserScroll = useCallback(() => {
    const container = containerRef.current;
    const currentIdx = activeLineIndexRef.current;
    if (!container || currentIdx < 0) return;

    const targetElement = lineRefs.current[currentIdx];
    if (targetElement) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      const lineCenter = targetRect.top + targetRect.height / 2;
      const containerCenter = containerRect.top + containerRect.height / 2;
      const distanceFromCenter = Math.abs(lineCenter - containerCenter);

      // If user scrolled more than 140px away from the active line, pause auto-follow
      if (distanceFromCenter > 140) {
        setIsAutoFollowPaused(true);
      } else {
        setIsAutoFollowPaused(false);
      }
    }
  }, []);

  // Resume auto-follow and smoothly return to active line
  const resumeAutoFollow = useCallback(() => {
    setIsAutoFollowPaused(false);
    isAutoFollowPausedRef.current = false;
    const currentIdx = activeLineIndexRef.current;
    if (currentIdx >= 0) {
      scrollLineIntoView(currentIdx);
    }
  }, [scrollLineIntoView]);

  // Click-to-seek directly to the exact lyric line timestamp
  const seekToLine = useCallback(
    (index: number) => {
      const lines = lyricsRef.current?.lines;
      if (!lines || !lines[index]) return;
      const line = lines[index];
      if (line.startTime !== undefined) {
        const targetSeconds = Math.max(0, line.startTime / 1000);
        const perfNow = performance.now();

        // Snap anchor immediately
        anchorRef.current = {
          baseTimeMs: line.startTime,
          basePerfNow: perfNow,
          isPlaying: isPlayingRef.current,
        };

        activeLineIndexRef.current = index;
        setActiveLineIndex(index);

        if (onSeek) {
          onSeek(targetSeconds);
        } else {
          seekFromStore(targetSeconds);
        }

        // Resume follow on seek and center line
        setIsAutoFollowPaused(false);
        isAutoFollowPausedRef.current = false;
        scrollLineIntoView(index, true);

        // Update active line DOM immediately
        const lineEl = lineRefs.current[index];
        const lineDir = getLineDirection(line.text, line.direction);
        updateActiveLineKaraokeDom(lineEl, line.startTime + offsetRef.current, lineDir === 'rtl');
      }
    },
    [onSeek, seekFromStore, scrollLineIntoView]
  );

  const setLineRef = useCallback((index: number, el: HTMLDivElement | null) => {
    lineRefs.current[index] = el;
  }, []);

  // SINGLE HIGH-PRECISION ANIMATION CLOCK LOOP
  // Runs continuously while isActive is true, driving local DOM reveals without 60fps React state churn
  useEffect(() => {
    if (!isActive) return;

    let rafId: number;
    let isCancelled = false;
    let lastDiagnosticsTick = 0;

    const tick = () => {
      if (isCancelled) return;

      const rawTimeMs = getInterpolatedTimeMs();
      const effectiveTimeMs = Math.max(0, rawTimeMs + offsetRef.current);
      const lines = lyricsRef.current?.lines;

      if (lines && lines.length > 0) {
        const currentIdx = activeLineIndexRef.current;
        const newIdx = getActiveLineIndexFast(lines, effectiveTimeMs, currentIdx);

        if (newIdx !== currentIdx) {
          activeLineIndexRef.current = newIdx;
          setActiveLineIndex(newIdx);
        }

        // Intra-line karaoke word reveal directly on the active line's DOM elements
        if (newIdx >= 0 && lines[newIdx]) {
          const lineEl = lineRefs.current[newIdx];
          const activeLine = lines[newIdx];
          const lineDir = getLineDirection(activeLine.text, activeLine.direction);
          updateActiveLineKaraokeDom(lineEl, effectiveTimeMs, lineDir === 'rtl');
        }
      }

      // Throttled Diagnostics Update (~10 FPS) when HUD is open
      if (isDiagnosticsOpenRef.current) {
        const now = performance.now();
        if (now - lastDiagnosticsTick > 100) {
          lastDiagnosticsTick = now;
          const currentIdx = activeLineIndexRef.current;
          const activeLine = lines && currentIdx >= 0 ? lines[currentIdx] : null;

          let activeWordText: string | null = null;
          let activeWordProgress = 0;
          let activeCharProgress: string | null = null;
          let isWordEstimated = false;

          if (activeLine) {
            const nextStart = lines ? lines[currentIdx + 1]?.startTime : undefined;
            const words = getLineWords(activeLine, nextStart);
            const activeWord = words.find(
              (w) => effectiveTimeMs >= w.startTime && effectiveTimeMs < (w.endTime ?? w.startTime + 350)
            );

            if (activeWord) {
              activeWordText = activeWord.text;
              activeWordProgress = getWordProgress(activeWord, effectiveTimeMs);
              const charDetails = getCharacterProgress(activeWord, effectiveTimeMs);
              activeCharProgress = `${charDetails.highlightedCount} / ${charDetails.totalChars}`;
              isWordEstimated = activeWord.isEstimated ?? false;
            }
          }

          setDiagnosticsState({
            highResTimeMs: rawTimeMs,
            effectiveTimeMs,
            activeWordText,
            activeWordProgress,
            activeCharProgress,
            isWordEstimated,
          });
        }
      }

      if (isPlayingRef.current) {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (isPlayingRef.current) {
      rafId = requestAnimationFrame(tick);
    } else {
      // Static update when paused
      const rawTimeMs = getInterpolatedTimeMs();
      const effectiveTimeMs = Math.max(0, rawTimeMs + offsetRef.current);
      const lines = lyricsRef.current?.lines;
      if (lines && lines.length > 0) {
        const newIdx = getActiveLineIndexFast(lines, effectiveTimeMs, activeLineIndexRef.current);
        if (newIdx !== activeLineIndexRef.current) {
          activeLineIndexRef.current = newIdx;
          setActiveLineIndex(newIdx);
        }
        if (newIdx >= 0 && lines[newIdx]) {
          const lineEl = lineRefs.current[newIdx];
          const activeLine = lines[newIdx];
          const lineDir = getLineDirection(activeLine.text, activeLine.direction);
          updateActiveLineKaraokeDom(lineEl, effectiveTimeMs, lineDir === 'rtl');
        }
      }
    }

    return () => {
      isCancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isActive, isPlaying, getInterpolatedTimeMs]);

  const timingLevel: LyricTimingLevel = useMemo(() => {
    if (!lyrics?.synced || !lyrics.lines || lyrics.lines.length === 0) return 'none';
    if (lyrics.timingLevel) return lyrics.timingLevel;
    return determineLyricsTimingLevel(lyrics.lines);
  }, [lyrics]);

  const activeLine = activeLineIndex !== -1 && lyrics?.lines ? lyrics.lines[activeLineIndex] : null;

  return {
    activeLineIndex,
    lineProgress: 0,
    seekToLine,
    containerRef,
    setLineRef,
    isAutoFollowPaused,
    resumeAutoFollow,
    handleUserScroll,
    lyricsOffsetMs,
    setLyricsOffsetMs,
    adjustLyricsOffsetMs,
    resetLyricsOffset,
    highResTimeMs: diagnosticsState.highResTimeMs,
    effectiveTimeMs: diagnosticsState.effectiveTimeMs,
    currentLineTimestamp: activeLine?.startTime ?? null,
    activeLyricText: activeLine?.text ?? null,
    activeWordText: diagnosticsState.activeWordText,
    activeWordProgress: diagnosticsState.activeWordProgress,
    activeCharProgress: diagnosticsState.activeCharProgress,
    timingLevel,
    isWordEstimated: diagnosticsState.isWordEstimated,
    provider: lyrics?.provider ?? null,
    syncConfidence: lyrics?.syncConfidence ?? null,
    durationDifference: lyrics?.durationDifference ?? null,
  };
};
