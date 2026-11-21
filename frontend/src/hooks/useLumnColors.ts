import { useState, useEffect, useRef, useCallback } from 'react';
import { extractArtworkPalette } from '@/lib/colorExtractor';
import { getArtworkUrl } from '@/utils/artwork';

interface LumnColors {
  primary: string;
  secondary: string;
  glow: string;
}

interface UseLumnColorsOptions {
  currentTrack: any;
  ambientGlowEnabled: boolean;
  transitionDuration?: number;
}

/**
 * useLumnColors — Artwork-driven color extraction with smooth 800ms cubic-bezier transitions
 *
 * Samples primary & secondary colors from the active track's album artwork and exposes
 * them as CSS custom properties (--lumn-primary, --lumn-secondary, --lumn-glow) for
 * global consumption by LumnRimGlow, LumnPrismStage, and UI components.
 *
 * Transitions use cubic-bezier(0.34, 1.4, 0.64, 1) for that signature "springy" Lumn feel.
 */
export function useLumnColors({
  currentTrack,
  ambientGlowEnabled,
  transitionDuration = 800,
}: UseLumnColorsOptions) {
  const [colors, setColors] = useState<LumnColors>({
    primary: '#f59e0b',   // default amber
    secondary: '#3b82f6', // default blue
    glow: 'rgba(245, 158, 11, 0.12)',
  });

  const animationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Parse hex to RGB components for interpolation
  const hexToRgb = useCallback((hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return [
      (bigint >> 16) & 255,
      (bigint >> 8) & 255,
      bigint & 255,
    ];
  }, []);

  // Interpolate between two colors with spring easing
  const animateColor = useCallback((
    from: string,
    to: string,
    setter: (color: string) => void,
    duration: number = transitionDuration
  ) => {
    const [fr, fg, fb] = hexToRgb(from);
    const [tr, tg, tb] = hexToRgb(to);
    const startTime = performance.now();

    const step = () => {
      if (!mountedRef.current) return;
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Spring easing: cubic-bezier(0.34, 1.4, 0.64, 1)
      const eased = 1 - Math.pow(1 - progress, 3) * (1 - progress) * 0.4;

      const r = Math.round(fr + (tr - fr) * eased);
      const g = Math.round(fg + (tg - fg) * eased);
      const b = Math.round(fb + (tb - fb) * eased);

      setter(`rgb(${r}, ${g}, ${b})`);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    };
    step();
  }, [hexToRgb, transitionDuration]);

  // Extract and apply colors from artwork
  const updateColors = useCallback(async () => {
    if (!ambientGlowEnabled || !currentTrack) return;

    const artworkUrl = getArtworkUrl(currentTrack) || currentTrack?.thumbnail;
    if (!artworkUrl) return;

    try {
      const palette = await extractArtworkPalette(artworkUrl, currentTrack.title);

      if (!mountedRef.current) return;

      const primary = palette.primary;
      const glowRgb = palette.glow.replace(/rgba?\(([^)]+)\)/, '$1').split(',').map(Number);
      const secondary = `rgb(${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]})`;

      // Animate both colors simultaneously
      animateColor(colors.primary, primary, (c) => {
        setColors(prev => ({ ...prev, primary: c }));
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--lumn-primary', c);
        }
      });

      animateColor(colors.secondary, secondary, (c) => {
        setColors(prev => ({ ...prev, secondary: c }));
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--lumn-secondary', c);
        }
      });

      // Update glow immediately (no animation needed for alpha)
      const glow = `rgba(${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]}, 0.12)`;
      setColors(prev => ({ ...prev, glow }));
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--lumn-glow', glow);
      }
    } catch (e) {
      console.warn('[useLumnColors] Color extraction failed:', e);
    }
  }, [currentTrack?.videoId, ambientGlowEnabled, colors.primary, colors.secondary, animateColor]);

  // Trigger on track change
  useEffect(() => {
    updateColors();
  }, [updateColors]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Expose current colors and manual trigger
  return {
    colors,
    updateColors,
    setPrimary: (color: string) => {
      setColors(prev => ({ ...prev, primary: color }));
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--lumn-primary', color);
      }
    },
    setSecondary: (color: string) => {
      setColors(prev => ({ ...prev, secondary: color }));
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--lumn-secondary', color);
      }
    },
    setGlow: (color: string) => {
      setColors(prev => ({ ...prev, glow: color }));
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--lumn-glow', color);
      }
    },
  };
}