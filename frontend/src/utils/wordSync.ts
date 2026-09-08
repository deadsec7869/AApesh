import { LyricLine, LyricWord } from '@/types/music';

/**
 * Checks if a string contains CJK ideographs or kana without typical space separators.
 */
const CJK_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

/**
 * Tokenizes line text into words/syllables, respecting both spaced languages
 * and unspaced CJK scripts.
 */
export function tokenizeLyricLine(text: string): string[] {
  const cleaned = text.replace(/<[^>]+>/g, '').trim();
  if (!cleaned) return [];

  // If text contains whitespace, split by words
  if (/\s+/.test(cleaned)) {
    return cleaned.split(/\s+/).filter(Boolean);
  }

  // If text is CJK without spaces, segment into words or characters
  if (CJK_REGEX.test(cleaned)) {
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
      try {
        const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'word' });
        const segments = Array.from(segmenter.segment(cleaned) as Iterable<{ segment: string }>);
        const tokens = segments.map((s) => s.segment).filter((s) => s.trim().length > 0);
        if (tokens.length > 0) return tokens;
      } catch {}
    }
    return Array.from(cleaned);
  }

  return [cleaned];
}

/**
 * Obtains or generates word-level timing data for a lyric line.
 * If the backend already provided `line.words`, uses them directly.
 * Otherwise, calculates proportional phonetic distribution so word-to-word
 * sync is 100% available across all synced songs.
 */
export function getLineWords(line: LyricLine, nextLineStartTime?: number): LyricWord[] {
  if (line.words && line.words.length > 0) {
    return line.words;
  }

  const rawText = (line.text || '').trim();
  if (!rawText) return [];

  const lineStart = line.startTime ?? 0;
  const lineEnd = line.endTime ?? (nextLineStartTime !== undefined ? nextLineStartTime : lineStart + 3500);
  const totalDuration = Math.max(300, lineEnd - lineStart);

  const tokens = tokenizeLyricLine(rawText);
  if (tokens.length === 0) {
    return [{ text: rawText, startTime: lineStart, endTime: lineEnd }];
  }

  // Calculate phonetic weights (length + punctuation bonus)
  const weights = tokens.map((w) => {
    let weight = Math.max(1, w.length);
    if (/[,.!?;:—\-\u06D4\u060C\u0964]$/.test(w)) {
      weight += 2;
    }
    return weight;
  });

  const totalWeight = weights.reduce((acc, val) => acc + val, 0);
  const words: LyricWord[] = [];
  let currentStart = lineStart;

  for (let i = 0; i < tokens.length; i++) {
    const isLast = i === tokens.length - 1;
    const wordDur = Math.round((weights[i] / totalWeight) * totalDuration);
    const wordEnd = isLast ? lineEnd : currentStart + wordDur;

    words.push({
      text: tokens[i],
      startTime: currentStart,
      endTime: Math.max(currentStart + 80, wordEnd),
    });

    currentStart = wordEnd;
  }

  return words;
}

/**
 * Returns the status of an individual lyric word at the given playback time.
 */
export function getWordStatus(
  word: LyricWord,
  currentTimeMs: number
): 'sung' | 'active' | 'upcoming' {
  if (currentTimeMs < word.startTime) {
    return 'upcoming';
  }

  const endTime = word.endTime !== undefined ? word.endTime : word.startTime + 350;
  if (currentTimeMs >= endTime) {
    return 'sung';
  }

  return 'active';
}

/**
 * Returns progress (0.0 to 1.0) of word singing for continuous fill effects.
 */
export function getWordProgress(word: LyricWord, currentTimeMs: number): number {
  if (currentTimeMs <= word.startTime) return 0;
  const endTime = word.endTime !== undefined ? word.endTime : word.startTime + 350;
  if (currentTimeMs >= endTime) return 1;
  const duration = Math.max(1, endTime - word.startTime);
  return Math.min(1, Math.max(0, (currentTimeMs - word.startTime) / duration));
}
