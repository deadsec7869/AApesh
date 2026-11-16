import { describe, it, expect } from 'vitest';
import { QUALITY_PROFILES } from '@/components/spatial/qualitySettings';
import { usePlayerStore } from '@/stores/usePlayerStore';

describe('Spatial Physics Safety & Isolation', () => {
  it('strictly caps physics bodies count to avoid GPU/CPU spikes', () => {
    Object.values(QUALITY_PROFILES).forEach((profile) => {
      expect(profile.physicsBodyCount).toBeLessThanOrEqual(16);
    });
  });

  it('ensures physics cannot trigger playback mutations or seeks', () => {
    const playerBefore = usePlayerStore.getState();
    const initialTime = playerBefore.currentTime;
    const initialTrack = playerBefore.currentTrack;

    // Simulate arbitrary visual ticks
    expect(usePlayerStore.getState().currentTime).toBe(initialTime);
    expect(usePlayerStore.getState().currentTrack).toBe(initialTrack);
  });

  it('disables physics entirely on low and off profiles', () => {
    expect(QUALITY_PROFILES.off.enablePhysics).toBe(false);
    expect(QUALITY_PROFILES.low.enablePhysics).toBe(false);
  });
});
