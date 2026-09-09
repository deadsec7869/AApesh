import React, { useMemo } from 'react';
import { LyricLine } from '@/types/music';
import { getLineWords } from '@/utils/wordSync';
import { KaraokeWord } from './KaraokeWord';

export interface KaraokeLyricLineProps {
  line: LyricLine;
  nextLineStartTime?: number;
  currentTimeMs: number;
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg';
  dir?: 'ltr' | 'rtl' | 'auto';
  translationMode?: 'original' | 'dual' | 'translation';
  onSeekToWord?: (seconds: number) => void;
}

export const KaraokeLyricLine: React.FC<KaraokeLyricLineProps> = React.memo(
  ({
    line,
    nextLineStartTime,
    currentTimeMs,
    isActive,
    size = 'md',
    dir = 'auto',
    translationMode = 'original',
    onSeekToWord,
  }) => {
    const rawText = line.text || '♪';
    const hasTranslation = Boolean(line.translation);
    const showTranslatedOnly = translationMode === 'translation' && hasTranslation;
    const showDual = translationMode === 'dual' && hasTranslation;

    // Compute normalized word tokens with hook at top level
    const words = useMemo(() => {
      if (!isActive) return [];
      return getLineWords(line, nextLineStartTime);
    }, [isActive, line, nextLineStartTime]);

    // Translation only mode
    if (showTranslatedOnly) {
      return (
        <span dir={dir} className="select-text leading-relaxed">
          {line.translation}
        </span>
      );
    }

    // Inactive line: render plain lightweight text with zero overhead
    if (!isActive) {
      return (
        <div className="flex flex-col">
          <span dir={dir} className="select-text leading-relaxed">
            {rawText}
          </span>
          {showDual && (
            <span dir="auto" className="lyric-translation">
              {line.translation}
            </span>
          )}
        </div>
      );
    }

    if (words.length === 0) {
      return (
        <div className="flex flex-col">
          <span dir={dir} className="select-text leading-relaxed">
            {rawText}
          </span>
          {showDual && (
            <span dir="auto" className="lyric-translation">
              {line.translation}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <span
          dir={dir}
          className="inline-flex flex-wrap items-baseline select-text leading-relaxed"
        >
          {words.map((word, idx) => {
            const isLastWord = idx === words.length - 1;

            return (
              <KaraokeWord
                key={`${word.text}-${word.startTime}-${idx}`}
                word={word}
                currentTimeMs={currentTimeMs}
                dir={dir}
                size={size}
                isLastWord={isLastWord}
                onClick={(e) => {
                  if (onSeekToWord && word.startTime !== undefined) {
                    e.stopPropagation();
                    onSeekToWord(word.startTime / 1000);
                  }
                }}
              />
            );
          })}
        </span>

        {showDual && (
          <span dir="auto" className="lyric-translation">
            {line.translation}
          </span>
        )}
      </div>
    );
  }
);

KaraokeLyricLine.displayName = 'KaraokeLyricLine';
