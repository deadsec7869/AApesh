import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { QualityProfile } from './qualitySettings';
import { CinematicLightingController } from './cinematicLighting';
import { ArtworkCard3D } from './ArtworkCard3D';
import { AtmosphereDust } from './AtmosphereDust';
import { SceneLighting } from './SceneLighting';
import { FluidColorField3D } from './FluidColorField3D';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';

// Keep optional heavyweight effects out of the core artwork-scene download.
// They remain available when the selected quality profile enables them.
const SpatialPhysicsDebris = React.lazy(() =>
  import('./SpatialPhysicsDebris').then((module) => ({
    default: module.SpatialPhysicsDebris,
  })),
);
const CinematicPostProcessing = React.lazy(() =>
  import('./CinematicPostProcessing').then((module) => ({
    default: module.CinematicPostProcessing,
  })),
);

interface SpatialSceneProps {
  quality: QualityProfile;
}

const AudioEngineUpdater: React.FC = () => {
  useFrame((_, delta) => {
    const s = usePlayerStore.getState();
    audioReactiveEngine.update(delta, {
      isPlaying: s.isPlaying,
      isBuffering: s.isBuffering,
      currentTime: s.currentTime,
      duration: s.duration,
      volume: s.isMuted ? 0 : s.volume,
      trackId: s.currentTrack?.videoId,
    });
  });
  return null;
};

export const SpatialScene: React.FC<SpatialSceneProps> = ({ quality }) => {
  const lightingController = useMemo(() => new CinematicLightingController(), []);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const isPlayerExpanded = usePlayerStore((s) => s.isPlayerExpanded);

  // Pointer position ref for smooth damped parallax without per-frame React re-renders
  const mouseRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  // 1. Reduced motion media query check
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 2. Passive pointer tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (reducedMotion) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = nx;
      mouseRef.current.targetY = ny;

      // Restrained lerping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reducedMotion]);

  // 3. Tab visibility listener to pause canvas rendering on background tab
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (!quality.enabled) {
    return null;
  }

  const dpr = typeof window !== 'undefined'
    ? Math.min(window.devicePixelRatio, quality.maxPixelRatio)
    : 1;

  return (
    <div
      aria-hidden="true"
      style={{ zIndex: isPlayerExpanded ? 42 : 0 }}
      className="pointer-events-none fixed inset-0 overflow-hidden select-none transition-all duration-700"
    >
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 45, near: 0.1, far: 50 }}
        dpr={dpr}
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
        {/* Core Audio Reactive Update Loop (60fps continuous) */}
        <AudioEngineUpdater />

        {/* Cinematic Scene Lighting */}
        <SceneLighting
          lightingController={lightingController}
          reducedMotion={reducedMotion}
        />

        {/* Layer C: Beat-Reactive Organic 3D Fluid Color Field */}
        <FluidColorField3D
          quality={quality}
          reducedMotion={reducedMotion}
        />

        {/* 3D Central Album Artwork Card (Workstation Mode) */}
        <ArtworkCard3D
          quality={quality}
          reducedMotion={reducedMotion}
          mouseRef={mouseRef}
          lightingController={lightingController}
        />

        {/* Spatial Atmosphere Particle Dust & Geometry */}
        <AtmosphereDust
          quality={quality}
          reducedMotion={reducedMotion}
          lightingController={lightingController}
        />

        {/* Selective Rapier Physics Floating Micro-Objects */}
        {quality.enablePhysics && !reducedMotion && (
          <React.Suspense fallback={null}>
            <SpatialPhysicsDebris
              quality={quality}
              reducedMotion={reducedMotion}
              mouseRef={mouseRef}
            />
          </React.Suspense>
        )}

        {/* Cinematic Post-Processing Effects */}
        {quality.enablePostProcessing && (
          <React.Suspense fallback={null}>
            <CinematicPostProcessing quality={quality} />
          </React.Suspense>
        )}

        <Preload all />
      </Canvas>
    </div>
  );
};
