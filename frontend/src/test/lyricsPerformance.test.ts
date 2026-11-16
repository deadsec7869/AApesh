import { describe, it, expect, vi } from 'vitest';
import {
  findActiveLyricLine,
  getActiveLineIndexFast,
  updateActiveLineKaraokeDom,
} from '../hooks/useSyncedLyrics';
import { LyricLine } from '../types/music';

const mockLines: LyricLine[] = [
  { id: '0', startTime: 0, endTime: 4000, text: 'Intro line' },
  { id: '1', startTime: 4000, endTime: 8000, text: 'Second line of verse' },
  { id: '2', startTime: 8000, endTime: 12000, text: 'Third line builds up' },
  { id: '3', startTime: 12000, endTime: 18000, text: 'Chorus erupts here' },
  { id: '4', startTime: 18000, endTime: 25000, text: 'تم کیا کر رہے ہو', direction: 'rtl', script: 'arabic' },
  { id: '5', startTime: 25000, endTime: 35000, text: 'Outro final fade' },
];

describe('Lyrics Performance Architecture — Fast Active Line Lookup', () => {
  it('monotonic lookup resolves active line in O(1) during normal forward progression', () => {
    // Current is line 0, time advances slightly inside line 0
    expect(getActiveLineIndexFast(mockLines, 2500, 0)).toBe(0);

    // Current is line 0, time crosses into line 1
    expect(getActiveLineIndexFast(mockLines, 4500, 0)).toBe(1);

    // Current is line 1, time advances inside line 1
    expect(getActiveLineIndexFast(mockLines, 7000, 1)).toBe(1);

    // Current is line 1, time crosses into line 2
    expect(getActiveLineIndexFast(mockLines, 8200, 1)).toBe(2);

    // Current is line 2, time advances inside line 2
    expect(getActiveLineIndexFast(mockLines, 10000, 2)).toBe(2);
  });

  it('handles rapid forward seek by falling back to binary search seamlessly', () => {
    // Playing at line 1 (6000ms), user seeks to 20000ms (line 4)
    expect(getActiveLineIndexFast(mockLines, 20000, 1)).toBe(4);

    // Playing at line 4 (20000ms), user seeks to 30000ms (line 5)
    expect(getActiveLineIndexFast(mockLines, 30000, 4)).toBe(5);
  });

  it('handles rapid backward seek instantly without stale indices', () => {
    // Currently at line 4 (22000ms), user seeks backward to 5000ms (line 1)
    expect(getActiveLineIndexFast(mockLines, 5000, 4)).toBe(1);

    // User seeks backward to intro silence before any timed line (if applicable)
    const linesWithIntroGap: LyricLine[] = [
      { id: '0', startTime: 5000, endTime: 10000, text: 'Starts at 5s' },
      { id: '1', startTime: 10000, endTime: 15000, text: 'Starts at 10s' },
    ];
    expect(getActiveLineIndexFast(linesWithIntroGap, 2000, 1)).toBe(-1);
  });

  it('matches exactly with findActiveLyricLine binary search across all timestamps', () => {
    const testTimestamps = [
      0, 1000, 3999, 4000, 4001, 7999, 8000, 11999, 12000, 15000, 17999, 18000, 24999, 25000, 34999, 35000, 50000
    ];

    for (const time of testTimestamps) {
      const binaryResult = findActiveLyricLine(mockLines, time);
      const fastResult = getActiveLineIndexFast(mockLines, time, -1);
      expect(fastResult).toBe(binaryResult);
    }
  });
});

