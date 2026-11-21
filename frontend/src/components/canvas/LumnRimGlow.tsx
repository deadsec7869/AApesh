import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAudioReactive, createAudioReactiveRefs, useAudioReactiveUpdater } from '@/hooks/useAudioReactive';

/**
 * LumnRimGlow — Signature Ambient Rim Lighting System
 *
 * Continuous, silky 2-color rotating/breathing ambient rim light spilling softly
 * inward from all 4 edges of the stage frame, automatically sampling primary &
 * secondary colors from the active track's album artwork.
 *
 * Modes:
 * - Music Sync: Beat-reactive pulse + tempo-synced color rotation
 * - Idle: Slow organic hue drift + breathing opacity
 * - Still: Static ambient glow
 *
 * Controlled via Lumn Light popover in TopStudioBar (thickness, intensity, mode, custom colors).
 */
interface LumnRimGlowProps {
  className?: string;
}

export const LumnRimGlow: React.FC<LumnRimGlowProps> = ({ className = '' }) => {
  const { lumnMode, lumnThickness, lumnIntensity, lumnColorSync, lumnCustomPrimary, lumnCustomSecondary } = useUIStore();
  const { currentTrack, isPlaying } = usePlayerStore();

  // Audio reactive refs for beat detection
  const audioRefs = useMemo(() => createAudioReactiveRefs(), []);
  const [beatPulse, setBeatPulse] = useState(0);
  const [hueShift, setHueShift] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState(0);

  // Resolve current colors (CSS vars or custom)
  const primaryColor = lumnColorSync
    ? (typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--lumn-primary').trim() || '#f59e0b' : '#f59e0b')
    : lumnCustomPrimary || '#f59e0b';
  const secondaryColor = lumnColorSync
    ? (typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--lumn-secondary').trim() || '#3b82f6' : '#3b82f6')
    : lumnCustomSecondary || '#3b82f6';

  // Convert hex to HSL for hue shifting
  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s, l };
  };

  const hslToCss = (h: number, s: number, l: number) => `hsl(${h % 360}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;

  // Animation loop for Idle mode (hue drift + breathing)
  useEffect(() => {
    if (lumnMode !== 'idle') return;

    let raf: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Slow hue rotation: 0.5° per frame at 60fps = ~30°/s
      setHueShift(prev => (prev + 0.5 * 60 * dt) % 360);

      // Breathing opacity: 4s period
      setBreathingPhase(prev => (prev + dt / 4) % 1);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lumnMode]);

  // Beat-reactive pulse for Music Sync mode
  useEffect(() => {
    if (lumnMode !== 'music-sync' || !isPlaying) return;

    const updater = useAudioReactiveUpdater(audioRefs);
    let raf: number;
    let lastTime = performance.now();
    let pulseDecay = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      updater(dt);

      // Check for beat onset (low freq energy spike)
      const lowFreq = audioRefs.features.bassEnergy;
      const beatThreshold = 0.65;

      if (lowFreq > beatThreshold && pulseDecay <= 0) {
        pulseDecay = 0.15; // 150ms pulse
        setBeatPulse(1);
      }

      if (pulseDecay > 0) {
        pulseDecay -= dt;
        setBeatPulse(Math.max(0, pulseDecay / 0.15));
      }

      // Tempo-synced color rotation (subtle)
      setHueShift(prev => (prev + 0.8 * 60 * dt) % 360);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lumnMode, isPlaying, audioRefs]);

  // Still mode: no animation, just static
  useEffect(() => {
    if (lumnMode === 'still') {
      setBeatPulse(0);
      setHueShift(0);
      setBreathingPhase(0);
    }
  }, [lumnMode]);

  // Apply hue shift to colors
  const primaryHsl = hexToHsl(primaryColor);
  const secondaryHsl = hexToHsl(secondaryColor);

  const shiftedPrimary = hslToCss(
    (primaryHsl.h + hueShift) % 360,
    primaryHsl.s,
    primaryHsl.l
  );
  const shiftedSecondary = hslToCss(
    (secondaryHsl.h + hueShift) % 360,
    secondaryHsl.s,
    secondaryHsl.l
  );

  // Calculate opacity based on mode and intensity
  const baseOpacity = lumnIntensity / 100 * 0.6;
  const pulseBoost = beatPulse * 0.3;
  const breathingBoost = lumnMode === 'idle' ? Math.sin(breathingPhase * Math.PI * 2) * 0.05 : 0;
  const finalOpacity = Math.min(0.95, baseOpacity + pulseBoost + breathingBoost);

  // Thickness in pixels (1-24)
  const thickness = lumnThickness;
  const blur = thickness * 2; // blur = 2x thickness for soft spill

  // Gradient stops for 4 edges
  const edgeGradients = {
    top: `linear-gradient(90deg, transparent 0%, ${shiftedPrimary} 25%, ${shiftedSecondary} 75%, transparent 100%)`,
    right: `linear-gradient(180deg, transparent 0%, ${shiftedPrimary} 25%, ${shiftedSecondary} 75%, transparent 100%)`,
    bottom: `linear-gradient(90deg, transparent 0%, ${shiftedSecondary} 25%, ${shiftedPrimary} 75%, transparent 100%)`,
    left: `linear-gradient(180deg, transparent 0%, ${shiftedSecondary} 25%, ${shiftedPrimary} 75%, transparent 100%)`,
  };

  // Pulse scale for Music Sync
  const pulseScale = lumnMode === 'music-sync' && beatPulse > 0
    ? 1 + beatPulse * 0.02
    : 1;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none transition-all duration-700 ${className}`}
      style={{
        zIndex: 5,
        borderRadius: '20px', // matches stage radius
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {/* Top edge */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: thickness,
          background: edgeGradients.top,
          opacity: finalOpacity,
          filter: `blur(${blur}px)`,
          transform: `scaleX(${pulseScale})`,
          transformOrigin: 'center',
          transition: 'opacity 0.15s ease-out, transform 0.1s ease-out',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
        }}
      />

      {/* Right edge */}
      <div
        className="absolute top-0 right-0 bottom-0"
        style={{
          width: thickness,
          background: edgeGradients.right,
          opacity: finalOpacity,
          filter: `blur(${blur}px)`,
          transform: `scaleY(${pulseScale})`,
          transformOrigin: 'center',
          transition: 'opacity 0.15s ease-out, transform 0.1s ease-out',
          borderTopRightRadius: '20px',
          borderBottomRightRadius: '20px',
        }}
      />

      {/* Bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: thickness,
          background: edgeGradients.bottom,
          opacity: finalOpacity,
          filter: `blur(${blur}px)`,
          transform: `scaleX(${pulseScale})`,
          transformOrigin: 'center',
          transition: 'opacity 0.15s ease-out, transform 0.1s ease-out',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px',
        }}
      />

      {/* Left edge */}
      <div
        className="absolute top-0 left-0 bottom-0"
        style={{
          width: thickness,
          background: edgeGradients.left,
          opacity: finalOpacity,
          filter: `blur(${blur}px)`,
          transform: `scaleY(${pulseScale})`,
          transformOrigin: 'center',
          transition: 'opacity 0.15s ease-out, transform 0.1s ease-out',
          borderTopLeftRadius: '20px',
          borderBottomLeftRadius: '20px',
        }}
      />

      {/* Corner highlights — subtle specular catches at 4 corners */}
      {['top-left', 'top-right', 'bottom-right', 'bottom-left'].map((corner) => (
        <div
          key={corner}
          className="absolute w-16 h-16 rounded-full pointer-events-none"
          style={{
            [corner.includes('top') ? 'top' : 'bottom']: 0,
            [corner.includes('left') ? 'left' : 'right']: 0,
            background: `radial-gradient(circle at ${corner.includes('left') ? '0%' : '100%'} ${corner.includes('top') ? '0%' : '100%'}, ${shiftedPrimary} 0%, ${shiftedSecondary} 50%, transparent 100%)`,
            opacity: finalOpacity * 0.4,
            filter: `blur(${thickness}px)`,
            transform: `scale(${pulseScale})`,
          }}
        />
      ))}
    </div>
  );
};