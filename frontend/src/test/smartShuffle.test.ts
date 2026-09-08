import { describe, it, expect } from 'vitest';
import { smartShuffleQueue, standardShuffle, ShuffleMode } from '../utils/smartShuffle';
import { Track } from '../types/music';

const makeTrack = (id: string, title: string, artistName: string): Track => ({
  videoId: id,
  title,
  artists: [{ name: artistName }],
});

describe('Smart Shuffle Algorithm', () => {
  it('preserves past and current tracks unchanged', () => {
    const queue = [
      makeTrack('1', 'Song 1', 'Artist A'),
      makeTrack('2', 'Song 2', 'Artist B'),
      makeTrack('3', 'Song 3', 'Artist C'),
      makeTrack('4', 'Song 4', 'Artist D'),
    ];

    const result = smartShuffleQueue(queue, 1);
    expect(result[0].videoId).toBe('1');
    expect(result[1].videoId).toBe('2');
    expect(result).toHaveLength(4);
  });

  it('penalizes consecutive repetitions of the same artist', () => {
    const queue = [
      makeTrack('1', 'Song 1', 'The Weeknd'),
      makeTrack('2', 'Song 2', 'The Weeknd'),
      makeTrack('3', 'Song 3', 'Daft Punk'),
      makeTrack('4', 'Song 4', 'The Weeknd'),
      makeTrack('5', 'Song 5', 'Kendrick Lamar'),
    ];

    // Current track is '1' (The Weeknd) at index 0.
    // Smart shuffle should strongly prefer picking a non-Weeknd track right after index 0.
    let nonConsecutiveCount = 0;
    const runs = 20;

    for (let r = 0; r < runs; r++) {
      const shuffled = smartShuffleQueue(queue, 0);
      if (shuffled[1].artists[0].name !== 'The Weeknd') {
        nonConsecutiveCount++;
      }
    }

    // Expect almost all runs to pick Daft Punk or Kendrick Lamar next, not The Weeknd
    expect(nonConsecutiveCount).toBeGreaterThanOrEqual(15);
  });

  it('handles empty or single-element queue gracefully', () => {
    expect(smartShuffleQueue([], 0)).toEqual([]);
    const single = [makeTrack('1', 'Solo', 'Artist')];
    expect(smartShuffleQueue(single, 0)).toEqual(single);
  });
});
