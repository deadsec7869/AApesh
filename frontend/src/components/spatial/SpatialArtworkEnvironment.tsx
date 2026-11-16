import React, { useState, useEffect, Suspense } from 'react';
import { useThemeStore } from '@/stores/useThemeStore';
import { QUALITY_PROFILES, VisualQuality } from './qualitySettings';
import { SpatialDebugHud } from './SpatialDebugHud';

// Keep Three/R3F and the renderer's transitive dependencies out of the
// environment shell. They are requested only when the spatial layer is used.
const SpatialScene = React.lazy(() =>
  import('./SpatialScene').then((module) => ({ default: module.SpatialScene })),
);

export const SpatialArtworkEnvironment: React.FC = () => {
  const { ambientGlow, visualQuality } = useThemeStore();
  const [debugHudOpen, setDebugHudOpen] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(false);

  // Check WebGL availability on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setHasWebGL(Boolean(gl));
    } catch {
      setHasWebGL(false);
    }
  }, []);

  // Keyboard shortcut: Ctrl+Shift+D or ~ to toggle Debug Diagnostics HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setDebugHudOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!ambientGlow || !hasWebGL || visualQuality === 'off') {
    return null;
  }

  const profile = QUALITY_PROFILES[visualQuality] || QUALITY_PROFILES.high;

  return (
    <>
      {/* 3D Spatial R3F WebGL Layer */}
      <Suspense fallback={null}>
        <SpatialScene quality={profile} />
      </Suspense>

      {/* Development / Diagnostics Debug HUD */}
      <SpatialDebugHud
        quality={profile}
        isOpen={debugHudOpen}
        onClose={() => setDebugHudOpen(false)}
      />
    </>
  );
};
