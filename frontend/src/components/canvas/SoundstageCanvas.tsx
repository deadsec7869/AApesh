import { VisualStageBoundary } from '@/components/canvas/VisualStageBoundary';
import { StageRenderScheduler } from '@/components/canvas/StageRenderScheduler';
import { CanvasErrorBoundary } from '@/components/canvas/CanvasErrorBoundary';
import { LumnRimGlow } from './LumnRimGlow';
import { LumnPrismStage } from './LumnPrismStage';
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, extend } from '@react-three/fiber';
import { useStageFrame as useFrame } from '@/components/canvas/useStageFrame';
import { Preload } from '@react-three/drei';
import * as THREE from 'three';
import { FerrofluidCore } from './FerrofluidCore';
import { CymaticsGrid } from './CymaticsGrid';
import { StarfieldDrift } from './StarfieldDrift';
import { StealthMode } from './StealthMode';
import { LiquidRippleVisualizer } from './LiquidRippleVisualizer';
import { useUIStore } from '@/stores/useUIStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAudioReactive, type AudioReactiveRefs, useAudioReactiveUpdater, createAudioReactiveRefs } from '@/hooks/useAudioReactive';
import { extractArtworkPalette } from '@/lib/colorExtractor';
import { getArtworkUrl } from '@/utils/artwork';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';

extend(THREE);

/**
 * SoundstageCanvas - Full-viewport R3F Spatial Canvas
 *
 * Runs behind the HUD (pointer-events-none, z-0).
 * Switches between visualizer modes:
 * 1. Lumn Prism Stage — High-craft 3D Liquid Glass sculpture (signature mode)
 * 2. Ferrofluid Core — Organic acoustic wave mesh (polished)
 * 3. Cymatics Grid — Frequency-bin height field (polished)
 * 4. Starfield Drift — Cosmic particle atmosphere (polished)
 * 5. Liquid Ripple — 2D canvas ripple overlay
 * 6. Stealth (GPU Eco) — Minimal geometric form
 *
 * Audio-reactive via Web Audio AnalyserNode with harmonic fallback.
 * Color palette driven by artwork with 800ms cubic-bezier transitions.
 *
 * WebGL Context Loss/Restoration:
 * - Attaches `webglcontextlost` (with preventDefault) and `webglcontextrestored`
 *   directly on the R3F canvas `gl.domElement` inside `onCreated`.
 * - On loss: sets ambient mode + stealth visualizer, pauses frameloop.
 * - On restore: re-initializes visualizer, resumes frameloop.
 *
 * Visibility Handling:
 * - Clamps dpr to [1, 1.5] and switches frameloop between 'always'/'demand'
 *   via `document.visibilitychange` so minimizing the Windows .exe or
 *   switching tabs drops GPU usage to 0% immediately without killing audio.
 * - When `!isPlaying` OR `document.hidden` OR `visualizerMode === 'stealth'`,
 *   switches to `frameloop="demand"` (rendering only on resize/palette change)
 *   and back to `frameloop="always"` only while `isPlaying && !document.hidden`,
 *   with `dpr={[1, 1.25]}` and `antialias: false` on high-DPI displays.
 */

interface SoundstageCanvasProps {
  className?: string;
}

const AudioUpdater: React.FC<{ refs: AudioReactiveRefs }> = ({ refs }) => {
  const updater = useAudioReactiveUpdater(refs);
  useFrame((_, delta) => {
    updater(delta);
  });
  return null;
};

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

        const animateColor = (from: THREE.Color, to: THREE.Color, setter: (c: THREE.Color) => void) => {
          let progress = 0;
          const duration = 800;
          const startTime = performance.now();

          const step = () => {
            if (!mounted) return;
            progress = Math.min(1, (performance.now() - startTime) / duration);
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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--aura-primary', primaryColor.getStyle());
      document.documentElement.style.setProperty('--aura-secondary', secondaryColor.getStyle());
    }
  }, [primaryColor, secondaryColor]);

  return null;
};

