import React, { useRef, useState, useEffect, useCallback } from 'react';
import { formatTime } from '@/lib/utils';

interface WaveformScrubberProps {
  waveformData: number[] | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  loading?: boolean;
  className?: string;
  height?: number;
  bufferedFraction?: number | null;
  abLoop?: { a: number | null; b: number | null };
  onAbLoopChange?: (abLoop: { a: number | null; b: number | null }) => void;
}

const FALLBACK_BARS = Array.from({ length: 64 }, (_, i) => {
  const t = i / 63;
  return Math.max(0.15, Math.min(0.95, 0.25 + 0.65 * Math.abs(Math.sin(t * Math.PI * 5 + 0.4))));
});

export function WaveformScrubber({
  waveformData,
  currentTime,
  duration,
  onSeek,
  loading = false,
  className = '',
  height = 56,
  bufferedFraction,
  abLoop = { a: null, b: null },
  onAbLoopChange,
}: WaveformScrubberProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [draggingLoop, setDraggingLoop] = useState<'a' | 'b' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const maximum = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const value = Math.max(
    0,
    Math.min(maximum, preview ?? (Number.isFinite(currentTime) ? currentTime : 0))
  );
  const played = maximum ? (value / maximum) * 100 : 0;
  const buffered =
    bufferedFraction !== null && bufferedFraction !== undefined && Number.isFinite(bufferedFraction)
      ? Math.max(played, Math.min(100, bufferedFraction * 100))
      : played;

  const loopA = abLoop.a !== null && maximum ? (abLoop.a / maximum) * 100 : null;
  const loopB = abLoop.b !== null && maximum ? (abLoop.b / maximum) * 100 : null;

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!containerRef.current || !maximum) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * maximum;
    },
    [maximum]
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !maximum) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(x * 100);
    setHoverTime(x * maximum);
  };

  const handleMouseLeave = () => {
    setHoverPos(null);
    setHoverTime(null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!maximum || draggingLoop) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const time = getTimeFromClientX(e.clientX);
    setIsScrubbing(true);
    setPreview(time);
    onSeek(time);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing || !maximum) return;
    const time = getTimeFromClientX(e.clientX);
    setPreview(time);
    onSeek(time);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsScrubbing(false);
    setPreview(null);
  };

  const handleLoopPointerDown = (e: React.PointerEvent<HTMLButtonElement>, which: 'a' | 'b') => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingLoop(which);
  };

  useEffect(() => {
    if (!draggingLoop) return;

    const onWindowPointerMove = (e: PointerEvent) => {
      if (!maximum || !onAbLoopChange) return;
      const rawTime = getTimeFromClientX(e.clientX);
      if (draggingLoop === 'a') {
        const upperBound = abLoop.b !== null ? Math.max(0, abLoop.b - 0.5) : maximum;
        onAbLoopChange({ a: Math.min(rawTime, upperBound), b: abLoop.b });
      } else {
        const lowerBound = abLoop.a !== null ? Math.min(maximum, abLoop.a + 0.5) : 0;
        onAbLoopChange({ a: abLoop.a, b: Math.max(rawTime, lowerBound) });
      }
    };

    const onWindowPointerUp = () => {
      setDraggingLoop(null);
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
    };
  }, [draggingLoop, maximum, abLoop.a, abLoop.b, getTimeFromClientX, onAbLoopChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!maximum) return;
    const step = maximum * 0.01;
    let newValue: number | null = null;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newValue = Math.max(0, value - step);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newValue = Math.min(maximum, value + step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      newValue = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newValue = maximum;
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      newValue = Math.max(0, value - maximum * 0.1);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      newValue = Math.min(maximum, value + maximum * 0.1);
    }

    if (newValue !== null) {
      onSeek(newValue);
    }
  };

  if (loading || !maximum) {
    return (
      <div
        ref={containerRef}
        className={`waveform-scrubber ${className}`}
        style={{ height, minHeight: height }}
        aria-busy={true}
        role="slider"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={Math.round(maximum)}
        aria-valuenow={Math.round(value)}
        aria-valuetext={`${formatTime(value)} of ${formatTime(maximum)}`}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="waveform-skeleton h-full" style={{ height }} />
        {loading && <div className="loading-overlay">Loading waveform…</div>}
      </div>
    );
  }

  const bars = waveformData && waveformData.length > 0 ? waveformData : FALLBACK_BARS;

  const scrollerStyle = {
    height,
    minHeight: height,
    '--waveform-height': `${height}px`,
    '--played-width': `${played}%`,
    '--buffered-width': `${buffered}%`,
    '--loop-a': loopA !== null ? `${loopA}%` : '0%',
    '--loop-b': loopB !== null ? `${loopB}%` : '100%',
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`waveform-scrubber ${className}`}
      style={scrollerStyle}
      aria-busy={loading}
      role="slider"
      aria-label="Playback position"
      aria-valuemin={0}
      aria-valuemax={Math.round(maximum)}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${formatTime(value)} of ${formatTime(maximum)}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Waveform Bars - Visible crisp vertical bars using absolute positioning */}
      <div className="waveform-bars" role="img" aria-label="Audio waveform">
        {bars.map((amp, i) => (
          <div
            key={i}
            className="waveform-bar"
            style={{
              height: `${Math.max(4, amp * 100)}%`,
              left: `${(i / bars.length) * 100}%`,
              width: `${100 / bars.length}%`,
              '--bar-index': i,
              '--total-bars': bars.length,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Played Progress Fill */}
      <div
        className="waveform-progress"
        style={{ width: `${played}%` }}
        aria-hidden="true"
      />

      {/* Buffered Progress Fill */}
      <div
        className="waveform-buffered"
        style={{ width: `${buffered}%` }}
        aria-hidden="true"
      />

      {/* A-B Loop Region */}
      {(abLoop.a !== null || abLoop.b !== null) && (
        <div
          className="waveform-loop-region"
          style={{
            left: `${loopA ?? 0}%`,
            width: `${(loopB ?? 100) - (loopA ?? 0)}%`,
          }}
          role="region"
          aria-label="A-B Loop Region"
        >
          <div className="waveform-loop-marker waveform-loop-a" aria-hidden="true" />
          <div className="waveform-loop-marker waveform-loop-b" aria-hidden="true" />
          <div className="waveform-loop-label">A-B Loop</div>
        </div>
      )}

      {/* Draggable A Marker */}
      {abLoop.a !== null && loopA !== null && (
        <button
          type="button"
          className="waveform-loop-marker-drag waveform-loop-a-drag"
          style={{ left: `${loopA}%` }}
          onPointerDown={(e) => handleLoopPointerDown(e, 'a')}
          aria-label="Loop start point A"
          tabIndex={0}
          onKeyDown={(e) => {
            if (!maximum) return;
            const step = maximum * 0.01;
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              onAbLoopChange?.({ a: Math.max(0, (abLoop.a ?? 0) - step), b: abLoop.b });
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              onAbLoopChange?.({
                a: Math.min(abLoop.b ?? maximum, (abLoop.a ?? 0) + step),
                b: abLoop.b,
              });
            }
          }}
        >
          <span className="waveform-loop-marker-label">A</span>
        </button>
      )}

      {/* Draggable B Marker */}
      {abLoop.b !== null && loopB !== null && (
        <button
          type="button"
          className="waveform-loop-marker-drag waveform-loop-b-drag"
          style={{ left: `${loopB}%` }}
          onPointerDown={(e) => handleLoopPointerDown(e, 'b')}
          aria-label="Loop end point B"
          tabIndex={0}
          onKeyDown={(e) => {
            if (!maximum) return;
            const step = maximum * 0.01;
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              onAbLoopChange?.({
                a: abLoop.a,
                b: Math.max(abLoop.a ?? 0, (abLoop.b ?? maximum) - step),
              });
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              onAbLoopChange?.({ a: abLoop.a, b: Math.min(maximum, (abLoop.b ?? maximum) + step) });
            }
          }}
        >
          <span className="waveform-loop-marker-label">B</span>
        </button>
      )}

      {/* Hover Tooltip */}
      {hoverTime !== null && hoverPos !== null && (
        <div
          className="waveform-tooltip"
          style={{ left: `${hoverPos}%` }}
          aria-hidden="true"
        >
          {formatTime(hoverTime)}
        </div>
      )}

      {/* Hover Preview Line */}
      {hoverPos !== null && (
        <div
          className="waveform-hover-line"
          style={{ left: `${hoverPos}%` }}
          aria-hidden="true"
        />
      )}

      {/* Current Time Indicator - White vertical playhead needle */}
      <div
        className="waveform-current-time"
        style={{ left: `${played}%` }}
        aria-hidden="true"
      >
        <div className="waveform-current-time-marker" />
        <div className="waveform-current-time-label">{formatTime(value)}</div>
      </div>

      {/* Hidden input for accessibility - hidden from AT since main div is slider */}
      <input
        type="range"
        aria-label="Playback position"
        aria-valuetext={`${formatTime(value)} of ${formatTime(maximum)}`}
        min={0}
        max={maximum || 1}
        step={0.1}
        value={value}
        disabled={!maximum}
        className="waveform-input"
        aria-hidden="true"
        data-testid="waveform-input"
        onChange={(e) => onSeek(Number(e.target.value))}
      />
    </div>
  );
}