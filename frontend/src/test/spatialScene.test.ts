import { describe, it, expect } from 'vitest';
import { QUALITY_PROFILES, VisualQuality } from '@/components/spatial/qualitySettings';
import { CinematicLightingController } from '@/components/spatial/cinematicLighting';
import { clearTextureCache, loadSpatialTexture } from '@/components/spatial/useSpatialArtworkTexture';

describe('Spatial Scene Quality Profiles & Lighting Engine', () => {
  it('defines valid quality profiles with capped pixel ratios', () => {
    const qualities: VisualQuality[] = ['off', 'low', 'medium', 'high', 'ultra'];

    qualities.forEach((q) => {
      const profile = QUALITY_PROFILES[q];
      expect(profile).toBeDefined();
      expect(profile.maxPixelRatio).toBeLessThanOrEqual(2.0);
      expect(profile.motionDamping).toBeGreaterThanOrEqual(0);
      expect(profile.motionDamping).toBeLessThanOrEqual(0.1);
    });
  });

  it('disables postprocessing and physics on low and off profiles', () => {
    expect(QUALITY_PROFILES.off.enabled).toBe(false);
    expect(QUALITY_PROFILES.off.enablePhysics).toBe(false);
    expect(QUALITY_PROFILES.off.enablePostProcessing).toBe(false);

    expect(QUALITY_PROFILES.low.enabled).toBe(true);
    expect(QUALITY_PROFILES.low.enablePhysics).toBe(false);
    expect(QUALITY_PROFILES.low.enablePostProcessing).toBe(false);
  });

  it('scales particle counts progressively with quality tiers', () => {
    expect(QUALITY_PROFILES.low.particlesFarCount).toBeLessThan(QUALITY_PROFILES.medium.particlesFarCount);
    expect(QUALITY_PROFILES.medium.particlesFarCount).toBeLessThan(QUALITY_PROFILES.high.particlesFarCount);
    expect(QUALITY_PROFILES.high.particlesFarCount).toBeLessThan(QUALITY_PROFILES.ultra.particlesFarCount);
  });

  it('cinematic lighting controller smoothly interpolates palette colors', () => {
    const controller = new CinematicLightingController();

    controller.updatePalette({
      primary: 'rgb(240, 100, 50)',
      glow: 'rgba(240, 100, 50, 0.25)',
      surface: 'rgba(20, 20, 20, 0.8)',
      gradient: 'radial-gradient(...)',
    });

    const state = controller.update(
      0.016,
      {
        bass: 0.3,
        lowMid: 0.2,
        mid: 0.2,
        highMid: 0.1,
        treble: 0.1,
        overall: 0.25,
        beatEnergy: 0.0,
        transient: 0.0,
      },
      0.5,
      0.22
    );

    expect(state.ambientIntensity).toBeGreaterThan(0.0);
    expect(state.pointIntensity).toBeGreaterThan(0.0);
    expect(state.primaryColor).toBeDefined();
    expect(state.secondaryColor).toBeDefined();
  });

  it('clears texture cache safely without errors', async () => {
    const tex = await loadSpatialTexture(undefined);
    expect(tex).toBeDefined();
    expect(() => clearTextureCache()).not.toThrow();
  });
});
