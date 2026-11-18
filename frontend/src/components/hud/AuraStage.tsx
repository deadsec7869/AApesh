import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUIStore } from '@/stores/useUIStore';
import { extractArtworkPalette } from '@/lib/colorExtractor';
import { getArtworkUrl } from '@/utils/artwork';

/**
 * Liquid Aura Stage - Full-viewport chromatic backdrop (Z-Layer 0)
 *
 * Renders animated color orbs driven by --aura-primary and --aura-secondary
 * CSS custom properties, which are updated in real-time from the active
 * track's album artwork via extractArtworkPalette().
 *
 * The Three.js spatial visualizer (SpatialArtworkEnvironment) composites
 * on top of this stage, creating a layered depth effect where glass panels
 * refract and reflect the living chromatic backdrop.
 */

// Default studio palette for idle state - rich deep indigo/cyan/violet
const DEFAULT_AURA_PRIMARY = '#1e1b4b';      // Deep indigo
const DEFAULT_AURA_SECONDARY = '#0f766e';    // Deep teal/cyan
const DEFAULT_AURA_PRIMARY_RGB = '30, 27, 75';
const DEFAULT_AURA_SECONDARY_RGB = '15, 118, 110';

export const AuraStage: React.FC = () => {
  const { currentTrack } = usePlayerStore();
  const { ambientGlowEnabled, visualQuality, zenMode } = useUIStore();

  const [auraPrimary, setAuraPrimary] = useState(DEFAULT_AURA_PRIMARY);
  const [auraSecondary, setAuraSecondary] = useState(DEFAULT_AURA_SECONDARY);
  const [auraPrimaryRgb, setAuraPrimaryRgb] = useState(DEFAULT_AURA_PRIMARY_RGB);
  const [auraSecondaryRgb, setAuraSecondaryRgb] = useState(DEFAULT_AURA_SECONDARY_RGB);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  );

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  // Initialize CSS custom properties on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--aura-primary', DEFAULT_AURA_PRIMARY);
      document.documentElement.style.setProperty('--aura-secondary', DEFAULT_AURA_SECONDARY);
      document.documentElement.style.setProperty('--aura-primary-rgb', DEFAULT_AURA_PRIMARY_RGB);
      document.documentElement.style.setProperty('--aura-secondary-rgb', DEFAULT_AURA_SECONDARY_RGB);
    }
  }, []);

  // Extract colors from artwork when track changes
  useEffect(() => {
    if (!ambientGlowEnabled || !currentTrack || zenMode) return;

    let cancelled = false;

    const updateColors = async () => {
      const artworkUrl = getArtworkUrl(currentTrack) || currentTrack?.thumbnail;
      if (!artworkUrl) return;

      try {
        const palette = await extractArtworkPalette(artworkUrl, currentTrack.title);
        if (cancelled) return;

        // Parse primary color (rgb string)
        const primaryMatch = palette.primary.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        let primaryRgb = DEFAULT_AURA_PRIMARY_RGB;
        if (primaryMatch) {
          const [, r, g, b] = primaryMatch;
          primaryRgb = `${r}, ${g}, ${b}`;
          setAuraPrimaryRgb(primaryRgb);
          setAuraPrimary(`rgb(${primaryRgb})`);
        }

        // Extract secondary from glow
        const glowMatch = palette.glow.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        let secondaryRgb = DEFAULT_AURA_SECONDARY_RGB;
        if (glowMatch) {
          const [, r, g, b] = glowMatch;
          const secondaryRgbVal = `${r}, ${g}, ${b}`;
          setAuraSecondaryRgb(secondaryRgbVal);
          setAuraSecondary(`rgb(${secondaryRgbVal})`);
          secondaryRgb = secondaryRgbVal;
        }

        // Update CSS custom properties with smooth transition
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--aura-primary', `rgb(${primaryRgb})`);
          document.documentElement.style.setProperty('--aura-secondary', `rgb(${secondaryRgb})`);
          document.documentElement.style.setProperty('--aura-primary-rgb', primaryRgb);
          document.documentElement.style.setProperty('--aura-secondary-rgb', secondaryRgb);
        }
      } catch (e) {
        console.warn('Color extraction failed:', e);
      }
    };

    updateColors();

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.videoId, ambientGlowEnabled, zenMode]);

  // Apply CSS custom properties on mount and when values change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--aura-primary', auraPrimary);
      document.documentElement.style.setProperty('--aura-secondary', auraSecondary);
      document.documentElement.style.setProperty('--aura-primary-rgb', auraPrimaryRgb);
      document.documentElement.style.setProperty('--aura-secondary-rgb', auraSecondaryRgb);
    }
  }, [auraPrimary, auraSecondary, auraPrimaryRgb, auraSecondaryRgb]);

  // Don't render if visual quality is off or zen mode
  if (visualQuality === 'off' || zenMode) return null;

  return (
    <div
      className="liquid-aura-stage"
      data-page-hidden={!pageVisible ? 'true' : undefined}
      aria-hidden="true"
      style={{
        background: `radial-gradient(
          ellipse at 50% 35%,
          rgba(var(--aura-primary-rgb), 0.18) 0%,
          rgba(var(--aura-primary-rgb), 0.12) 35%,
          rgba(var(--aura-secondary-rgb), 0.08) 65%,
          rgba(5, 5, 7, 0.98) 90%
        )`,
        transition: 'background 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    />
  );
};