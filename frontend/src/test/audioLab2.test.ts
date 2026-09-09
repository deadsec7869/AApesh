import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEqualizerStore, PRESET_VALUES } from '@/stores/useEqualizerStore';
import { defaultPlaybackEngine } from '@/services/player/YouTubeIframeProvider';

describe('Audio Lab 2.0 — Pro Audio Control Center & Capability Diagnostics', () => {
  beforeEach(() => {
    useEqualizerStore.getState().resetAll();
  });

  describe('Equalizer State & Acoustic Presets', () => {
    it('initializes with Flat preset and zeroed frequency bands', () => {
      const state = useEqualizerStore.getState();
      expect(state.activePreset).toBe('Flat');
      expect(state.bands.b32).toBe(0);
      expect(state.bands.b1k).toBe(0);
      expect(state.bands.b16k).toBe(0);
      expect(state.stereoBalance).toBe(0);
      expect(state.playbackSpeed).toBe(1);
    });

    it('applies presets accurately to frequency bands', () => {
      useEqualizerStore.getState().setPreset('Bass Boost');
      const state = useEqualizerStore.getState();
      expect(state.activePreset).toBe('Bass Boost');
      expect(state.bands.b32).toBe(PRESET_VALUES['Bass Boost'].b32);
      expect(state.bands.b64).toBe(PRESET_VALUES['Bass Boost'].b64);
      expect(state.bands.b1k).toBe(PRESET_VALUES['Bass Boost'].b1k);

      useEqualizerStore.getState().setPreset('Vocal Booster');
      expect(useEqualizerStore.getState().activePreset).toBe('Vocal Booster');
      expect(useEqualizerStore.getState().bands.b1k).toBe(PRESET_VALUES['Vocal Booster'].b1k);
    });

    it('updates individual band values without altering other bands', () => {
      useEqualizerStore.getState().setBand('b1k', 4.5);
      const state = useEqualizerStore.getState();
      expect(state.bands.b1k).toBe(4.5);
      expect(state.bands.b32).toBe(0);
      expect(state.bands.b16k).toBe(0);
    });

    it('adjusts stereo balance from Left to Right and back to Center', () => {
      useEqualizerStore.getState().setStereoBalance(-45);
      expect(useEqualizerStore.getState().stereoBalance).toBe(-45);

      useEqualizerStore.getState().setStereoBalance(80);
      expect(useEqualizerStore.getState().stereoBalance).toBe(80);
    });
  });

  describe('Playback Speed & Provider Synchronization', () => {
    it('sets playback speed and invokes provider setPlaybackRate', () => {
      const spy = vi.spyOn(defaultPlaybackEngine, 'setPlaybackRate');
      useEqualizerStore.getState().setPlaybackSpeed(1.5);
      expect(useEqualizerStore.getState().playbackSpeed).toBe(1.5);
      expect(spy).toHaveBeenCalledWith(1.5);
      spy.mockRestore();
    });

    it('resets all audio lab settings back to defaults', () => {
      const spy = vi.spyOn(defaultPlaybackEngine, 'setPlaybackRate');
      useEqualizerStore.getState().setPreset('Rock');
      useEqualizerStore.getState().setBand('b32', 8.0);
      useEqualizerStore.getState().setStereoBalance(-50);
      useEqualizerStore.getState().setPlaybackSpeed(1.25);
      useEqualizerStore.getState().setSpatialAudio(true);

      useEqualizerStore.getState().resetAll();

      const state = useEqualizerStore.getState();
      expect(state.activePreset).toBe('Flat');
      expect(state.bands.b32).toBe(0);
      expect(state.stereoBalance).toBe(0);
      expect(state.playbackSpeed).toBe(1);
      expect(state.spatialAudio).toBe(false);
      expect(spy).toHaveBeenCalledWith(1);
      spy.mockRestore();
    });
  });

  describe('Provider Capabilities & Technical Honesty', () => {
    it('accurately reports YouTube IFrame capabilities without false DSP claims', () => {
      const capabilities = defaultPlaybackEngine.getAudioCapabilities();
      expect(capabilities.providerName).toBe('YouTube IFrame Engine');
      expect(capabilities.volume).toBe('supported');
      expect(capabilities.playbackRate).toBe('supported');
      expect(capabilities.availablePlaybackRates).toContain(1.5);
      expect(capabilities.eq).toBe('unsupported');
      expect(capabilities.eqReason).toBeDefined();
      expect(capabilities.spatialDsp).toBe('unsupported');
      expect(capabilities.spatialVisualization).toBe('supported');
      expect(capabilities.analyser).toBe('limited');
      expect(capabilities.maxBitrateKbps).toBe(256);
    });
  });
});
