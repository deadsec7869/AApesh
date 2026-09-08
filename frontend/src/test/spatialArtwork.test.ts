import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSpatialTexture,
  createParticleTexture,
  createShadowTexture,
  clearTextureCache,
} from '@/components/spatial/useSpatialArtworkTexture';
import { usePlayerStore } from '@/stores/usePlayerStore';

describe('SpatialArtworkEnvironment & Texture Management', () => {
  beforeEach(() => {
    clearTextureCache();
  });

  it('generates soft particle texture without throwing', () => {
    const tex = createParticleTexture();
    expect(tex).toBeDefined();
    expect(tex.isTexture).toBe(true);
    tex.dispose();
  });

  it('generates soft shadow texture with appropriate depth profile', () => {
    const shadowTex = createShadowTexture();
    expect(shadowTex).toBeDefined();
    expect(shadowTex.isTexture).toBe(true);
    shadowTex.dispose();
  });

  it('returns fallback texture when URL is undefined', async () => {
    const tex = await loadSpatialTexture(undefined);
    expect(tex).toBeDefined();
    expect(tex.isTexture).toBe(true);
  });

  it('maintains fullscreenTab in usePlayerStore and allows switching', () => {
    const store = usePlayerStore.getState();
    expect(store.fullscreenTab).toBe('art');

    store.setFullscreenTab('lyrics');
    expect(usePlayerStore.getState().fullscreenTab).toBe('lyrics');

    store.setFullscreenTab('queue');
    expect(usePlayerStore.getState().fullscreenTab).toBe('queue');

    store.setFullscreenTab('art');
    expect(usePlayerStore.getState().fullscreenTab).toBe('art');
  });
});
