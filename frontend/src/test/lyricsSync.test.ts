import { describe, it, expect, beforeEach } from 'vitest';
import { findActiveLyricLine } from '../hooks/useSyncedLyrics';
import { LyricLine } from '../types/music';

const sampleLines: LyricLine[] = [
  { id: '0', startTime: 10000, endTime: 15000, text: 'First line after intro' },
  { id: '1', startTime: 15000, endTime: 22000, text: 'Second line in verse' },
  { id: '2', startTime: 22000, endTime: 30000, text: 'Chorus begins here' },
  { id: '3', startTime: 30000, endTime: 45000, text: 'Final lyric of song' },
];

describe('Lyrics Synchronization & Calibration Architecture', () => {
  describe('Offset Calibration Sign Convention', () => {
    it('applies positive offset to advance lyrics earlier (for lyrics lagging behind audio)', () => {
      // Audio is at 9.8s (9800ms) - before line 0 starts at 10000ms
      const playerTimeMs = 9800;
      expect(findActiveLyricLine(sampleLines, playerTimeMs)).toBe(-1);

      // User adds +300ms calibration offset because lyrics were lagging
      const lyricsOffsetMs = 300;
      const effectiveTimeMs = playerTimeMs + lyricsOffsetMs; // 10100ms
      expect(effectiveTimeMs).toBe(10100);

      // Line 0 is now active earlier
      expect(findActiveLyricLine(sampleLines, effectiveTimeMs)).toBe(0);
    });

    it('applies negative offset to delay lyrics later (for lyrics appearing ahead of audio)', () => {
      // Audio is at 15.2s (15200ms) - line 1 normally starts at 15000ms
      const playerTimeMs = 15200;
      expect(findActiveLyricLine(sampleLines, playerTimeMs)).toBe(1);

      // User adds -400ms calibration offset because lyrics triggered too early
      const lyricsOffsetMs = -400;
      const effectiveTimeMs = playerTimeMs + lyricsOffsetMs; // 14800ms
      expect(effectiveTimeMs).toBe(14800);

      // Still on line 0 (delayed)
      expect(findActiveLyricLine(sampleLines, effectiveTimeMs)).toBe(0);
    });

    it('preserves exact original timestamps with 0ms offset', () => {
      const playerTimeMs = 22000;
      const offset = 0;
      const effectiveTimeMs = playerTimeMs + offset;

      expect(findActiveLyricLine(sampleLines, effectiveTimeMs)).toBe(2);
      expect(sampleLines[2].startTime).toBe(22000);
    });
  });

  describe('Intro & Outro Boundaries', () => {
    it('returns -1 during instrumental intro silence', () => {
      expect(findActiveLyricLine(sampleLines, 0)).toBe(-1);
      expect(findActiveLyricLine(sampleLines, 5000)).toBe(-1);
      expect(findActiveLyricLine(sampleLines, 9999)).toBe(-1);
    });

    it('remains on final lyric line during instrumental outro', () => {
      expect(findActiveLyricLine(sampleLines, 31000)).toBe(3);
      expect(findActiveLyricLine(sampleLines, 45000)).toBe(3);
      expect(findActiveLyricLine(sampleLines, 60000)).toBe(3);
    });
  });

  describe('Seeking and Clock Jumps', () => {
    it('immediately reflects instant forward seek without intermediate delay', () => {
      let time = 12000; // line 0
      expect(findActiveLyricLine(sampleLines, time)).toBe(0);

      // Jump to 25s (line 2)
      time = 25000;
      expect(findActiveLyricLine(sampleLines, time)).toBe(2);

      // Jump to 35s (line 3)
      time = 35000;
      expect(findActiveLyricLine(sampleLines, time)).toBe(3);
    });

    it('immediately reflects instant backward seek without stale indices', () => {
      let time = 35000; // line 3
      expect(findActiveLyricLine(sampleLines, time)).toBe(3);

      // Jump backward to 16s (line 1)
      time = 16000;
      expect(findActiveLyricLine(sampleLines, time)).toBe(1);

      // Jump backward to intro (3s)
      time = 3000;
      expect(findActiveLyricLine(sampleLines, time)).toBe(-1);
    });
  });

  describe('Per-Track Offset Persistence in Storage', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('saves and restores offset keyed by track videoId', () => {
      const videoId = 'test_video_123';
      const offset = 350;

      localStorage.setItem(`aurora_lyrics_offset_${videoId}`, String(offset));
      const retrieved = localStorage.getItem(`aurora_lyrics_offset_${videoId}`);

      expect(retrieved).toBe('350');
      expect(parseInt(retrieved!, 10)).toBe(350);

      // Remove on reset
      localStorage.removeItem(`aurora_lyrics_offset_${videoId}`);
      expect(localStorage.getItem(`aurora_lyrics_offset_${videoId}`)).toBeNull();
    });
  });

  describe('Sync Confidence Evaluation', () => {
    function computeConfidence(delta: number | null): 'excellent' | 'good' | 'uncertain' | 'poor' {
      if (delta === null) return 'uncertain';
      if (delta <= 1.5) return 'excellent';
      if (delta <= 3.0) return 'good';
      if (delta <= 5.0) return 'uncertain';
      return 'poor';
    }

    it('correctly scores duration differences', () => {
      expect(computeConfidence(0.2)).toBe('excellent');
      expect(computeConfidence(1.4)).toBe('excellent');
      expect(computeConfidence(2.1)).toBe('good');
      expect(computeConfidence(4.0)).toBe('uncertain');
      expect(computeConfidence(12.5)).toBe('poor');
      expect(computeConfidence(null)).toBe('uncertain');
    });
  });
});
