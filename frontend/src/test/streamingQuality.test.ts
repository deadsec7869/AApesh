import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlayerStore } from '../stores/usePlayerStore';
import {
  YOUTUBE_QUALITY_CAPABILITIES,
  resolveStreamingQuality,
  getAvailableQualityCapabilities,
  getFutureQualityCapabilities,
} from '../services/audio/qualityResolver';
import { PlaybackProvider } from '../services/player/PlaybackProvider';
import { Track } from '../types/music';

const mockTrack: Track = {
  videoId: 'test_vid_123',
  title: 'Honest Audio Track',
  artists: [{ name: 'Truthful Artist' }],
  duration: '3:30',
  duration_seconds: 210,
};

describe('Streaming Quality Engine 2.0', () => {
  beforeEach(() => {
    localStorage.clear();
    usePlayerStore.setState({
      currentTrack: mockTrack,
      currentTime: 42,
      duration: 210,
      isPlaying: true,
      queue: [mockTrack],
      currentIndex: 0,
      streamingQuality: 'auto',
      isQualityModalOpen: false,
    });
  });

  describe('YouTube Quality Capabilities', () => {
    it('provides honest capabilities for YouTube Music streams', () => {
      const available = getAvailableQualityCapabilities(YOUTUBE_QUALITY_CAPABILITIES);
      const tiers = available.map((c) => c.tier);

      expect(tiers).toContain('auto');
      expect(tiers).toContain('low');
      expect(tiers).toContain('normal');
      expect(tiers).toContain('high');
      expect(tiers).toContain('always_high');

      // Check max bitrates
      const low = available.find((c) => c.tier === 'low');
      expect(low?.bitrateMax).toBe(48);
      expect(low?.lossless).toBe(false);

      const high = available.find((c) => c.tier === 'high');
      expect(high?.bitrateMax).toBe(256);
      expect(high?.lossless).toBe(false);

      const alwaysHigh = available.find((c) => c.tier === 'always_high');
      expect(alwaysHigh?.bitrateMax).toBe(256);
      expect(alwaysHigh?.lossless).toBe(false);
    });

    it('marks 320kbps, Lossless, and Hi-Res as unavailable for YouTube', () => {
      const future = getFutureQualityCapabilities(YOUTUBE_QUALITY_CAPABILITIES);
      const tiers = future.map((c) => c.tier);

      expect(tiers).toContain('very_high');
      expect(tiers).toContain('lossless');
      expect(tiers).toContain('hi_res');

      future.forEach((c) => {
        expect(c.available).toBe(false);
        expect(c.reason).toBeDefined();
      });
    });
  });

  describe('Quality Resolver', () => {
    it('resolves auto adaptive tier accurately without claiming lossless', () => {
      const res = resolveStreamingQuality('auto', null);
      expect(res.requestedQuality).toBe('auto');
      expect(res.effectiveQuality).toBe('auto');
      expect(res.isLossless).toBe(false);
      expect(res.isHiRes).toBe(false);
      expect(res.providerName).toBe('YouTube Music');
      expect(res.shortBadge).toBe('AUTO');
      expect(res.effectiveBitrate).toContain('256 kbps');
    });

    it('resolves always_high to 256 kbps lossy stream', () => {
      const res = resolveStreamingQuality('always_high', null);
      expect(res.requestedQuality).toBe('always_high');
      expect(res.effectiveQuality).toBe('always_high');
      expect(res.isLossless).toBe(false);
      expect(res.effectiveBitrate).toBe('256 kbps');
      expect(res.shortBadge).toBe('HQ 256k');
      expect(res.statusLabel).toBe('High Quality • 256 kbps');
    });

    it('caps requested lossless tier to YouTube provider high limit without pretending to deliver FLAC', () => {
      const res = resolveStreamingQuality('lossless', null);
      expect(res.requestedQuality).toBe('lossless');
      // Effective quality is capped to highest available lossy stream
      expect(res.effectiveQuality).toBe('high');
      expect(res.isLossless).toBe(false);
      expect(res.isHiRes).toBe(false);
      expect(res.effectiveBitrate).toBe('256 kbps');
      expect(res.statusLabel).toBe('High Quality • 256 kbps');
      expect(res.note).toContain('unavailable on YouTube Music');
    });

    it('supports future lossless provider when available', () => {
      const mockLosslessProvider: PlaybackProvider = {
        name: 'Tidal HiFi',
        init: vi.fn().mockResolvedValue(undefined),
        load: vi.fn().mockResolvedValue(undefined),
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        seek: vi.fn(),
        setVolume: vi.fn(),
        destroy: vi.fn(),
        getCurrentTime: () => 0,
        getDuration: () => 200,
        getEffectiveQuality: (requested) => ({
          requestedQuality: requested,
          effectiveQuality: 'lossless',
          effectiveLabel: 'Lossless FLAC',
          effectiveBitrate: '1411 kbps',
          effectiveCodec: 'FLAC',
          effectiveSampleRate: 44100,
          effectiveBitDepth: 16,
          isLossless: true,
          isHiRes: false,
          providerName: 'Tidal HiFi',
          isConfigurableByProvider: true,
          shortBadge: 'FLAC',
          statusLabel: 'Lossless • FLAC • 16-bit / 44.1 kHz',
          diagnosticsDetail: '16-bit / 44.1 kHz FLAC (1411 kbps)',
        }),
      };

      const res = resolveStreamingQuality('lossless', mockLosslessProvider);
      expect(res.isLossless).toBe(true);
      expect(res.effectiveCodec).toBe('FLAC');
      expect(res.statusLabel).toBe('Lossless • FLAC • 16-bit / 44.1 kHz');
      expect(res.providerName).toBe('Tidal HiFi');
    });
  });

  describe('Player Store Quality State & Non-disruptive Behavior', () => {
    it('updates streamingQuality preference and persists to localStorage', () => {
      const { setStreamingQuality } = usePlayerStore.getState();

      setStreamingQuality('always_high');
      expect(usePlayerStore.getState().streamingQuality).toBe('always_high');
      expect(localStorage.getItem('aapesh_streaming_quality')).toBe('always_high');
    });

    it('changing quality preference does NOT restart playback, reset time, or clear queue', () => {
      const { setStreamingQuality } = usePlayerStore.getState();

      // Verify initial playback state
      expect(usePlayerStore.getState().isPlaying).toBe(true);
      expect(usePlayerStore.getState().currentTime).toBe(42);
      expect(usePlayerStore.getState().currentTrack?.videoId).toBe('test_vid_123');
      expect(usePlayerStore.getState().queue).toHaveLength(1);

      // Change quality
      setStreamingQuality('high');

      // Verify untouched playback state
      expect(usePlayerStore.getState().isPlaying).toBe(true);
      expect(usePlayerStore.getState().currentTime).toBe(42);
      expect(usePlayerStore.getState().currentTrack?.videoId).toBe('test_vid_123');
      expect(usePlayerStore.getState().queue).toHaveLength(1);
    });

    it('toggles streaming quality modal correctly', () => {
      const { toggleQualityModal, setQualityModalOpen } = usePlayerStore.getState();

      expect(usePlayerStore.getState().isQualityModalOpen).toBe(false);

      toggleQualityModal();
      expect(usePlayerStore.getState().isQualityModalOpen).toBe(true);

      setQualityModalOpen(false);
      expect(usePlayerStore.getState().isQualityModalOpen).toBe(false);
    });

    it('getEffectiveQualityInfo returns live resolution from current store state', () => {
      const { setStreamingQuality, getEffectiveQualityInfo } = usePlayerStore.getState();

      setStreamingQuality('normal');
      const info = getEffectiveQualityInfo();
      expect(info.requestedQuality).toBe('normal');
      expect(info.effectiveBitrate).toBe('≤128 kbps');
      expect(info.isLossless).toBe(false);
    });
  });
});
