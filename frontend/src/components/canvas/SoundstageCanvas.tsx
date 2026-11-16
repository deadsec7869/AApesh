import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import * as THREE from 'three';
import { FerrofluidCore } from './FerrofluidCore';
import { CymaticsGrid } from './CymaticsGrid';
import { StarfieldDrift } from './StarfieldDrift';
import { StealthMode } from './StealthMode';
import { useUIStore } from '@/stores/useUIStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAudioReactive, type AudioReactiveRefs, useAudioReactiveUpdater, createAudioReactiveRefs } from '@/hooks/useAudioReactive';
import { extractArtworkPalette } from '@/lib/colorExtractor';
import { getArtworkUrl } from '@/utils/artwork';

/**
 * SoundstageCanvas - Full-viewport R3F Spatial Canvas
 *
 * Runs behind the HUD (pointer-events-none, z-0).
 * Switches between 4 visualizer modes:
 * 1. Ferrofluid Core - Organic acoustic wave mesh
 * 2. Cymatics Grid - Frequency-bin height field
 * 3. Starfield Drift - Cosmic particle atmosphere
 * 4. Stealth (GPU Eco) - Minimal geometric form
 *
 * Audio-reactive via Web Audio AnalyserNode with harmonic fallback.
 * Color palette driven by artwork with 800ms cubic-bezier transitions.
 */

interface SoundstageCanvasProps {
  className?: string;
}

// Internal component that holds the audio refs and updates them
const AudioUpdater: React.FC<{ refs: AudioReactiveRefs }> = ({ refs }) => {
  const updater = useAudioReactiveUpdater(refs);
  useFrame((_, delta) => {
    updater(delta);
  });
  return null;
};

// Color sync effect - drives CSS custom properties
const ColorSync: React.FC<{ currentTrack: any }> = ({ currentTrack }) => {
  const { ambientGlowEnabled } = useUIStore();
  const [primaryColor, setPrimaryColor] = useState<THREE.Color>(new THREE.Color('#f59e0b'));
  const [secondaryColor, setSecondaryColor] = useState<THREE.Color>(new THREE.Color('#3b82f6'));

  useEffect(() => {
    if (!ambientGlowEnabled || !currentTrack) return;

    let mounted = true;
    let animationId: number;

    const updateColors = async () => {
      const artworkUrl = getArtworkUrl(currentTrack) || currentTrack?.thumbnail;
      if (!artworkUrl) return;

      try {
        const palette = await extractArtworkPalette(artworkUrl, currentTrack.title);
        if (!mounted) return;

        const primary = new THREE.Color(palette.primary);
        const glowRgb = palette.glow.replace(/rgba?\(([^)]+)\)/, '$1').split(',').map(Number);
        const secondary = new THREE.Color(`rgb(${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]})`);

        // Smooth interpolation over ~800ms
        const animateColor = (from: THREE.Color, to: THREE.Color, setter: (c: THREE.Color) => void) => {
          let progress = 0;
          const duration = 800; // ms
          const startTime = performance.now();

          const step = () => {
            if (!mounted) return;
            progress = Math.min(1, (performance.now() - startTime) / duration);
            // Cubic-bezier(0.16, 1, 0.3, 1) approximation
            const eased = 1 - Math.pow(1 - progress, 3);
            const temp = from.clone().lerp(to, eased);
            setter(temp);
            if (progress < 1) {
              animationId = requestAnimationFrame(step);
            }
          };
          step();
        };

        animateColor(primaryColor, primary, setPrimaryColor);
        animateColor(secondaryColor, secondary, setSecondaryColor);
      } catch (e) {
        console.warn('Color extraction failed:', e);
      }
    };

    updateColors();

    return () => {
      mounted = false;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [currentTrack?.videoId, ambientGlowEnabled]);

  // Apply to CSS custom properties
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--aura-primary', primaryColor.getStyle());
      document.documentElement.style.setProperty('--aura-secondary', secondaryColor.getStyle());
    }
  }, [primaryColor, secondaryColor]);

  return null;
};

const VisualizerContent: React.FC = () => {
  const { visualizerMode, visualQuality, reducedMotion, ambientGlowEnabled } = useUIStore();
  const { currentTrack } = usePlayerStore();

  // Audio reactive refs (mutable, updated at 60fps via useFrame)
  const audioRefs = useMemo(() => createAudioReactiveRefs(), []);

  // Colors for visualizers (from CSS custom properties)
  const primaryColor = useMemo(() => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--aura-primary') || '#f59e0b'), []);
  const secondaryColor = useMemo(() => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--aura-secondary') || '#3b82f6'), []);

  // DPR clamp based on quality
  const dpr = useMemo(() => calculateDPR(visualQuality), [visualQuality]);

  if (visualQuality === 'off') return null;

  return (
    <>
      <AudioUpdater refs={audioRefs} />
      <ColorSync currentTrack={currentTrack} />

      {visualizerMode === 'ferrofluid' && (
        <FerrofluidCore
          quality={visualQuality}
          reducedMotion={reducedMotion}
          audioRefs={audioRefs}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}

      {visualizerMode === 'cymatics' && (
        <CymaticsGrid
          quality={visualQuality}
          reducedMotion={reducedMotion}
          audioRefs={audioRefs}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}

      {visualizerMode === 'starfield' && (
        <StarfieldDrift
          quality={visualQuality}
          reducedMotion={reducedMotion}
          audioRefs={audioRefs}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}

      {visualizerMode === 'stealth' && (
        <StealthMode
          quality={visualQuality}
          reducedMotion={reducedMotion}
          audioRefs={audioRefs}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}

      <Preload all />
    </>
  );
};

export const SoundstageCanvas: React.FC<SoundstageCanvasProps> = ({ className = '' }) => {
  const { visualQuality, isPlayerExpanded } = useUIStore();
  const { currentTrack } = usePlayerStore();

  // Reduced motion media query
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Tab visibility
  const [isTabVisible, setIsTabVisible] = useState(true);
  useEffect(() => {
    const handleVisibility = () => setIsTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (visualQuality === 'off') return null;
  if (!currentTrack) return null;

  const canvasDPR = calculateDPR(visualQuality);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 overflow-hidden select-none transition-all duration-700 ${className}`}
      style={{ zIndex: isPlayerExpanded ? 42 : 0 }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45, near: 0.1, far: 100 }}
        dpr={canvasDPR}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        frameloop={isTabVisible ? 'always' : 'never'}
        className="w-full h-full"
      >
        <VisualizerContent />
      </Canvas>
    </div>
  );
};

// DPR calculation
function calculateDPR(visualQuality: 'high' | 'medium' | 'low' | 'off'): number {
  if (typeof window === 'undefined') return 1;
  if (visualQuality === 'off') return 0;
  const baseDpr = Math.min(window.devicePixelRatio, 2);
  switch (visualQuality) {
    case 'high': return baseDpr;
    case 'medium': return Math.min(baseDpr, 1.5);
    case 'low': return Math.min(baseDpr, 1);
    default: return 1;
  }
}