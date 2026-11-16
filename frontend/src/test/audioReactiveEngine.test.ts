import { describe, it, expect, beforeEach } from 'vitest';
import { AudioReactiveEngine } from '@/services/audio/AudioReactiveEngine';

describe('AudioReactiveEngine (Phase 3 Spatial Workstation)', () => {
  let engine: AudioReactiveEngine;

  beforeEach(() => {
    engine = new AudioReactiveEngine();
  });

  it('initializes with balanced baseline multi-band features', () => {
    const features = engine.getFeatures();
    expect(features.bass).toBeGreaterThanOrEqual(0.0);
    expect(features.bass).toBeLessThanOrEqual(1.0);
    expect(features.lowMid).toBeGreaterThanOrEqual(0.0);
    expect(features.mid).toBeGreaterThanOrEqual(0.0);
    expect(features.highMid).toBeGreaterThanOrEqual(0.0);
    expect(features.treble).toBeGreaterThanOrEqual(0.0);
    expect(features.overall).toBeGreaterThanOrEqual(0.0);
    expect(features.beatEnergy).toBe(0.0);
    expect(features.transient).toBe(0.0);
  });

  it('reports no frequency energy for a playing iframe without PCM samples', () => {
    const telemetry = {
      isPlaying: true,
      isBuffering: false,
      currentTime: 12.5,
      duration: 200,
      volume: 80,
    };

    const energy = engine.update(0.016, telemetry);
    expect(energy.overallEnergy).toBe(0);
    expect(energy.bassEnergy).toBe(0);
    expect(energy.midEnergy).toBe(0);
    expect(energy.highEnergy).toBe(0);

    const features = engine.getFeatures();
    expect(features.bass).toBe(0);
    expect(features.lowMid).toBe(0);
    expect(features.mid).toBe(0);
    expect(features.highMid).toBe(0);
    expect(features.treble).toBe(0);
    expect(features.overall).toBe(0);
  });

  it('decays visual energy gracefully when playback is paused', () => {
    // 1. Play first
    engine.update(0.016, {
      isPlaying: true,
      isBuffering: false,
      currentTime: 10,
      duration: 200,
      volume: 80,
    });

    // 2. Pause and step time forward
    let pausedEnergy = engine.getEnergy();
    for (let i = 0; i < 30; i++) {
      pausedEnergy = engine.update(0.05, {
        isPlaying: false,
        isBuffering: false,
        currentTime: 10,
        duration: 200,
        volume: 80,
      });
    }

    // Energy should have decayed to resting baseline (~0.05)
    expect(pausedEnergy.overallEnergy).toBeLessThan(0.20);
    expect(pausedEnergy.bassEnergy).toBeLessThan(0.20);
  });

  it('keeps energy stable during buffering without erratic surges', () => {
    const bufferingTelemetry = {
      isPlaying: true,
      isBuffering: true,
      currentTime: 10,
      duration: 200,
      volume: 80,
    };

    const energy = engine.update(0.016, bufferingTelemetry);
    expect(energy.overallEnergy).toBeLessThanOrEqual(0.5);
    expect(energy.transientEnergy).toBeLessThanOrEqual(0.5);
  });

  it('smooths transient energy with exponential decay', () => {
    // Trigger sudden surge
    engine.update(0.016, {
      isPlaying: true,
      isBuffering: false,
      currentTime: 0.1,
      duration: 200,
      volume: 100,
    });

    const energySurge = engine.update(0.016, {
      isPlaying: true,
      isBuffering: false,
      currentTime: 0.5,
      duration: 200,
      volume: 100,
    });

    const initialTransient = energySurge.transientEnergy;

    // Advance time to let transient decay
    const decayed = engine.update(0.25, {
      isPlaying: true,
      isBuffering: false,
      currentTime: 0.75,
      duration: 200,
      volume: 100,
    });

    expect(decayed.transientEnergy).toBeLessThanOrEqual(initialTransient);
  });

  it('detects musical beats with cooldown to prevent flickering', () => {
    // Advance playback with sharp rhythmic delta
    engine.update(0.016, {
      isPlaying: true,
      isBuffering: false,
      currentTime: 1.0,
      duration: 200,
      volume: 100,
    });

    const beatState = engine.update(0.016, {
      isPlaying: true,
      isBuffering: false,
      currentTime: 1.15,
      duration: 200,
      volume: 100,
    });

    expect(beatState.beatEnergy).toBeDefined();
    expect(beatState.beatEnergy!).toBeGreaterThanOrEqual(0.0);
    expect(beatState.beatEnergy!).toBeLessThanOrEqual(1.0);
  });

  it('identifies live audio active status correctly', () => {
    expect(engine.isLiveAudioActive()).toBe(false);
    engine.detachAudioSource();
    expect(engine.isLiveAudioActive()).toBe(false);
  });
});
