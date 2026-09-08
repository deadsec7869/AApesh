import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../stores/usePlayerStore';
import { Track } from '../types/music';

const mockTrack1: Track = {
  videoId: 'track_1',
  title: 'Starboy',
  artists: [{ name: 'The Weeknd' }],
  duration: '3:50',
  duration_seconds: 230,
};

const mockTrack2: Track = {
  videoId: 'track_2',
  title: 'Blinding Lights',
  artists: [{ name: 'The Weeknd' }],
  duration: '3:20',
  duration_seconds: 200,
};

describe('usePlayerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: null,
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      volume: 80,
      isMuted: false,
      repeatMode: 'off',
      shuffleEnabled: false,
    });
  });

  it('initializes with default values', () => {
    const state = usePlayerStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.queue).toEqual([]);
    expect(state.isPlaying).toBe(false);
  });

  it('adds tracks to queue', () => {
    const { addToQueue } = usePlayerStore.getState();
    addToQueue(mockTrack1);
    expect(usePlayerStore.getState().queue).toHaveLength(1);
    expect(usePlayerStore.getState().queue[0].title).toBe('Starboy');

    addToQueue(mockTrack2);
    expect(usePlayerStore.getState().queue).toHaveLength(2);
    expect(usePlayerStore.getState().queue[1].title).toBe('Blinding Lights');
  });

  it('handles volume changes and muting', () => {
    const { setVolume, toggleMute } = usePlayerStore.getState();
    setVolume(60);
    expect(usePlayerStore.getState().volume).toBe(60);
    expect(usePlayerStore.getState().isMuted).toBe(false);

    // Mute
    toggleMute();
    expect(usePlayerStore.getState().volume).toBe(0);
    expect(usePlayerStore.getState().isMuted).toBe(true);

    // Unmute
    toggleMute();
    expect(usePlayerStore.getState().volume).toBe(60);
    expect(usePlayerStore.getState().isMuted).toBe(false);
  });

  it('toggles repeat modes correctly', () => {
    const { toggleRepeat } = usePlayerStore.getState();
    expect(usePlayerStore.getState().repeatMode).toBe('off');

    toggleRepeat();
    expect(usePlayerStore.getState().repeatMode).toBe('queue');

    toggleRepeat();
    expect(usePlayerStore.getState().repeatMode).toBe('track');

    toggleRepeat();
    expect(usePlayerStore.getState().repeatMode).toBe('off');
  });

  it('handles playNext, removeFromQueue, and reorderQueue', () => {
    const { addToQueue, playNext, removeFromQueue, reorderQueue, clearQueue } = usePlayerStore.getState();
    addToQueue(mockTrack1);
    usePlayerStore.setState({ currentTrack: mockTrack1, currentIndex: 0 });

    addToQueue(mockTrack2); // queue: [mockTrack1, mockTrack2]

    const mockTrack3: Track = {
      videoId: 'track_3',
      title: 'Save Your Tears',
      artists: [{ name: 'The Weeknd' }],
    };

    // playNext should insert track 3 at index 1 (right after index 0)
    playNext(mockTrack3);
    const queueAfterPlayNext = usePlayerStore.getState().queue;
    expect(queueAfterPlayNext).toHaveLength(3);
    expect(queueAfterPlayNext[1].videoId).toBe('track_3');
    expect(queueAfterPlayNext[2].videoId).toBe('track_2');

    // reorderQueue: move track at index 2 to index 1
    reorderQueue(2, 1);
    const queueAfterReorder = usePlayerStore.getState().queue;
    expect(queueAfterReorder[1].videoId).toBe('track_2');
    expect(queueAfterReorder[2].videoId).toBe('track_3');

    // removeFromQueue: remove index 1 (track_2)
    removeFromQueue(1);
    const queueAfterRemove = usePlayerStore.getState().queue;
    expect(queueAfterRemove).toHaveLength(2);
    expect(queueAfterRemove.map((t) => t.videoId)).toEqual(['track_1', 'track_3']);

    // clearQueue() clears upcoming tracks while preserving currentTrack
    clearQueue();
    expect(usePlayerStore.getState().queue).toHaveLength(1);
    expect(usePlayerStore.getState().queue[0].videoId).toBe('track_1');

    // clearQueue(true) clears entire queue including currentTrack
    clearQueue(true);
    expect(usePlayerStore.getState().queue).toHaveLength(0);
    expect(usePlayerStore.getState().currentIndex).toBe(-1);
    expect(usePlayerStore.getState().currentTrack).toBeNull();
  });

  it('preserves current track and restores original sequence when shuffling 10 tracks', () => {
    const tenTracks: Track[] = Array.from({ length: 10 }, (_, i) => ({
      videoId: `video_${i + 1}`,
      title: `Track ${i + 1}`,
      artists: [{ name: 'Artist' }],
      duration: '3:00',
      duration_seconds: 180,
    }));

    usePlayerStore.setState({
      queue: [...tenTracks],
      originalQueue: [...tenTracks],
      currentTrack: tenTracks[0],
      currentIndex: 0,
      shuffleEnabled: false,
    });

    const { toggleShuffle } = usePlayerStore.getState();

    // Enable Shuffle
    toggleShuffle();
    const shuffledState = usePlayerStore.getState();
    expect(shuffledState.shuffleEnabled).toBe(true);
    expect(shuffledState.queue).toHaveLength(10);
    // Current track must be preserved at index 0
    expect(shuffledState.queue[0].videoId).toBe('video_1');
    expect(shuffledState.currentTrack?.videoId).toBe('video_1');

    // All original tracks must still be in the shuffled queue
    const shuffledIds = shuffledState.queue.map((t) => t.videoId).sort();
    const originalIds = tenTracks.map((t) => t.videoId).sort();
    expect(shuffledIds).toEqual(originalIds);

    // Disable Shuffle: must restore exact original sequence
    toggleShuffle();
    const restoredState = usePlayerStore.getState();
    expect(restoredState.shuffleEnabled).toBe(false);
    expect(restoredState.queue.map((t) => t.videoId)).toEqual(tenTracks.map((t) => t.videoId));
    expect(restoredState.currentIndex).toBe(0);
  });

  it('measures and updates bottom player height and dynamic clearance', () => {
    const { setBottomPlayerDimensions } = usePlayerStore.getState();
    expect(usePlayerStore.getState().bottomPlayerHeight).toBe(76);
    expect(usePlayerStore.getState().bottomPlayerClearance).toBe(128);

    setBottomPlayerDimensions(84, 140);
    expect(usePlayerStore.getState().bottomPlayerHeight).toBe(84);
    expect(usePlayerStore.getState().bottomPlayerClearance).toBe(140);
  });
});


