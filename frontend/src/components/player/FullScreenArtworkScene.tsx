import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Track } from '@/types/music';
import { getArtworkUrl } from '@/utils/artwork';
import { getHighestResArtworkUrl } from '@/components/layout/DynamicArtworkBackground';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';

interface FullScreenArtworkSceneProps {
  currentTrack: Track;
  isPlaying: boolean;
  reducedMotion: boolean;
}

const preloadCache = new Set<string>();

/**
 * FullScreenArtworkScene — AAPESH Cinematic Workstation Visual Centerpiece
 * Inspired by 21st.dev components:
 * - "Aurora" & "Glass Fold" (Fluid artwork-derived multi-stop chromatic ambient fields)
 * - "Optimized Tilt Card" & "Holo Card" (Restrained 3D parallax tilt, dynamic specular glare, contact shadow)
 */
export const FullScreenArtworkScene: React.FC<FullScreenArtworkSceneProps> = ({
  currentTrack,
  isPlaying,
  reducedMotion,
}) => {
  const atmospherePalette = usePlayerStore((s) => s.atmospherePalette);
  const visualQuality = useThemeStore((s) => s.visualQuality);

  const currentArtworkUrl = getHighestResArtworkUrl(currentTrack) || getArtworkUrl(currentTrack);

  // Dual-layer crossfading background for Layer A
  const [activeBg, setActiveBg] = useState<string | null>(currentArtworkUrl || null);
  const [prevBg, setPrevBg] = useState<string | null>(null);
  const [isCrossfadingBg, setIsCrossfadingBg] = useState(false);
  const bgTimerRef = useRef<any>(null);

  // 3D Parallax Tilt & Glare state (AAPESH restraint: max ±4.2 deg, damped with lerp)
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });
  const [isPointerHovered, setIsPointerHovered] = useState(false);

  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const currentTiltRef = useRef({ x: 0, y: 0 });

  // Beat-reactive scale and edge luminescence
  const [beatScale, setBeatScale] = useState(1.0);
  const [transientRim, setTransientRim] = useState(0.0);

  // Organic ambient fluid drift offset (slow harmonic orbits for fluid color fields)
  const [fluidDrift, setFluidDrift] = useState({ x1: 0, y1: 0, x2: 0, y2: 0 });

  // 1. Preload & crossfade background artwork seamlessly
  useEffect(() => {
    if (!currentArtworkUrl) return;
    if (currentArtworkUrl === activeBg) return;

    const executeCrossfade = () => {
      setPrevBg(activeBg);
      setActiveBg(currentArtworkUrl);
      setIsCrossfadingBg(true);

      if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
      bgTimerRef.current = setTimeout(() => {
        setPrevBg(null);
        setIsCrossfadingBg(false);
      }, 950);
    };

    if (preloadCache.has(currentArtworkUrl)) {
      executeCrossfade();
    } else {
      const img = new Image();
      img.src = currentArtworkUrl;
      img.onload = () => {
        preloadCache.add(currentArtworkUrl);
        executeCrossfade();
      };
      img.onerror = () => {
        executeCrossfade();
      };
    }

    return () => {
      if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
    };
  }, [currentArtworkUrl, activeBg]);

  // 2. Passive pointer & touch tracking for restrained 3D parallax tilt
  useEffect(() => {
    if (reducedMotion) return;

    const handlePointerMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseTargetRef.current.x = nx;
      mouseTargetRef.current.y = ny;

      // Update card-local specular glare if pointer is interacting with the card
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          setIsPointerHovered(true);
          const localX = ((e.clientX - rect.left) / rect.width) * 100;
          const localY = ((e.clientY - rect.top) / rect.height) * 100;
          setGlarePosition({ x: localX, y: localY, opacity: 0.16 });
        } else {
          setIsPointerHovered(false);
          setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const nx = (touch.clientX / window.innerWidth) * 2 - 1;
        const ny = (touch.clientY / window.innerHeight) * 2 - 1;
        mouseTargetRef.current.x = nx;
        mouseTargetRef.current.y = ny;
      }
    };

    const handleTouchEnd = () => {
      mouseTargetRef.current.x = 0;
      mouseTargetRef.current.y = 0;
      setIsPointerHovered(false);
      setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [reducedMotion]);

  // 3. 60fps Animation Loop: Damped tilt lerp, audio breathing & organic ambient fluid drift
  useEffect(() => {
    let animId: number;
    let phase = 0;

    const updateScene = () => {
      if (!reducedMotion) {
        // Damped spring lerp (0.055)
        currentTiltRef.current.x += (mouseTargetRef.current.x - currentTiltRef.current.x) * 0.055;
        currentTiltRef.current.y += (mouseTargetRef.current.y - currentTiltRef.current.y) * 0.055;

        // Max ±4.2 degrees for AAPESH architectural restraint
        const rx = -currentTiltRef.current.y * 4.2;
        const ry = currentTiltRef.current.x * 4.2;
        setTilt({ rotateX: rx, rotateY: ry });

        // Organic fluid drift phase (slows down when paused)
        const phaseStep = isPlaying ? 0.008 : 0.002;
        phase += phaseStep;

        setFluidDrift({
          x1: Math.sin(phase * 0.8) * 36,
          y1: Math.cos(phase * 0.6) * 32,
          x2: Math.cos(phase * 0.7) * -34,
          y2: Math.sin(phase * 0.9) * 28,
        });
      }

      // Read audio features for subtle organic cover breathing
      const features = audioReactiveEngine.getFeatures();
      const playMult = isPlaying ? 1.0 : 0.15;
      const targetScale = reducedMotion
        ? 1.0
        : 1.0 + (features.bass * 0.018 + features.transient * 0.012) * playMult;

      setBeatScale((prev) => prev + (targetScale - prev) * 0.12);
      setTransientRim(features.transient * playMult);

      animId = requestAnimationFrame(updateScene);
    };

    animId = requestAnimationFrame(updateScene);
    return () => cancelAnimationFrame(animId);
  }, [reducedMotion, isPlaying]);

  // Primary & secondary colors strictly extracted from current song
  const primaryColor = atmospherePalette?.primary || '#ffffff';
  const glowColor = atmospherePalette?.glow || 'rgba(255, 255, 255, 0.15)';

  const isWebGLFallback = visualQuality === 'off' || visualQuality === 'low';

  return (
    <div
      data-testid="fullscreen-artwork-scene"
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
    >
      {/* ====================================================================
          LAYER A: FULLSCREEN FLUID ARTWORK ATMOSPHERE (21st.dev Aurora Inspired)
          (Enlarged blurred artwork + dynamic artwork-derived fluid color meshes)
          ==================================================================== */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10"
      >
        {/* Previous Artwork Fading Out */}
        {prevBg && (
          <div
            key="prev-bg"
            data-testid="fullscreen-prev-bg"
            className="absolute inset-0 bg-cover bg-center scale-120 blur-[85px] opacity-0 transition-opacity duration-1000 ease-out will-change-transform"
            style={{ backgroundImage: `url(${prevBg})` }}
          />
        )}

        {/* Active Artwork Fading In */}
        {activeBg && (
          <div
            key="active-bg"
            data-testid="fullscreen-active-bg"
            className={`absolute inset-0 bg-cover bg-center scale-120 blur-[85px] transition-opacity duration-1000 ease-out will-change-transform ${
              isCrossfadingBg ? 'opacity-35 animate-fade-in' : 'opacity-35'
            }`}
            style={{ backgroundImage: `url(${activeBg})` }}
          />
        )}

        {/* Dynamic Fluid Color Node 1: Top-Right Primary Ambient Aura with Organic Orbit */}
        <div
          data-testid="fluid-aura-primary"
          className="absolute -top-[12%] -right-[8%] w-[78vw] h-[78vw] max-w-[1050px] max-h-[1050px] rounded-full opacity-40 blur-[130px] pointer-events-none transition-transform duration-700 ease-out will-change-transform"
          style={{
            background: `radial-gradient(circle, ${primaryColor} 0%, rgba(0, 0, 0, 0.2) 50%, transparent 72%)`,
            transform: reducedMotion
              ? 'none'
              : `translate3d(${fluidDrift.x1}px, ${fluidDrift.y1}px, 0) scale(${1.0 + (beatScale - 1.0) * 2.5})`,
          }}
        />

        {/* Dynamic Fluid Color Node 2: Bottom-Left Glow Ambient Aura with Counter Orbit */}
        <div
          data-testid="fluid-aura-glow"
          className="absolute -bottom-[14%] -left-[8%] w-[68vw] h-[68vw] max-w-[900px] max-h-[900px] rounded-full opacity-35 blur-[140px] pointer-events-none transition-transform duration-700 ease-out will-change-transform"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, rgba(0, 0, 0, 0.3) 55%, transparent 75%)`,
            transform: reducedMotion
              ? 'none'
              : `translate3d(${fluidDrift.x2}px, ${fluidDrift.y2}px, 0) scale(${1.0 + (beatScale - 1.0) * 2.0})`,
          }}
        />

        {/* Deep Contrast Atmosphere Overlay for Razor-Sharp Text & Lyrics Readability */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />

        {/* Cinematic Film Vignette: Dark Top Edge and Heavy Bottom Stage Shading */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 pointer-events-none" />
      </div>

      {/* ====================================================================
          LAYER C: BEAT-REACTIVE FLUID FIELD (CSS Fallback when WebGL is Low/Off)
          Note: In WebGL High/Balanced mode, FluidColorField3D runs in SpatialScene
          ==================================================================== */}
      {isWebGLFallback && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden -z-5"
        >
          <div
            className="w-[72vw] h-[72vw] max-w-[780px] max-h-[780px] rounded-full opacity-45 blur-[120px] transition-transform duration-200"
            style={{
              background: `radial-gradient(circle, ${primaryColor} 0%, ${glowColor} 50%, transparent 75%)`,
              transform: `scale(${beatScale * 1.08})`,
            }}
          />
        </div>
      )}

      {/* ====================================================================
          LAYER B: CENTRAL ALBUM WORKSTATION CARD (21st.dev Tilt & Depth)
          (380-480px squircle-32, hardware-accelerated tilt, specular glare, contact shadow)
          ==================================================================== */}
      <div className="relative group shrink-0 my-auto z-20 flex flex-col items-center justify-center">
        {/* Contact Floor Ambient Reactive Shadow: Soft ellipse reflecting song color */}
        <div
          aria-hidden="true"
          className="absolute -bottom-9 inset-x-8 h-18 rounded-full opacity-50 blur-2xl pointer-events-none -z-10 transition-all duration-300"
          style={{
            background: `radial-gradient(ellipse, ${primaryColor} 0%, rgba(0, 0, 0, 0.9) 45%, transparent 75%)`,
            transform: `scale(${beatScale * 1.06})`,
          }}
        />

        {/* 3D Perspective Card Container with Hardware Acceleration */}
        <div
          ref={cardRef}
          data-testid="artwork-card-3d-wrapper"
          style={{
            perspective: 1200,
            transformStyle: 'preserve-3d',
          }}
        >
          <motion.div
            style={{
              rotateX: tilt.rotateX,
              rotateY: tilt.rotateY,
              scale: beatScale,
              transformStyle: 'preserve-3d',
            }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 28,
              mass: 0.75,
            }}
            className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px] xl:w-[460px] xl:h-[460px] max-h-[44vh] aspect-square rounded-[32px] overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.95)] border border-white/[0.14] bg-[#0e1017] will-change-transform"
          >
            {/* Smooth Crossfading Artwork Image Container */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack.videoId}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <ArtworkImage
                  item={currentTrack}
                  src={currentArtworkUrl || undefined}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  fallbackIconClassName="w-20 h-20 text-neutral-500"
                />
              </motion.div>
            </AnimatePresence>

            {/* Specular Glare Reflection Sheen (21st.dev Tilt Card Sheen) */}
            {!reducedMotion && (
              <div
                aria-hidden="true"
                data-testid="specular-glare"
                className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
                style={{
                  opacity: isPointerHovered ? glarePosition.opacity : 0.08,
                  background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.28) 0%, transparent 60%)`,
                }}
              />
            )}

            {/* Specular Inner Edge Bevel Ring (reacts to audio transients) */}
            <div
              className="absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/20 pointer-events-none transition-all duration-150"
              style={{
                boxShadow:
                  transientRim > 0.05
                    ? `inset 0 0 ${Math.round(transientRim * 20)}px rgba(255, 255, 255, ${0.18 + transientRim * 0.3})`
                    : 'inset 0 1px 0 rgba(255, 255, 255, 0.22)',
              }}
            />

            {/* Subtle Diagonal Ambient Glass Sheen */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none rounded-[32px] opacity-20"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 45%)',
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
