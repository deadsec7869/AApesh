import { describe, it, expect } from 'vitest';
import {
  getLineWords,
  getWordStatus,
  getWordProgress,
  getCharacterProgress,
  getGraphemeClusters,
  parseEnhancedLrcLine,
  computeWordCharacters,
  determineLineTimingLevel,
  determineLyricsTimingLevel,
  tokenizeLyricLine,
} from '../utils/wordSync';
import { LyricLine } from '../types/music';

describe('Karaoke 2.0.1 Word & Character Synchronization Architecture', () => {
  describe('Unicode Grapheme Cluster Segmentation', () => {
    it('correctly segments standard English text', () => {
      const clusters = getGraphemeClusters('Hello');
      expect(clusters).toEqual(['H', 'e', 'l', 'l', 'o']);
    });

    it('preserves multi-codepoint accented characters as single graphemes', () => {
      const accented = 'café';
      const clusters = getGraphemeClusters(accented);
      expect(clusters).toEqual(['c', 'a', 'f', 'é']);
    });

    it('correctly segments Urdu and Arabic words without breaking joining', () => {
      const urdu = 'محبت';
      const clusters = getGraphemeClusters(urdu);
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.join('')).toBe(urdu);
    });

    it('correctly segments Devanagari text with vowel signs / matras', () => {
      const hindi = 'नमस्ते';
      const clusters = getGraphemeClusters(hindi);
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.join('')).toBe(hindi);
    });

    it('handles emoji grapheme clusters without splitting surrogate pairs', () => {
      const withEmoji = 'Music 🎶✨';
      const clusters = getGraphemeClusters(withEmoji);
      expect(clusters).toContain('🎶');
      expect(clusters).toContain('✨');
    });
  });

  describe('Enhanced LRC Word Timestamp Parser', () => {
    it('parses inline Enhanced LRC timestamps into exact words', () => {
      const raw = '<00:12.42>Take <00:12.71>me <00:12.93>home <00:13.50>tonight';
      const parsed = parseEnhancedLrcLine(raw, 12000, 14500);

      expect(parsed.hasExactTiming).toBe(true);
      expect(parsed.cleanText).toBe('Take me home tonight');
      expect(parsed.words).toHaveLength(4);
      expect(parsed.words[0].text).toBe('Take');
      expect(parsed.words[0].startTime).toBe(12420);
      expect(parsed.words[0].endTime).toBe(12710);
      expect(parsed.words[0].isEstimated).toBe(false);

      expect(parsed.words[1].text).toBe('me');
      expect(parsed.words[1].startTime).toBe(12710);
      expect(parsed.words[1].endTime).toBe(12930);

      expect(parsed.words[3].text).toBe('tonight');
      expect(parsed.words[3].startTime).toBe(13500);
      expect(parsed.words[3].endTime).toBe(14500);
    });

    it('returns hasExactTiming false when no inline timestamps are present', () => {
      const raw = 'Just a regular line without inline tags';
      const parsed = parseEnhancedLrcLine(raw, 5000, 8000);
      expect(parsed.hasExactTiming).toBe(false);
      expect(parsed.cleanText).toBe(raw);
      expect(parsed.words).toHaveLength(0);
    });
  });

  describe('Timing Level Resolution Hierarchy', () => {
    it('resolves to "word" when exact word timestamps exist', () => {
      const line: LyricLine = {
        id: '1',
        text: 'Take me home',
        startTime: 1000,
        endTime: 3000,
        words: [
          { text: 'Take', startTime: 1000, endTime: 1500, isEstimated: false },
          { text: 'me', startTime: 1500, endTime: 2000, isEstimated: false },
          { text: 'home', startTime: 2000, endTime: 3000, isEstimated: false },
        ],
      };
      expect(determineLineTimingLevel(line)).toBe('word');
      expect(determineLyricsTimingLevel([line])).toBe('word');
    });

    it('resolves to "estimated-word" when word timestamps are generated phonetically', () => {
      const line: LyricLine = {
        id: '2',
        text: 'Proportional fallback line',
        startTime: 4000,
        endTime: 8000,
      };
      expect(determineLineTimingLevel(line)).toBe('estimated-word');
      expect(determineLyricsTimingLevel([line])).toBe('estimated-word');
    });

    it('resolves to "none" when no start times are provided', () => {
      const line: LyricLine = {
        id: '3',
        text: 'Unsynced text line',
      };
      expect(determineLineTimingLevel(line)).toBe('none');
      expect(determineLyricsTimingLevel([line])).toBe('none');
    });
  });

  describe('Word Extraction & Fallback Generator', () => {
    it('uses explicit word timestamps when provided', () => {
      const lineWithWords: LyricLine = {
        id: '1',
        text: 'Hello wonderful world',
        startTime: 1000,
        endTime: 4000,
        words: [
          { text: 'Hello', startTime: 1000, endTime: 1800, isEstimated: false },
          { text: 'wonderful', startTime: 1800, endTime: 3000, isEstimated: false },
          { text: 'world', startTime: 3000, endTime: 4000, isEstimated: false },
        ],
      };

      const words = getLineWords(lineWithWords);
      expect(words).toHaveLength(3);
      expect(words[0].text).toBe('Hello');
      expect(words[0].startTime).toBe(1000);
      expect(words[0].endTime).toBe(1800);
      expect(words[0].isEstimated).toBe(false);
      expect(words[0].characters).toBeDefined();
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
      expect(words[0].isEstimated).toBe(true);

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

  describe('Intra-word Continuous Progress & Character Progression', () => {
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

    it('calculates character progression breakdown accurately', () => {
      // 6 characters: L-i-q-u-i-d over 1000ms
      const progHalf = getCharacterProgress(word, 1500);
      expect(progHalf.totalChars).toBe(6);
      expect(progHalf.highlightedCount).toBe(3); // 3 of 6 characters highlighted
      expect(progHalf.progress).toBeCloseTo(0.5, 2);

      const progStart = getCharacterProgress(word, 1000);
      expect(progStart.highlightedCount).toBe(0);

      const progEnd = getCharacterProgress(word, 2000);
      expect(progEnd.highlightedCount).toBe(6);
    });
  });
});
