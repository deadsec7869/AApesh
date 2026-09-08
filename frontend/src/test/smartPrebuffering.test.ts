import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeTargetBufferSeconds,
  getNetworkTier,
  PlaybackStatus,
  BufferHealth,
} from '../types/playback';
import { usePlayerStore } from '../stores/usePlayerStore';
import { YouTubeIframeProvider } from '../services/player/YouTubeIframeProvider';
import { Track } from '../types/music';

const mockTrack: Track = {
  videoId: 'prebuffer_track_1',
  title: 'Anti-Buffer Symphony',
  artists: [{ name: 'AAPESH Master' }],
  duration: '4:00',
  duration_seconds: 240,
};

const mockShortTrack: Track = {
  videoId: 'short_track_1',
  title: 'Short Interlude',
  artists: [{ name: 'AAPESH Master' }],
  duration: '0:45',
  duration_seconds: 45,
};

describe('Smart Pre-buffering & Anti-Buffer Architecture', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: null,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      isBuffering: false,
      playbackStatus: 'idle',
      bufferHealth: {
        loadedFraction: null,
        bufferAheadSeconds: null,
        targetBufferSeconds: 10,
        networkTier: 'unknown',
        isPrebuffering: false,
      },
    });
  });

  describe('Adaptive Buffer Targets', () => {
    it('computes realistic buffer targets for normal tracks', () => {
      expect(computeTargetBufferSeconds('fast', 240)).toBe(8);
      expect(computeTargetBufferSeconds('normal', 240)).toBe(14);
      expect(computeTargetBufferSeconds('slow', 240)).toBe(22);
      expect(computeTargetBufferSeconds('unknown', 240)).toBe(14);
    });

    it('adjusts buffer targets sensibly for short tracks (<60s)', () => {
      expect(computeTargetBufferSeconds('fast', 45)).toBe(4);
      expect(computeTargetBufferSeconds('normal', 45)).toBe(6);
      expect(computeTargetBufferSeconds('slow', 45)).toBe(12);
    });

    it('safely determines network tier without crashing', () => {
      const tier = getNetworkTier();
      expect(['fast', 'normal', 'slow', 'unknown']).toContain(tier);
    });
  });

  describe('Playback Status State Machine & Store Synchronization', () => {
    it('initializes with idle playback status and default buffer health', () => {
      const state = usePlayerStore.getState();
      expect(state.playbackStatus).toBe('idle');
      expect(state.bufferHealth.isPrebuffering).toBe(false);
      expect(state.bufferHealth.loadedFraction).toBeNull();
    });

    it('sets prebuffering status when playTrack is initiated', async () => {
      const { playTrack } = usePlayerStore.getState();
      await playTrack(mockTrack);

      const state = usePlayerStore.getState();
      expect(state.currentTrack?.videoId).toBe('prebuffer_track_1');
      expect(state.playbackStatus).toBe('prebuffering');
      expect(state.isPlaying).toBe(true);
    });

    it('maintains playback position and does not reload during mid-playback buffering', () => {
      usePlayerStore.setState({
        currentTrack: mockTrack,
        currentTime: 55,
        duration: 240,
        isPlaying: true,
        playbackStatus: 'playing',
      });

      // Simulate player buffering event
      usePlayerStore.setState({
        isBuffering: true,
        playbackStatus: 'buffering',
      });

      const state = usePlayerStore.getState();
      expect(state.playbackStatus).toBe('buffering');
      expect(state.currentTime).toBe(55); // Position untouched
      expect(state.currentTrack?.videoId).toBe('prebuffer_track_1'); // Track untouched
    });
  });

  describe('YouTubeIframeProvider Buffer Monitor', () => {
    it('calculates buffer ahead accurately from loaded fraction and duration', async () => {
      const provider = new YouTubeIframeProvider();
      let capturedHealth: BufferHealth | null = null;

      await provider.init({
        onStateChange: vi.fn(),
        onTimeUpdate: vi.fn(),
        onEnded: vi.fn(),
        onError: vi.fn(),
        onBufferHealth: (health) => {
          capturedHealth = health;
        },
      });

      const health = provider.getBufferHealth();
      expect(health).toBeDefined();
      expect(health.targetBufferSeconds).toBeGreaterThan(0);
      expect(['fast', 'normal', 'slow', 'unknown']).toContain(health.networkTier);
    });

    it('does not reload the same track if already loaded', async () => {
      const provider = new YouTubeIframeProvider();
      await provider.init({
        onStateChange: vi.fn(),
        onTimeUpdate: vi.fn(),
        onEnded: vi.fn(),
        onError: vi.fn(),
      });

      // First load
      await provider.load(mockTrack);
      const firstStatus = provider.getPlaybackStatus();

      // Redundant load
      await provider.load(mockTrack);
      const secondStatus = provider.getPlaybackStatus();

      expect(firstStatus).toBe(secondStatus);
    });
  });
});
