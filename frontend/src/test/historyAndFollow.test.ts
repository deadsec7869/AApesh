import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { Track } from '@/types/music';

describe('Recently Played & Following Artists Repair Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    usePlayerStore.setState({
      recentlyPlayed: [],
      currentTrack: null,
    });
    useLibraryStore.setState({
      followedArtists: [],
    });
  });

  it('adds track to Recently Played when played and deduplicates to front', () => {
    const track1: Track = {
      videoId: 'track-1',
      title: 'Blinding Lights',
      artists: [{ name: 'The Weeknd' }],
    };
    const track2: Track = {
      videoId: 'track-2',
      title: 'Starboy',
      artists: [{ name: 'The Weeknd' }],
    };

    usePlayerStore.getState().addToRecentlyPlayed(track1);
    expect(usePlayerStore.getState().recentlyPlayed).toHaveLength(1);
    expect(usePlayerStore.getState().recentlyPlayed[0].videoId).toBe('track-1');

    usePlayerStore.getState().addToRecentlyPlayed(track2);
    expect(usePlayerStore.getState().recentlyPlayed).toHaveLength(2);
    expect(usePlayerStore.getState().recentlyPlayed[0].videoId).toBe('track-2');

    // Playing track1 again moves it to front without duplicate
    usePlayerStore.getState().addToRecentlyPlayed(track1);
    expect(usePlayerStore.getState().recentlyPlayed).toHaveLength(2);
    expect(usePlayerStore.getState().recentlyPlayed[0].videoId).toBe('track-1');
    expect(usePlayerStore.getState().recentlyPlayed[1].videoId).toBe('track-2');
  });

  it('caps Recently Played at 30 items', () => {
    for (let i = 1; i <= 35; i++) {
      usePlayerStore.getState().addToRecentlyPlayed({
        videoId: `vid-${i}`,
        title: `Track ${i}`,
        artists: [{ name: 'Artist' }],
      });
    }

    const state = usePlayerStore.getState();
    expect(state.recentlyPlayed).toHaveLength(30);
    expect(state.recentlyPlayed[0].videoId).toBe('vid-35');
  });

  it('follows and unfollows artists correctly', () => {
    const artist1 = {
      id: 'art-1',
      name: 'The Weeknd',
      thumbnail: 'https://example.com/art.jpg',
      songs: '24 songs',
    };

    const store = useLibraryStore.getState();
    expect(store.isFollowingArtist('art-1')).toBe(false);

    store.followArtist(artist1);
    expect(useLibraryStore.getState().isFollowingArtist('art-1')).toBe(true);
    expect(useLibraryStore.getState().followedArtists).toHaveLength(1);

    // Duplicate follow does not add duplicate
    useLibraryStore.getState().followArtist(artist1);
    expect(useLibraryStore.getState().followedArtists).toHaveLength(1);

    useLibraryStore.getState().unfollowArtist('art-1');
    expect(useLibraryStore.getState().isFollowingArtist('art-1')).toBe(false);
    expect(useLibraryStore.getState().followedArtists).toHaveLength(0);
  });
});
