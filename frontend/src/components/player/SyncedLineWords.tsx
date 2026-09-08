import React, { useMemo } from 'react';
import { LyricLine } from '@/types/music';
import { getLineWords, getWordStatus } from '@/utils/wordSync';

export interface SyncedLineWordsProps {
  line: LyricLine;
  nextLineStartTime?: number;
  currentTimeMs: number;
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg';
  dir?: 'ltr' | 'rtl' | 'auto';
  onSeekToWord?: (seconds: number) => void;
}

export const SyncedLineWords: React.FC<SyncedLineWordsProps> = React.memo(
  ({
    line,
    nextLineStartTime,
    currentTimeMs,
    isActive,
    size = 'md',
    dir = 'auto',
    onSeekToWord,
  }) => {
    const rawText = line.text || '♪';

    // When the line is not active, render plain text with zero overhead
    if (!isActive) {
      return <span className="select-text leading-relaxed">{rawText}</span>;
    }

    // Memoize the line's word tokens
    const words = useMemo(() => {
      return getLineWords(line, nextLineStartTime);
    }, [line, nextLineStartTime]);

    if (words.length === 0) {
      return <span className="select-text leading-relaxed">{rawText}</span>;
    }

    return (
      <span
        dir={dir}
        className="inline-flex flex-wrap items-baseline justify-center select-text leading-relaxed"
      >
        {words.map((word, idx) => {
          const status = getWordStatus(word, currentTimeMs);
          const isLastWord = idx === words.length - 1;

          let statusClass = 'lyric-word-upcoming';
          if (status === 'active') {
            statusClass = 'lyric-word-active';
          } else if (status === 'sung') {
            statusClass = 'lyric-word-sung';
          }

          const sizeSpacing =
            size === 'lg' ? 'me-2 sm:me-3' : size === 'sm' ? 'me-1' : 'me-1.5 sm:me-2';

          return (
            <span
              key={`${word.text}-${word.startTime}-${idx}`}
              onClick={(e) => {
                if (onSeekToWord && word.startTime !== undefined) {
                  e.stopPropagation();
                  onSeekToWord(word.startTime / 1000);
                }
              }}
              title={
                word.startTime !== undefined
                  ? `Jump to ${Math.floor(word.startTime / 1000)}s`
                  : undefined
              }
              className={`lyric-word ${statusClass} ${
                !isLastWord ? sizeSpacing : ''
              } cursor-pointer rounded-sm hover:brightness-125`}
            >
              {word.text}
            </span>
          );
        })}
      </span>
    );
  }
);

SyncedLineWords.displayName = 'SyncedLineWords';
