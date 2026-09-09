import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { findActiveLyricLine } from '../hooks/useSyncedLyrics';
import { LyricLine } from '../types/music';
import { SyncedLineWords } from '../components/player/SyncedLineWords';
import { KaraokeWord } from '../components/player/KaraokeWord';
import { KaraokeLyricLine } from '../components/player/KaraokeLyricLine';

const mockSyncedLines: LyricLine[] = [
  { id: '0', startTime: 10000, endTime: 15000, text: 'First line of the song', translation: 'Primera línea de la canción' },
  { id: '1', startTime: 15000, endTime: 22000, text: 'Second line continues', translation: 'Segunda línea continúa' },
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
    let active = findActiveLyricLine(mockSyncedLines, 12000);
    expect(active).toBe(0);

    active = findActiveLyricLine(mockSyncedLines, 32000);
    expect(active).toBe(3);
  });

  it('handles backward seeking correctly without stale indices', () => {
    let active = findActiveLyricLine(mockSyncedLines, 32000);
    expect(active).toBe(3);

    active = findActiveLyricLine(mockSyncedLines, 16000);
    expect(active).toBe(1);

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

describe('SyncedLineWords (Translation & Dual-Language Modes)', () => {
  it('renders original lyrics in original mode', () => {
    render(
      <SyncedLineWords
        line={mockSyncedLines[0]}
        currentTimeMs={12000}
        isActive={true}
        translationMode="original"
      />
    );
    expect(screen.getAllByText('First')[0]).toBeInTheDocument();
    expect(screen.queryByText('Primera línea de la canción')).not.toBeInTheDocument();
  });

  it('renders dual original and translation in dual mode', () => {
    render(
      <SyncedLineWords
        line={mockSyncedLines[0]}
        currentTimeMs={12000}
        isActive={true}
        translationMode="dual"
      />
    );
    expect(screen.getAllByText('First')[0]).toBeInTheDocument();
    expect(screen.getByText('Primera línea de la canción')).toBeInTheDocument();
  });

  it('renders translated text exclusively in translation mode', () => {
    render(
      <SyncedLineWords
        line={mockSyncedLines[0]}
        currentTimeMs={12000}
        isActive={true}
        translationMode="translation"
      />
    );
    expect(screen.getByText('Primera línea de la canción')).toBeInTheDocument();
    expect(screen.queryByText('First')).not.toBeInTheDocument();
  });
});

describe('KaraokeWord & Progressive Illumination', () => {
  const mockWord = { text: 'Tonight', startTime: 1000, endTime: 2000 };

  it('renders upcoming word with muted styling', () => {
    const { container } = render(
      <KaraokeWord word={mockWord} currentTimeMs={500} />
    );
    const span = container.querySelector('.lyric-word-upcoming');
    expect(span).toBeInTheDocument();
    expect(span?.textContent).toBe('Tonight');
  });

  it('renders sung word with bright illuminated styling', () => {
    const { container } = render(
      <KaraokeWord word={mockWord} currentTimeMs={2500} />
    );
    const span = container.querySelector('.lyric-word-sung');
    expect(span).toBeInTheDocument();
    expect(span?.textContent).toBe('Tonight');
  });

  it('renders active word with single canonical text geometry and LTR gradient fill', () => {
    const { container } = render(
      <KaraokeWord word={mockWord} currentTimeMs={1500} dir="ltr" />
    );
    const activeSpan = container.querySelector('.lyric-word-active') as HTMLElement;
    expect(activeSpan).toBeInTheDocument();
    expect(activeSpan?.textContent).toBe('Tonight');

    // Exactly one text element, zero duplicate overlay spans
    expect(activeSpan.querySelectorAll('span').length).toBe(0);
    expect(activeSpan.style.backgroundImage).toContain('linear-gradient(to right');
  });

  it('sets right-to-left linear gradient sweep for RTL active words without breaking geometry', () => {
    const { container } = render(
      <KaraokeWord word={mockWord} currentTimeMs={1500} dir="rtl" />
    );
    const activeSpan = container.querySelector('.lyric-word-active') as HTMLElement;
    expect(activeSpan).toBeInTheDocument();
    expect(activeSpan?.textContent).toBe('Tonight');

    // Exactly one text element, zero duplicate overlay spans
    expect(activeSpan.querySelectorAll('span').length).toBe(0);
    expect(activeSpan.style.backgroundImage).toContain('linear-gradient(to left');
  });

  it('supports click-to-seek', () => {
    const seekSpy = vi.fn();
    render(
      <KaraokeLyricLine
        line={{
          id: 'test',
          text: 'One Two Three',
          startTime: 1000,
          endTime: 4000,
          words: [
            { text: 'One', startTime: 1000, endTime: 2000 },
            { text: 'Two', startTime: 2000, endTime: 3000 },
            { text: 'Three', startTime: 3000, endTime: 4000 },
          ],
        }}
        currentTimeMs={2500}
        isActive={true}
        onSeekToWord={seekSpy}
      />
    );

    const twoWord = screen.getByTitle('Jump to 2s');
    fireEvent.click(twoWord);
    expect(seekSpy).toHaveBeenCalledWith(2);
  });
});
