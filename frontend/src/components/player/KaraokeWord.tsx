import React from 'react';
import { LyricWord } from '@/types/music';
import { getWordStatus, getWordProgress } from '@/utils/wordSync';

export interface KaraokeWordProps {
  word: LyricWord;
  currentTimeMs: number;
  dir?: 'ltr' | 'rtl' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  isLastWord?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const KaraokeWord: React.FC<KaraokeWordProps> = React.memo(
  ({ word, currentTimeMs, dir = 'auto', size = 'md', isLastWord = false, onClick }) => {
    const status = getWordStatus(word, currentTimeMs);
    const isRtl = dir === 'rtl';

    const sizeSpacing =
      size === 'lg' ? 'me-2 sm:me-3' : size === 'sm' ? 'me-1' : 'me-1.5 sm:me-2';

    // Upcoming word: muted white/gray
    if (status === 'upcoming') {
      return (
        <span
          onClick={onClick}
          title={
            word.startTime !== undefined
              ? `Jump to ${Math.floor(word.startTime / 1000)}s`
              : undefined
          }
          className={`lyric-word lyric-word-upcoming inline-block cursor-pointer select-text text-white/40 font-medium transition-colors duration-150 hover:text-white/70 ${
            !isLastWord ? sizeSpacing : ''
          }`}
        >
          {word.text}
        </span>
      );
    }

    // Sung word: fully illuminated bright white
    if (status === 'sung') {
      return (
        <span
          onClick={onClick}
          title={
            word.startTime !== undefined
              ? `Jump to ${Math.floor(word.startTime / 1000)}s`
              : undefined
          }
          className={`lyric-word lyric-word-sung inline-block cursor-pointer select-text text-white font-extrabold ${
            !isLastWord ? sizeSpacing : ''
          }`}
        >
          {word.text}
        </span>
      );
    }

    // Active word: progressive letter-by-letter / continuous sweep illumination
    const progress = getWordProgress(word, currentTimeMs);
    const unrevealedPct = Math.max(0, Math.min(100, (1 - progress) * 100)).toFixed(2);

    // RTL sweeps right-to-left (inset left side), LTR sweeps left-to-right (inset right side)
    const clipPath = isRtl
      ? `inset(0 0 0 ${unrevealedPct}%)`
      : `inset(0 ${unrevealedPct}% 0 0)`;

    return (
      <span
        onClick={onClick}
        title={
          word.startTime !== undefined
            ? `Jump to ${Math.floor(word.startTime / 1000)}s`
            : undefined
        }
        className={`lyric-word lyric-word-active relative inline-block cursor-pointer select-text ${
          !isLastWord ? sizeSpacing : ''
        }`}
      >
        {/* Base Layer: Muted base text */}
        <span className="text-white/40 font-medium select-text">{word.text}</span>

        {/* Highlight Layer: Progressive bright white illumination */}
        <span
          aria-hidden="true"
          className="absolute inset-0 top-0 text-white font-extrabold select-none pointer-events-none"
          style={{
            clipPath,
            WebkitClipPath: clipPath,
            willChange: 'clip-path',
          }}
        >
          {word.text}
        </span>
      </span>
    );
  }
);

KaraokeWord.displayName = 'KaraokeWord';
