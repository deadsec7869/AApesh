import { useState, useEffect, useRef, useCallback } from 'react';
import { LyricsResponse, LyricLine } from '@/types/music';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { defaultPlaybackEngine } from '@/services/player/YouTubeIframeProvider';

export interface UseSyncedLyricsOptions {
  lyrics: LyricsResponse | null;
  currentTime: number; // in seconds from PlayerStore
  isPlaying: boolean;
  onSeek?: (seconds: number) => void;
}

export interface UseSyncedLyricsReturn {
  activeLineIndex: number;
  lineProgress: number; // 0.0 to 1.0
  seekToLine: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  setLineRef: (index: number, el: HTMLDivElement | null) => void;
  // Offset Calibration
  lyricsOffsetMs: number;
  setLyricsOffsetMs: (offset: number) => void;
  adjustLyricsOffsetMs: (delta: number) => void;
  resetLyricsOffset: () => void;
  // Real-time Diagnostics
  highResTimeMs: number;
  effectiveTimeMs: number;
  currentLineTimestamp: number | null;
  activeLyricText: string | null;
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

export const useSyncedLyrics = ({
  lyrics,
  currentTime,
  isPlaying,
  onSeek,
}: UseSyncedLyricsOptions): UseSyncedLyricsReturn => {
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const [lineProgress, setLineProgress] = useState<number>(0);
  const [highResTimeMs, setHighResTimeMs] = useState<number>(0);
  const [lyricsOffsetMs, setLyricsOffsetState] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null!);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previousLineRef = useRef<number>(-1);
  const offsetRef = useRef<number>(0);

  const seekFromStore = usePlayerStore((s) => s.seek);

  // Load per-track offset from localStorage whenever track/videoId changes
  useEffect(() => {
    if (!lyrics?.videoId) {
      setLyricsOffsetState(0);
      offsetRef.current = 0;
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(`aurora_lyrics_offset_${lyrics.videoId}`);
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
            window.localStorage.removeItem(`aurora_lyrics_offset_${lyrics.videoId}`);
          } else {
            window.localStorage.setItem(`aurora_lyrics_offset_${lyrics.videoId}`, String(clamped));
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

  // High-Resolution Playback Clock:
  // Continuously queries the YouTube IFrame player's actual getCurrentTime() via requestAnimationFrame
  // without synthetic elapsed counters or wall-clock drift
  useEffect(() => {
    let rafId: number;
    let isCancelled = false;

    const queryPlayerTime = () => {
      const engineTime = defaultPlaybackEngine.getCurrentTime();
      const currentSeconds = engineTime > 0 ? engineTime : currentTime;
      return Math.max(0, Math.round(currentSeconds * 1000));
    };

    const tick = () => {
      if (isCancelled) return;

      const ms = queryPlayerTime();
      setHighResTimeMs(ms);

      if (isPlaying) {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(tick);
    } else {
      setHighResTimeMs(queryPlayerTime());
    }

    return () => {
      isCancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying, currentTime]);

  // Sign convention: effectiveTimeMs = highResTimeMs + lyricsOffsetMs
  // If offset > 0 (e.g. +500ms): advances lyrics earlier (for lyrics that lagged behind audio)
  // If offset < 0 (e.g. -500ms): delays lyrics later (for lyrics that appeared ahead of audio)
  const effectiveTimeMs = Math.max(0, highResTimeMs + lyricsOffsetMs);

  // Determine active lyric line & progress
  useEffect(() => {
    if (!lyrics?.synced || !lyrics.lines || lyrics.lines.length === 0) {
      setActiveLineIndex(-1);
      setLineProgress(0);
      return;
    }

    const index = findActiveLyricLine(lyrics.lines, effectiveTimeMs);
    setActiveLineIndex(index);

    if (index !== -1) {
      const line = lyrics.lines[index];
      const start = line.startTime ?? 0;
      const nextStart = lyrics.lines[index + 1]?.startTime;
      const end = line.endTime ?? (nextStart !== undefined ? nextStart : start + 4000);
      const duration = Math.max(1, end - start);

      if (effectiveTimeMs >= start) {
        const prog = Math.min(1, Math.max(0, (effectiveTimeMs - start) / duration));
        setLineProgress(prog);
      } else {
        setLineProgress(0);
      }
    } else {
      setLineProgress(0);
    }
  }, [effectiveTimeMs, lyrics]);

  // Auto-scroll: ONLY trigger when activeLineIndex changes
  useEffect(() => {
    if (activeLineIndex === previousLineRef.current) return;
    previousLineRef.current = activeLineIndex;

    if (activeLineIndex < 0) return;

    const container = containerRef.current;
    const targetElement = lineRefs.current[activeLineIndex];

    if (container && targetElement) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      const containerRect = container.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      // Center the active line smoothly inside scroll container
      const relativeTop = targetRect.top - containerRect.top;
      const targetOffset = relativeTop - container.clientHeight / 2 + targetRect.height / 2;

      container.scrollBy({
        top: targetOffset,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  }, [activeLineIndex]);

  // Click-to-seek directly to the exact lyric line timestamp
  const seekToLine = useCallback(
    (index: number) => {
      if (!lyrics?.lines || !lyrics.lines[index]) return;
      const line = lyrics.lines[index];
      if (line.startTime !== undefined) {
        const targetSeconds = Math.max(0, line.startTime / 1000);
        if (onSeek) {
          onSeek(targetSeconds);
        } else {
          seekFromStore(targetSeconds);
        }
      }
    },
    [lyrics, onSeek, seekFromStore]
  );

  const setLineRef = useCallback((index: number, el: HTMLDivElement | null) => {
    lineRefs.current[index] = el;
  }, []);

  const activeLine = activeLineIndex !== -1 && lyrics?.lines ? lyrics.lines[activeLineIndex] : null;

  return {
    activeLineIndex,
    lineProgress,
    seekToLine,
    containerRef,
    setLineRef,
    lyricsOffsetMs,
    setLyricsOffsetMs,
    adjustLyricsOffsetMs,
    resetLyricsOffset,
    highResTimeMs,
    effectiveTimeMs,
    currentLineTimestamp: activeLine?.startTime ?? null,
    activeLyricText: activeLine?.text ?? null,
    provider: lyrics?.provider ?? null,
    syncConfidence: lyrics?.syncConfidence ?? null,
    durationDifference: lyrics?.durationDifference ?? null,
  };
};
