import { describe, expect, it } from 'vitest';
import { shouldLoadSpatialArtwork } from '@/components/spatial/spatialLoading';

describe('conditional spatial artwork loading', () => {
  it('loads the renderer when ambient visuals use a supported quality profile', () => {
    expect(shouldLoadSpatialArtwork(true, 'low')).toBe(true);
    expect(shouldLoadSpatialArtwork(true, 'ultra')).toBe(true);
  });

  it('keeps the renderer unmounted when ambient visuals are disabled', () => {
    expect(shouldLoadSpatialArtwork(false, 'high')).toBe(false);
  });

  it('keeps the renderer unmounted when spatial visuals are off or unsupported', () => {
    expect(shouldLoadSpatialArtwork(true, 'off')).toBe(false);
    expect(shouldLoadSpatialArtwork(true, 'unknown' as never)).toBe(false);
  });
});
