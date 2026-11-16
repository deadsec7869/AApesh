import { describe, it, expect, beforeEach } from 'vitest';
import {
  AudioReactiveEngine,
  BeatReactiveEngine,
  audioReactiveEngine,
} from '@/services/audio/AudioReactiveEngine';
import { QUALITY_PROFILES } from '@/components/spatial/qualitySettings';

describe('AAPESH Immersive Beat-Reactive Engine & Visuals', () => {
  let engine: AudioReactiveEngine;

  beforeEach(() => {
    engine = new AudioReactiveEngine();
  });

  it('exports BeatReactiveEngine alias identically to AudioReactiveEngine', () => {
    expect(BeatReactiveEngine).toBe(AudioReactiveEngine);
    expect(audioReactiveEngine).toBeDefined();
  });

  it('reports honest analysis modes and does not falsely claim live beat detection', () => {
    expect(engine.getAnalysisMode()).toBe('ambient');
    expect(engine.isLiveAudioActive()).toBe(false);

    // Switch to ambient mode
    engine.setAmbientMode(true);
    expect(engine.getAnalysisMode()).toBe('ambient');
    expect(engine.isAmbientMode()).toBe(true);

    // Switch back
    engine.setAmbientMode(false);
    expect(engine.getAnalysisMode()).toBe('ambient');
  });

  it('ambient mode provides calm, soothing energy with zero transient surges', () => {
    engine.setAmbientMode(true);

    const telemetry = {
      isPlaying: true,
      isBuffering: false,
      currentTime: 14.2,
      duration: 210,
      volume: 80,
    };

    const energy = engine.update(0.016, telemetry);
    const features = engine.getFeatures();

    expect(features.analysisMode).toBe('ambient');
    expect(features.transient).toBe(0.0);
    expect(features.beatEnergy).toBe(0.0);
    expect(energy.overallEnergy).toBe(0);
    expect(energy.overallEnergy).toBeLessThanOrEqual(0.35);
  });

  it('does not infer audio energy from BPM metadata', () => {
    const telemetrySlow = {
      isPlaying: true,
      isBuffering: false,
      currentTime: 1.0,
      duration: 180,
      volume: 80,
      bpm: 80,
    };

    const telemetryFast = {
      isPlaying: true,
      isBuffering: false,
      currentTime: 1.0,
      duration: 180,
      volume: 80,
      bpm: 160,
    };

    const energySlow = engine.update(0.016, telemetrySlow);
    const engineFast = new AudioReactiveEngine();
    const energyFast = engineFast.update(0.016, telemetryFast);

    expect(energySlow.beatEnergy).toBe(0);
    expect(energyFast).toEqual(energySlow);
  });

  it('resets transient and beat state cleanly on track transitions', () => {
    // Generate transient pulse
    engine.update(0.016, {
      isPlaying: true,
      isBuffering: false,
      currentTime: 0.1,
      duration: 180,
      volume: 100,
    });
    engine.update(0.016, {
      isPlaying: true,
      isBuffering: false,
      currentTime: 0.4,
      duration: 180,
      volume: 100,
    });

    // Reset for new track
    engine.resetTransientState();
    const features = engine.getFeatures();

    expect(features.transient).toBe(0.0);
    expect(features.beatEnergy).toBe(0.0);
  });

  it('applies adaptive intensity normalization without clipping', () => {
    // Mock Web Audio attachment simulation by feeding repeated updates
    const telemetry = {
      isPlaying: true,
      isBuffering: false,
      currentTime: 5.0,
      duration: 200,
      volume: 90,
    };

    for (let i = 0; i < 20; i++) {
      engine.update(0.016, { ...telemetry, currentTime: 5.0 + i * 0.016 });
    }

    const features = engine.getFeatures();
    expect(features.bass).toBeGreaterThanOrEqual(0.0);
    expect(features.bass).toBeLessThanOrEqual(1.0);
    expect(features.overall).toBeGreaterThanOrEqual(0.0);
    expect(features.overall).toBeLessThanOrEqual(1.0);
  });

  it('maintains quality tier profiles for high, balanced, and fallback', () => {
    expect(QUALITY_PROFILES.high.enabled).toBe(true);
    expect(QUALITY_PROFILES.medium.enabled).toBe(true);
    expect(QUALITY_PROFILES.low.enabled).toBe(true);
    expect(QUALITY_PROFILES.off.enabled).toBe(false);

    expect(QUALITY_PROFILES.high.maxPixelRatio).toBeLessThanOrEqual(2.0);
    expect(QUALITY_PROFILES.medium.maxPixelRatio).toBeLessThanOrEqual(1.5);
  });
});