describe('Direct DOM Intra-Line Karaoke Word Reveal (Zero React Rerenders)', () => {
  it('updates classes and linear gradient on active word without creating extra nodes', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="active-line">
        <span class="lyric-word lyric-word-upcoming" data-start-time="8000" data-end-time="9000">Third</span>
        <span class="lyric-word lyric-word-upcoming" data-start-time="9000" data-end-time="10000">line</span>
        <span class="lyric-word lyric-word-upcoming" data-start-time="10000" data-end-time="12000">builds</span>
      </div>
    `;

    const lineEl = container.firstElementChild as HTMLElement;

    // At 8500ms: word 0 ("Third") is midway (50% progress), words 1 & 2 are upcoming
    updateActiveLineKaraokeDom(lineEl, 8500, false);

    const words = lineEl.querySelectorAll<HTMLElement>('.lyric-word');
    expect(words[0].classList.contains('lyric-word-active')).toBe(true);
    expect(words[0].style.backgroundImage).toContain('linear-gradient(to right');
    expect(words[0].style.getPropertyValue('--karaoke-progress')).toBe('50.0%');

    expect(words[1].classList.contains('lyric-word-upcoming')).toBe(true);
    expect(words[2].classList.contains('lyric-word-upcoming')).toBe(true);

    // At 9500ms: word 0 is sung (100%), word 1 is active (50%), word 2 is upcoming
    updateActiveLineKaraokeDom(lineEl, 9500, false);

    expect(words[0].classList.contains('lyric-word-sung')).toBe(true);
    expect(words[0].classList.contains('lyric-word-active')).toBe(false);

    expect(words[1].classList.contains('lyric-word-active')).toBe(true);
    expect(words[1].style.backgroundImage).toContain('linear-gradient(to right');
    expect(words[1].style.getPropertyValue('--karaoke-progress')).toBe('50.0%');

    expect(words[2].classList.contains('lyric-word-upcoming')).toBe(true);

    // At 12500ms: all words in line are sung
    updateActiveLineKaraokeDom(lineEl, 12500, false);

    expect(words[0].classList.contains('lyric-word-sung')).toBe(true);
    expect(words[1].classList.contains('lyric-word-sung')).toBe(true);
    expect(words[2].classList.contains('lyric-word-sung')).toBe(true);
  });

  it('sweeps linear gradient right-to-left for RTL Urdu/Arabic scripts without breaking text', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="active-line" dir="rtl">
        <span class="lyric-word lyric-word-upcoming" data-start-time="18000" data-end-time="20000">تم</span>
        <span class="lyric-word lyric-word-upcoming" data-start-time="20000" data-end-time="22000">کیا</span>
      </div>
    `;

    const lineEl = container.firstElementChild as HTMLElement;

    // At 19000ms: first Urdu word is 50% active
    updateActiveLineKaraokeDom(lineEl, 19000, true);

    const words = lineEl.querySelectorAll<HTMLElement>('.lyric-word');
    expect(words[0].classList.contains('lyric-word-active')).toBe(true);
    // RTL sweep: 'to left'
    expect(words[0].style.backgroundImage).toContain('linear-gradient(to left');
    expect(words[0].style.getPropertyValue('--karaoke-progress')).toBe('50.0%');
    expect(words[1].classList.contains('lyric-word-upcoming')).toBe(true);
  });

  it('snaps immediately on backwards seek without residual gradient artifacts', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="active-line">
        <span class="lyric-word lyric-word-sung" data-start-time="8000" data-end-time="9000">Third</span>
        <span class="lyric-word lyric-word-sung" data-start-time="9000" data-end-time="10000">line</span>
        <span class="lyric-word lyric-word-sung" data-start-time="10000" data-end-time="12000">builds</span>
      </div>
    `;

    const lineEl = container.firstElementChild as HTMLElement;

    // User rewinds to 7000ms (before line starts)
    updateActiveLineKaraokeDom(lineEl, 7000, false);

    const words = lineEl.querySelectorAll<HTMLElement>('.lyric-word');
    expect(words[0].classList.contains('lyric-word-upcoming')).toBe(true);
    expect(words[1].classList.contains('lyric-word-upcoming')).toBe(true);
    expect(words[2].classList.contains('lyric-word-upcoming')).toBe(true);
  });
});
