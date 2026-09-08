import React from 'react';
import { LyricLine } from '@/types/music';
import { KaraokeLyricLine } from './KaraokeLyricLine';

export interface SyncedLineWordsProps {
  line: LyricLine;
  nextLineStartTime?: number;
  currentTimeMs: number;
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg';
  dir?: 'ltr' | 'rtl' | 'auto';
  translationMode?: 'original' | 'dual' | 'translation';
  onSeekToWord?: (seconds: number) => void;
}

export const SyncedLineWords: React.FC<SyncedLineWordsProps> = (props) => {
  return <KaraokeLyricLine {...props} />;
};

SyncedLineWords.displayName = 'SyncedLineWords';
