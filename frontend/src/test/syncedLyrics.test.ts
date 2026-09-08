import { describe, it, expect } from 'vitest';
import { findActiveLyricLine } from '../hooks/useSyncedLyrics';
import { LyricLine } from '../types/music';

const mockSyncedLines: LyricLine[] = [
  { id: '0', startTime: 10000, endTime: 15000, text: 'First line of the song' },
  { id: '1', startTime: 15000, endTime: 22000, text: 'Second line continues' },
  { id: '2', startTime: 22000, endTime: 30000, text: 'Third line in chorus' },
  { id: '3', startTime: 30000, endTime: 45000, text: 'Fourth line ending' },
];

describe('findActiveLyricLine (Binary Search Synchronizer)', () => {
  it('returns -1 before the first lyric line starts (instrumental intro)', () => {
    expect(findActiveLyricLine(mockSyncedLines, 0)).toBe(-1);
    expect(findActiveLyricLine(mockSyncedLines, 5000)).toBe(-1);
    expect(findActiveLyricLine(mockSyncedLines, 9999)).toBe(-1);
  });

  it('matches exact start times', () => {
    expect(findActiveLyricLine(mockSyncedLines, 10000)).toBe(0);
    expect(findActiveLyricLine(mockSyncedLines, 15000)).toBe(1);
    expect(findActiveLyricLine(mockSyncedLines, 22000)).toBe(2);
    expect(findActiveLyricLine(mockSyncedLines, 30000)).toBe(3);
  });

  it('matches timestamps midway through a line', () => {
    expect(findActiveLyricLine(mockSyncedLines, 12500)).toBe(0);
    expect(findActiveLyricLine(mockSyncedLines, 18000)).toBe(1);
    expect(findActiveLyricLine(mockSyncedLines, 29999)).toBe(2);
    expect(findActiveLyricLine(mockSyncedLines, 35000)).toBe(3);
  });

  it('maintains the last line after song passes last startTime', () => {
    expect(findActiveLyricLine(mockSyncedLines, 50000)).toBe(3);
    expect(findActiveLyricLine(mockSyncedLines, 120000)).toBe(3);
  });

  it('handles forward seeking correctly without missing target line', () => {
    // Start at line 0 (12s)
    let active = findActiveLyricLine(mockSyncedLines, 12000);
    expect(active).toBe(0);

    // Seek forward directly to 32s (line 3)
    active = findActiveLyricLine(mockSyncedLines, 32000);
    expect(active).toBe(3);
  });

  it('handles backward seeking correctly without stale indices', () => {
    // Start at line 3 (32s)
    let active = findActiveLyricLine(mockSyncedLines, 32000);
    expect(active).toBe(3);

    // Seek backward directly to 16s (line 1)
    active = findActiveLyricLine(mockSyncedLines, 16000);
    expect(active).toBe(1);

    // Seek back to start of song (2s)
    active = findActiveLyricLine(mockSyncedLines, 2000);
    expect(active).toBe(-1);
  });

  it('handles empty or malformed lyric lines gracefully', () => {
    expect(findActiveLyricLine([], 15000)).toBe(-1);
    expect(findActiveLyricLine(undefined, 15000)).toBe(-1);

    const unsyncedLines: LyricLine[] = [
      { id: '0', text: 'Static line 1' },
      { id: '1', text: 'Static line 2' },
    ];
    expect(findActiveLyricLine(unsyncedLines, 15000)).toBe(-1);
  });
});
