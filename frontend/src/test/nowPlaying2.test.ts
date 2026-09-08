import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useEqualizerStore } from '@/stores/useEqualizerStore';
import { Track } from '@/types/music';

const mockTrack: Track = {
  videoId: 'now-playing-2-track',
  title: 'Starboy (AAPESH Spatial Edition)',
  artists: [{ name: 'The Weeknd', id: 'artist-weeknd' }],
  duration: '3:50',
  duration_seconds: 230,
  thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
};

describe('AAPESH Now Playing 2.0 — Spatial Workstation Engine', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: mockTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 230,
      volume: 80,
      isMuted: false,
      repeatMode: 'off',
      shuffleMode: 'off',
      isPlayerExpanded: false,
      fullscreenTab: 'art',
      queue: [mockTrack],
      currentIndex: 0,
    });
  });

  it('manages fullscreen view modes (Cover, Lyrics, Queue, Video)', () => {
    const store = usePlayerStore.getState();
    expect(store.fullscreenTab).toBe('art');

    store.setFullscreenTab('lyrics');
    expect(usePlayerStore.getState().fullscreenTab).toBe('lyrics');

    store.setFullscreenTab('queue');
    expect(usePlayerStore.getState().fullscreenTab).toBe('queue');

    store.setFullscreenTab('video');
    expect(usePlayerStore.getState().fullscreenTab).toBe('video');

    store.setFullscreenTab('art');
    expect(usePlayerStore.getState().fullscreenTab).toBe('art');
  });

  it('synchronizes fullscreen expansion and playback state with persistent store', () => {
    const store = usePlayerStore.getState();
    expect(store.isPlayerExpanded).toBe(false);

    store.setPlayerExpanded(true);
    expect(usePlayerStore.getState().isPlayerExpanded).toBe(true);

    store.togglePlay();
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    store.seek(75);
    expect(usePlayerStore.getState().currentTime).toBe(75);

    store.setVolume(95);
    expect(usePlayerStore.getState().volume).toBe(95);

    store.togglePlayerExpanded();
    expect(usePlayerStore.getState().isPlayerExpanded).toBe(false);
  });

  it('integrates with Equalizer and Spatial Audio DSP store', () => {
    const eqStore = useEqualizerStore.getState();
    expect(eqStore.spatialAudio).toBeDefined();

    const initialState = eqStore.spatialAudio;
    eqStore.toggleSpatialAudio();
    expect(useEqualizerStore.getState().spatialAudio).toBe(!initialState);
  });
});
