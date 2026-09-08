import { describe, it, expect } from 'vitest';
import { getLineWords, getWordStatus, getWordProgress, tokenizeLyricLine } from '../utils/wordSync';
import { LyricLine } from '../types/music';

describe('Word-to-Word Synchronization Architecture', () => {
  describe('Word Extraction & Fallback Generator', () => {
    it('uses explicit word timestamps when provided by the backend', () => {
      const lineWithWords: LyricLine = {
        id: '1',
        text: 'Hello wonderful world',
        startTime: 1000,
        endTime: 4000,
        words: [
          { text: 'Hello', startTime: 1000, endTime: 1800 },
          { text: 'wonderful', startTime: 1800, endTime: 3000 },
          { text: 'world', startTime: 3000, endTime: 4000 },
        ],
      };

      const words = getLineWords(lineWithWords);
      expect(words).toHaveLength(3);
      expect(words[0]).toEqual({ text: 'Hello', startTime: 1000, endTime: 1800 });
      expect(words[1]).toEqual({ text: 'wonderful', startTime: 1800, endTime: 3000 });
      expect(words[2]).toEqual({ text: 'world', startTime: 3000, endTime: 4000 });
    });

    it('generates natural proportional phonetic word timings when explicit words are missing', () => {
      const lineWithoutWords: LyricLine = {
        id: '2',
        text: 'Never gonna give you up',
        startTime: 2000,
        endTime: 6000, // 4000ms duration
      };

      const words = getLineWords(lineWithoutWords);
      expect(words).toHaveLength(5);
      expect(words.map((w) => w.text)).toEqual(['Never', 'gonna', 'give', 'you', 'up']);

      // First word starts at line start
      expect(words[0].startTime).toBe(2000);
      // Last word ends at line end
      expect(words[4].endTime).toBe(6000);

      // Monotonically increasing timestamps
      for (let i = 0; i < words.length - 1; i++) {
        expect(words[i].startTime).toBeLessThan(words[i].endTime!);
        expect(words[i].endTime).toBeLessThanOrEqual(words[i + 1].startTime);
      }
    });

    it('correctly segments and generates word timings for Urdu and RTL lyrics', () => {
      const urduLine: LyricLine = {
        id: '3',
        text: 'دل دیا گلاں کراں گے روز',
        startTime: 5000,
        endTime: 9000,
      };

      const words = getLineWords(urduLine);
      expect(words.length).toBe(6);
      expect(words[0].text).toBe('دل');
      expect(words[0].startTime).toBe(5000);
      expect(words[5].text).toBe('روز');
      expect(words[5].endTime).toBe(9000);
    });

    it('infers nextLineStartTime when line.endTime is not provided', () => {
      const line: LyricLine = {
        id: '4',
        text: 'Just one phrase',
        startTime: 10000,
      };

      const words = getLineWords(line, 14000);
      expect(words[0].startTime).toBe(10000);
      expect(words[words.length - 1].endTime).toBe(14000);
    });
  });

  describe('Word Playback Status Calculation', () => {
    const word = { text: 'Aurora', startTime: 5000, endTime: 6500 };

    it('returns "upcoming" before word start time', () => {
      expect(getWordStatus(word, 4999)).toBe('upcoming');
      expect(getWordStatus(word, 0)).toBe('upcoming');
    });

    it('returns "active" while playback is within word duration', () => {
      expect(getWordStatus(word, 5000)).toBe('active');
      expect(getWordStatus(word, 5500)).toBe('active');
      expect(getWordStatus(word, 6499)).toBe('active');
    });

    it('returns "sung" once playback passes word end time', () => {
      expect(getWordStatus(word, 6500)).toBe('sung');
      expect(getWordStatus(word, 7000)).toBe('sung');
    });
  });

  describe('Intra-word Continuous Progress', () => {
    const word = { text: 'Liquid', startTime: 1000, endTime: 2000 };

    it('calculates 0% at or before start', () => {
      expect(getWordProgress(word, 800)).toBe(0);
      expect(getWordProgress(word, 1000)).toBe(0);
    });

    it('calculates fractional progress during singing', () => {
      expect(getWordProgress(word, 1500)).toBeCloseTo(0.5, 2);
      expect(getWordProgress(word, 1750)).toBeCloseTo(0.75, 2);
    });

    it('calculates 100% after completion', () => {
      expect(getWordProgress(word, 2000)).toBe(1);
      expect(getWordProgress(word, 3000)).toBe(1);
    });
  });
});