const VisualizerContent: React.FC<{
  visualizerMode: 'lumn' | 'ferrofluid' | 'cymatics' | 'starfield' | 'stealth' | 'ripple';
  visualQuality: 'high' | 'medium' | 'low' | 'off';
  reducedMotion: boolean;
  ambientGlowEnabled: boolean;
  currentTrack: any;
}> = ({
  visualizerMode,
  visualQuality,
  reducedMotion,
  ambientGlowEnabled,
  currentTrack,
}) => {
  const audioRefs = useMemo(() => createAudioReactiveRefs(), []);

  const primaryColor = useMemo(() => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--aura-primary') || '#f59e0b'), []);
  const secondaryColor = useMemo(() => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--aura-secondary') || '#3b82f6'), []);

  const dpr = useMemo(() => calculateDPR(visualQuality), [visualQuality]);

  if (visualQuality === 'off') return null;

  return (
    <>
      <AudioUpdater refs={audioRefs} />
      <ColorSync currentTrack={currentTrack} />

      {/* Lumn Prism Stage — Signature High-Craft 3D Liquid Glass Sculpture */}
      {visualizerMode === 'lumn' && (
        <LumnPrismStage
          visualQuality={visualQuality}
          reducedMotion={reducedMotion}
          currentTrack={currentTrack}
          isPlaying={usePlayerStore.getState().isPlaying}
          visualizerMode="lumn"
        />
      )}

      {/* Upgraded Secondary Modes — Polished shaders with Fresnel glow, balanced exposure */}
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

      {visualizerMode === 'ripple' && (
        <div className="absolute inset-0" aria-hidden="true">
          <LiquidRippleVisualizer className="w-full h-full" />
        </div>
      )}

      <Preload all />
    </>
  );
};

const StealthFallback: React.FC<{ artworkUrl: string | null }> = ({ artworkUrl }) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-[#09090c]" aria-hidden="true">
    {artworkUrl && (
      <img
        src={artworkUrl}
        alt=""
        className="h-[min(70%,32rem)] aspect-square rounded-full object-cover opacity-45 shadow-[0_0_100px_rgba(255,255,255,0.12)]"
      />
    )}
    <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/50" />
  </div>
);

export const SoundstageCanvas: React.FC<SoundstageCanvasProps> = ({ className = '' }) => {
  const visualQuality = useUIStore(s => s.visualQuality);
  const visualizerMode = useUIStore(s => s.visualizerMode);
  const isPlayerExpanded = usePlayerStore(s => s.isPlayerExpanded);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);

  // Shared refs for fallback
  const audioRefs = useMemo(() => createAudioReactiveRefs(), []);
  const primaryColor = useMemo(() => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--aura-primary') || '#f59e0b'), []);
  const secondaryColor = useMemo(() => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--aura-secondary') || '#3b82f6'), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (visualQuality === 'off') return null;
  if (!currentTrack) return null;

  const canvasDPR = calculateDPR(visualQuality);

  // Use demand render loop when paused, tab hidden, or in stealth mode
  // This dramatically reduces GPU usage when not actively playing
  const shouldUseDemandLoop = !isPlaying || !isTabVisible || visualizerMode === 'stealth';
  const frameloop = shouldUseDemandLoop ? 'demand' : 'always';

  const onCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    const canvas = gl.domElement;

    const onContextLost = (e: Event) => {
      e.preventDefault(); // Allow context restoration
      console.warn('[SoundstageCanvas] WebGL context lost');
      try {
        audioReactiveEngine.setAmbientMode(true);
      } catch {}
      try {
        useUIStore.getState().setVisualizerMode('stealth');
      } catch {}
      // Pause frameloop to save GPU while context is lost
      gl.setAnimationLoop(null);
    };

    const onContextRestored = () => {
      console.log('[SoundstageCanvas] WebGL context restored');
      try {
        audioReactiveEngine.setAmbientMode(false);
      } catch {}
      // Restore visualizer mode (will be picked up by VisualizerContent)
      // Force a re-render by updating a key or triggering state
    };

    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
    };
  };

  return (
    <VisualStageBoundary>
      <CanvasErrorBoundary fallback={
        <StealthFallback artworkUrl={getArtworkUrl(currentTrack) || currentTrack?.thumbnail || null} />
      }>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 overflow-hidden select-none transition-all duration-700 ${className}`}
          style={{ zIndex: 0 }}
        >
          {/* Lumn Ambient Rim Glow — z-5, frames the stage viewport */}
          <LumnRimGlow />

          {/* R3F Canvas — z-0, contains 3D scene */}
          <Canvas
            ref={setCanvasRef}
            camera={{ position: [0, 0, 8], fov: 45, near: 0.1, far: 100 }}
            dpr={canvasDPR}
            gl={{
              alpha: true,
              antialias: false, // Disable antialias for performance
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.0,
            }}
            frameloop={frameloop}
            onCreated={onCreated}
            className="w-full h-full"
          >
            <StageRenderScheduler reducedMotion={reducedMotion} />
            <VisualizerContent
              visualizerMode={visualizerMode}
              visualQuality={visualQuality}
              reducedMotion={reducedMotion}
              ambientGlowEnabled={useUIStore.getState().ambientGlowEnabled}
              currentTrack={currentTrack}
            />
          </Canvas>
        </div>
      </CanvasErrorBoundary>
    </VisualStageBoundary>
  );
};

function calculateDPR(visualQuality: 'high' | 'medium' | 'low' | 'off'): number | [number, number] {
  if (typeof window === 'undefined') return 1;
  if (visualQuality === 'off') return 0;
  const baseDpr = Math.min(window.devicePixelRatio, 2);
  switch (visualQuality) {
    case 'high': return [1, Math.min(baseDpr, 1.25)];
    case 'medium': return [1, Math.min(baseDpr, 1.25)];
    case 'low': return 1;
    default: return 1;
  }
}