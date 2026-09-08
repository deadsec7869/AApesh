import { describe, it, expect, beforeEach } from 'vitest';
import { AudioReactiveEngine } from '@/services/audio/AudioReactiveEngine';

describe('AudioReactiveEngine (Phase 2)', () => {
  let engine: AudioReactiveEngine;

  beforeEach(() => {
    engine = new AudioReactiveEngine();
  });

  it('initializes with a balanced baseline energy', () => {
    const energy = engine.getEnergy();
    expect(energy.bassEnergy).toBeGreaterThanOrEqual(0.0);
    expect(energy.bassEnergy).toBeLessThanOrEqual(1.0);
    expect(energy.overallEnergy).toBeGreaterThanOrEqual(0.0);
    expect(energy.overallEnergy).toBeLessThanOrEqual(1.0);
  });

  it('updates visual energy bands when playing', () => {
    const telemetry = {
      isPlaying: true,
      isBuffering: false,
      currentTime: 12.5,
      duration: 200,
      volume: 80,
    };

    const energy = engine.update(0.016, telemetry);
    expect(energy.overallEnergy).toBeGreaterThan(0.0);
    expect(energy.bassEnergy).toBeGreaterThan(0.0);
    expect(energy.midEnergy).toBeGreaterThan(0.0);
    expect(energy.highEnergy).toBeGreaterThan(0.0);
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
});
