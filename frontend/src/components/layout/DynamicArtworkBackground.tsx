import React, { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { Track } from '@/types/music';
import { getArtworkUrl } from '@/utils/artwork';

// Cache preloaded image URLs to prevent redundant network fetches
const imagePreloadCache = new Set<string>();

/**
 * Returns the highest resolution artwork URL available on the track.
 */
export function getHighestResArtworkUrl(track: Track | null): string | undefined {
  if (!track) return undefined;
  return getArtworkUrl(track, 1200) || undefined;
}

interface BackgroundLayer {
  url: string;
  trackId: string;
}

export const DynamicArtworkBackground: React.FC = () => {
  // Performance: ONLY subscribe to currentTrack and atmospherePalette to avoid re-renders on playback time ticks
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const atmospherePalette = usePlayerStore((s) => s.atmospherePalette);
  const isPlayerExpanded = usePlayerStore((s) => s.isPlayerExpanded);
  const { ambientGlow } = useThemeStore();

  const [activeLayer, setActiveLayer] = useState<BackgroundLayer | null>(null);
  const [prevLayer, setPrevLayer] = useState<BackgroundLayer | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);

  const transitionTimerRef = useRef<any>(null);
  const currentUrlRef = useRef<string | null>(null);

  const currentArtworkUrl = getHighestResArtworkUrl(currentTrack);

  useEffect(() => {
    if (!currentArtworkUrl) {
      if (activeLayer) {
        setPrevLayer(activeLayer);
        setActiveLayer(null);
        setIsCrossfading(true);
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = setTimeout(() => {
          setPrevLayer(null);
          setIsCrossfading(false);
        }, 1000);
      }
      currentUrlRef.current = null;
      return;
    }

    if (currentArtworkUrl === currentUrlRef.current) {
      return;
    }

    currentUrlRef.current = currentArtworkUrl;

    const trackId = currentTrack?.videoId || currentArtworkUrl;

    const applyNewBackground = () => {
      setPrevLayer(activeLayer);
      setActiveLayer({ url: currentArtworkUrl, trackId });
      setIsCrossfading(true);

      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setPrevLayer(null);
        setIsCrossfading(false);
      }, 1000);
    };

    // Pre-decode the image before triggering the crossfade to eliminate blank/white flashes
    if (imagePreloadCache.has(currentArtworkUrl)) {
      applyNewBackground();
    } else {
      const img = new Image();
      img.src = currentArtworkUrl;
      img.onload = () => {
        imagePreloadCache.add(currentArtworkUrl);
        applyNewBackground();
      };
      img.onerror = () => {
        // If image fails, still set layer without throwing
        applyNewBackground();
      };
    }

    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [currentArtworkUrl, currentTrack?.videoId]);

  if (!ambientGlow) {
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#050507] overflow-hidden select-none" />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none bg-[#050507] transition-colors duration-1000"
    >
      {/* ====================================================================
          LAYER 1 & 2: DUAL CROSSFADING ARTWORK BACKGROUNDS (Smooth 1000ms transition)
          ==================================================================== */}
      {/* Previous Artwork Layer (Fading Out) */}
      {prevLayer && (
        <div
          key={`prev-${prevLayer.trackId}`}
          className="absolute inset-0 bg-center bg-cover scale-115 blur-[65px] transition-opacity duration-1000 ease-out will-change-transform opacity-0"
          style={{
            backgroundImage: `url(${prevLayer.url})`,
          }}
        />
      )}

      {/* Active Artwork Layer (Fading In) */}
      {activeLayer && (
        <div
          key={`active-${activeLayer.trackId}`}
          className={`absolute inset-0 bg-center bg-cover scale-115 blur-[65px] transition-opacity duration-1000 ease-out will-change-transform ${
            isCrossfading ? 'opacity-40 animate-fade-in' : 'opacity-40'
          }`}
          style={{
            backgroundImage: `url(${activeLayer.url})`,
          }}
        />
      )}

      {/* ====================================================================
          LAYER 3: ARTWORK-DERIVED AMBIENT RADIAL COLOR LIGHTING
          ==================================================================== */}
      {/* Top-Right Primary Ambient Aura */}
      <div
        className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full opacity-35 blur-[130px] transition-all duration-1000 will-change-transform"
        style={{
          background: atmospherePalette?.primary
            ? `radial-gradient(circle, ${atmospherePalette.primary} 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%)',
        }}
      />

      {/* Bottom-Left Secondary Ambient Aura */}
      <div
        className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] max-w-[750px] max-h-[750px] rounded-full opacity-30 blur-[140px] transition-all duration-1000 will-change-transform"
        style={{
          background: atmospherePalette?.glow
            ? `radial-gradient(circle, ${atmospherePalette.glow} 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, transparent 70%)',
        }}
      />

      {/* ====================================================================
          LAYER 4 & 5: DARK DIFFUSER OVERLAY & VIGNETTE
          ==================================================================== */}
      {/* Translucent Dark Diffuser to ensure 100% UI readability */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isPlayerExpanded ? 'bg-black/55' : 'bg-black/65'
        }`}
      />

      {/* Film Vignette (Deep dark edges and bottom) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
    </div>
  );
};
