import React from 'react';
import { LyricWord } from '@/types/music';
import { getWordStatus, getWordProgress, isUnspacedScript } from '@/utils/wordSync';

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
    const isUnspaced = isUnspacedScript(word.text);
    const shouldHaveSpacing = !isLastWord && !isUnspaced;

    const sizeSpacing =
      size === 'lg' ? 'me-2 sm:me-3' : size === 'sm' ? 'me-1' : 'me-1.5 sm:me-2';

    const baseClasses = `lyric-word inline-block cursor-pointer select-text ${
      shouldHaveSpacing ? sizeSpacing : ''
    }`;

    // Upcoming word: muted white/gray (single text geometry)
    if (status === 'upcoming') {
      return (
        <span
          onClick={onClick}
          title={
            word.startTime !== undefined
              ? `Jump to ${Math.floor(word.startTime / 1000)}s`
              : undefined
          }
          className={`${baseClasses} lyric-word-upcoming text-white/40 transition-colors duration-150 hover:text-white/70`}
        >
          {word.text}
        </span>
      );
    }

    // Sung word: fully illuminated bright white (single text geometry)
    if (status === 'sung') {
      return (
        <span
          onClick={onClick}
          title={
            word.startTime !== undefined
              ? `Jump to ${Math.floor(word.startTime / 1000)}s`
              : undefined
          }
          className={`${baseClasses} lyric-word-sung text-white`}
        >
          {word.text}
        </span>
      );
    }

    // Active word: single canonical text geometry with direction-aware linear gradient fill
    // Zero duplicate text layers, zero font-weight mismatch, zero subpixel blur
    const progress = getWordProgress(word, currentTimeMs);
    const progressPct = Math.max(0, Math.min(100, progress * 100)).toFixed(1);

    // RTL sweeps right-to-left ('to left'), LTR sweeps left-to-right ('to right')
    const bgGradient = isRtl
      ? `linear-gradient(to left, #ffffff ${progressPct}%, rgba(255, 255, 255, 0.40) ${progressPct}%)`
      : `linear-gradient(to right, #ffffff ${progressPct}%, rgba(255, 255, 255, 0.40) ${progressPct}%)`;

    return (
      <span
        onClick={onClick}
        title={
          word.startTime !== undefined
            ? `Jump to ${Math.floor(word.startTime / 1000)}s`
            : undefined
        }
        className={`${baseClasses} lyric-word-active`}
        style={{
          backgroundImage: bgGradient,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }}
      >
        {word.text}
      </span>
    );
  }
);

KaraokeWord.displayName = 'KaraokeWord';
