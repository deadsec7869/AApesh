import React, { useRef, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';

interface WaveformScrubberProps {
  /** Waveform data as normalized array (0-1) */
  waveformData: number[] | null;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Callback when user seeks */
  onSeek: (time: number) => void;
  /** Whether waveform is loading */
  loading?: boolean;
  /** Class name */
  className?: string;
  /** Height of the waveform */
  height?: number;
}

/**
 * WaveformScrubber - Interactive Waveform with Hover Preview
 *
 * Canvas-based waveform visualization with:
 * - Real-time playback progress overlay
 * - Hover timestamp tooltip
 * - Click/drag to seek
 * - Keyboard accessible (ArrowLeft/Right)
 * - Responsive to reduced motion
 */

export const WaveformScrubber: React.FC<WaveformScrubberProps> = ({
  waveformData,
  currentTime,
  duration,
  onSeek,
  loading = false,
  className = '',
  height = 48,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Reduced motion media query
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const maxAmplitude = height * 0.4;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (loading) {
      // Loading shimmer
      const time = Date.now() / 1000;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const data = waveformData;
    const barWidth = Math.max(1, width / data.length);
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressX = progress * width;

    // Draw waveform bars
    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth;
      const amplitude = data[i] * maxAmplitude;
      const barHeight = Math.max(1, amplitude);

      // Determine color based on progress
      const isPlayed = x < progressX;
      const baseColor = isPlayed ? '#FFFFFF' : 'rgba(255, 255, 255, 0.18)';

      ctx.fillStyle = baseColor;
      ctx.fillRect(
        x + barWidth * 0.1,
        centerY - barHeight / 2,
        barWidth * 0.8,
        barHeight
      );
    }

    // Draw playhead
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Playhead circle
    ctx.beginPath();
    ctx.arc(progressX, centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#050507';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [waveformData, currentTime, duration, loading, height]);

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration <= 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const time = progress * duration;
    setHoverTime(time);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoverTime(null);
  };

  // Handle click/drag to seek
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration <= 0) return;
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    onSeek(progress * duration);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleDrag = (e: MouseEvent) => {
    if (!canvasRef.current || duration <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    onSeek(progress * duration);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (duration <= 0) return;
    const seekAmount = 5; // seconds
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - seekAmount));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(duration, currentTime + seekAmount));
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!waveformData && !loading) {
    return (
      <div
        className={`relative h-${height} px-2 ${className}`}
        role="slider"
        aria-label="Playback progress"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="absolute inset-0 rounded-full bg-white/10" />
        <div
          className="absolute top-0 bottom-0 rounded-full bg-white transition-all duration-100"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        />
        {isHovering && hoverTime !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap pointer-events-none"
            style={{
              background: 'rgba(14, 15, 20, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
            }}
          >
            {formatTime(hoverTime)} / {formatTime(duration)}
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative h-${height} px-2 ${className}`}
      role="slider"
      aria-label="Playback progress"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ touchAction: 'none' }}
        aria-hidden="true"
      />

      {/* Hover Tooltip */}
      {isHovering && hoverTime !== null && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-10"
          style={{
            background: 'rgba(14, 15, 20, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">{formatTime(hoverTime)}</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              / {formatTime(duration)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Progress indicator for reduced motion */}
      {reducedMotion && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-white/10 w-full"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-white transition-all duration-100"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      )}
    </div>
  );
};