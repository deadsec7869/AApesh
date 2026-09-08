import { describe, it, expect, beforeEach } from 'vitest';
import { QUALITY_PROFILES } from '@/components/spatial/qualitySettings';
import { CinematicLightingController } from '@/components/spatial/cinematicLighting';
import { useThemeStore } from '@/stores/useThemeStore';

describe('Phase 3 — Cinematic Spatial Environment Engine', () => {
  beforeEach(() => {
    useThemeStore.getState().setVisualQuality('high');
  });

  it('defines valid quality profiles across all 4 tiers', () => {
    expect(QUALITY_PROFILES.low).toBeDefined();
    expect(QUALITY_PROFILES.medium).toBeDefined();
    expect(QUALITY_PROFILES.high).toBeDefined();
    expect(QUALITY_PROFILES.ultra).toBeDefined();

    expect(QUALITY_PROFILES.low.enablePostProcessing).toBe(false);
    expect(QUALITY_PROFILES.high.enableBloom).toBe(true);
    expect(QUALITY_PROFILES.ultra.maxPixelRatio).toBe(2.0);
    expect(QUALITY_PROFILES.ultra.particlesFarCount).toBeGreaterThan(QUALITY_PROFILES.low.particlesFarCount);
  });

  it('updates cinematic lighting smoothly with palette and energy', () => {
    const lighting = new CinematicLightingController();

    lighting.updatePalette({
      primary: '#e11d48',
      glow: 'rgba(225, 29, 72, 0.25)',
      surface: 'rgba(20, 10, 15, 0.75)',
      gradient: 'radial-gradient(...)',
    });

    const energy = {
      bassEnergy: 0.8,
      midEnergy: 0.5,
      highEnergy: 0.6,
      overallEnergy: 0.7,
      transientEnergy: 0.5,
    };

    const state = lighting.update(0.016, energy, 1.0, 0.22);
    expect(state.ambientIntensity).toBeGreaterThan(0.0);
    expect(state.pointIntensity).toBeGreaterThan(0.0);
    expect(state.primaryColor).toBeDefined();
    expect(state.secondaryColor).toBeDefined();
  });

  it('manages visualQuality in useThemeStore', () => {
    const store = useThemeStore.getState();
    expect(store.visualQuality).toBe('high');

    store.setVisualQuality('ultra');
    expect(useThemeStore.getState().visualQuality).toBe('ultra');

    store.setVisualQuality('low');
    expect(useThemeStore.getState().visualQuality).toBe('low');

    store.setVisualQuality('medium');
    expect(useThemeStore.getState().visualQuality).toBe('medium');
  });
});
