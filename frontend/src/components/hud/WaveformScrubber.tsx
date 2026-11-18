import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';

// Extend CanvasRenderingContext2D to include roundRect
declare global {
  interface CanvasRenderingContext2D {
    roundRect(x: number, y: number, w: number, h: number, radii: number | number[]): void;
  }
}

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
 * Elastic Liquid Waveform Scrubber
 *
 * Canvas-based waveform visualization with:
 * - Real-time playback progress overlay with aura gradient
 * - Hover timestamp tooltip with glass card
 * - Click/drag to seek with elastic spring physics
 * - Keyboard accessible (ArrowLeft/Right)
 * - Responsive to reduced motion
 * - Glowing progress fill with aura colors
 */

export const WaveformScrubber = ({
  waveformData,
  currentTime,
  duration,
  onSeek,
  loading = false,
  className = '',
  height = 44,
}: WaveformScrubberProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  // Set CSS custom properties via ref
  const setMousePosition = (x: string, y: string) => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--mouse-x', x);
      containerRef.current.style.setProperty('--mouse-y', y);
    }
  };

  // Reduced motion media query
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Initialize mouse position for fallback
  useEffect(() => {
    setMousePosition('50%', '50%');
  }, []);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = getComputedStyle(canvas);
    const primary = palette.getPropertyValue('--aura-primary-rgb').trim() || '99, 102, 241';
    const secondary = palette.getPropertyValue('--aura-secondary-rgb').trim() || primary;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const maxAmplitude = height * 0.35;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (loading) {
      // Loading shimmer
      const time = Date.now() / 1000;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'rgba(255,255,255,0.03)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.08)');
      gradient.addColorStop(1, 'rgba(255,255,255,0.03)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const data = waveformData;
    const barWidth = Math.max(1, width / data.length);
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressX = progress * width;

    // Draw waveform bars with elastic liquid effect
    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth;
      const amplitude = data[i] * maxAmplitude;
      const barHeight = Math.max(2, amplitude);

      // Determine color based on progress
      const isPlayed = x < progressX;
      const baseColor = isPlayed
        ? `rgba(${primary}, ${0.8 + 0.2 * Math.sin(Date.now() / 200 + i * 0.1)})`
        : 'rgba(255, 255, 255, 0.12)';

      // Elastic liquid bar with rounded caps
      const barX = x + barWidth * 0.15;
      const barW = barWidth * 0.7;
      const radius = barW / 2;

      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.roundRect(barX, centerY - barHeight / 2, barW, barHeight, radius);
      ctx.fill();
    }

    // Draw progress fill with aura gradient
    if (progress > 0) {
      const gradient = ctx.createLinearGradient(0, 0, progressX, 0);
      gradient.addColorStop(0, `rgb(${primary})`);
      gradient.addColorStop(0.5, `rgba(${primary}, 0.8)`);
      gradient.addColorStop(1, `rgb(${secondary})`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(0, centerY - 3, progressX, 6, 3);
      ctx.fill();
    }

    // Draw playhead with elastic droplet
    if (!isDragging) {
      const dropletSize = 14 + Math.sin(Date.now() / 150) * 1.5;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = `rgb(${primary})`;
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.beginPath();
      ctx.ellipse(progressX, centerY, dropletSize / 2, dropletSize / 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(progressX - dropletSize * 0.2, centerY - dropletSize * 0.2, dropletSize * 0.3, dropletSize * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }
  }, [waveformData, currentTime, duration, loading, height]);

  // Animate progress width for smooth elastic feel
  useEffect(() => {
    if (duration > 0) {
      const targetProgress = (currentTime / duration) * 100;
      setProgressWidth(targetProgress);
    }
  }, [currentTime, duration]);

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration <= 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const time = progress * duration;
    setHoverTime(time);
    setIsHovering(true);

    // Update CSS custom properties for specular spotlight
    const percentX = `${(x / rect.width) * 100}%`;
    const percentY = `${(e.clientY / rect.height) * 100}%`;
    setMousePosition(percentX, percentY);
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
      const handleDrag = (e: MouseEvent) => {
        if (!canvasRef.current || duration <= 0) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, x / rect.width));
        onSeek(progress * duration);
      };

      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, duration, onSeek]);

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
        ref={containerRef}
        className={`liquid-glass-interactive relative px-2 ${className}`}
        style={{ height }}
      role="slider"
        aria-label="Playback progress"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="absolute inset-0 rounded-full bg-white/5" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full transition-all duration-300 ease-spring-gentle"
          style={{
            width: `${progressWidth}%`,
            background: 'linear-gradient(90deg, rgb(var(--aura-primary-rgb)) 0%, rgb(var(--aura-secondary-rgb)) 100%)',
            borderRadius: '9999px',
          }}
        />
        {isHovering && hoverTime !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-xl whitespace-nowrap pointer-events-none z-10 liquid-glass-elevated"
          >
            <div className="flex items-center gap-2">
              <span className="liquid-time">{formatTime(hoverTime)}</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/10 text-white/70">
                / {formatTime(duration)}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative px-2 ${className}`}
      style={{ height }}
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
        className="block w-full h-full cursor-pointer select-none"
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-xl whitespace-nowrap pointer-events-none z-10 liquid-glass-elevated"
        >
          <div className="flex items-center gap-2">
            <span className="liquid-time">{formatTime(hoverTime)}</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/10 text-white/70">
              / {formatTime(duration)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Progress indicator for reduced motion / visual reference */}
      {reducedMotion && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/10 w-full"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full transition-all duration-300 ease-spring-gentle"
            style={{
              width: `${progressWidth}%`,
              background: 'linear-gradient(90deg, rgb(var(--aura-primary-rgb)) 0%, rgb(var(--aura-secondary-rgb)) 100%)',
              borderRadius: '9999px',
            }}
          />
        </div>
      )}

      {/* Live progress bar overlay for elastic feel */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-2 w-full pointer-events-none"
        style={{
          background: `linear-gradient(90deg, rgb(var(--aura-primary-rgb)) 0%, rgb(var(--aura-secondary-rgb)) 100%)`,
          width: `${progressWidth}%`,
          borderRadius: '9999px',
          opacity: 0.15,
        }}
      />
    </div>
  );
};