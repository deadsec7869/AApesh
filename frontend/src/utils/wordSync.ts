import { LyricLine, LyricWord, CharacterTiming, LyricTimingLevel } from '@/types/music';

/**
 * Checks if a string contains CJK ideographs, kana, Thai, Lao, Myanmar, or Khmer scripts.
 */
export const UNSPACED_SCRIPT_REGEX =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u0e00-\u0e7f\u0e80-\u0eff\u1000-\u109f\u1780-\u17ff]/;

export function isUnspacedScript(text: string): boolean {
  return UNSPACED_SCRIPT_REGEX.test(text);
}

/**
 * Unicode-aware grapheme cluster segmentation.
 * Prevents breaking Arabic joining, Devanagari conjuncts, emoji sequences, and combined accents.
 */
export function getGraphemeClusters(text: string): string[] {
  if (!text) return [];

  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
      const segments = Array.from(segmenter.segment(text) as Iterable<{ segment: string }>);
      const clusters = segments.map((s) => s.segment);
      if (clusters.length > 0) return clusters;
    } catch {}
  }

  return Array.from(text);
}

/**
 * Tokenizes line text into words/syllables, respecting both spaced languages
 * and unspaced CJK/Thai/Lao/Myanmar/Khmer scripts without breaking graphemes.
 */
export function tokenizeLyricLine(text: string): string[] {
  const cleaned = text.replace(/<[^>]+>/g, '').trim();
  if (!cleaned) return [];

  // If text contains whitespace, split by words
  if (/\s+/.test(cleaned)) {
    return cleaned.split(/\s+/).filter(Boolean);
  }

  // If text is CJK or unspaced Southeast Asian script, segment into words or graphemes
  if (UNSPACED_SCRIPT_REGEX.test(cleaned)) {
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
      try {
        const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'word' });
        const segments = Array.from(segmenter.segment(cleaned) as Iterable<{ segment: string }>);
        const tokens = segments.map((s) => s.segment).filter((s) => s.trim().length > 0);
        if (tokens.length > 0) return tokens;
      } catch {}
    }
    return getGraphemeClusters(cleaned);
  }

  return [cleaned];
}

/**
 * Parses inline Enhanced LRC tags like `<00:12.34>Take <00:12.71>me <00:12.93>home`.
 */
export function parseEnhancedLrcLine(
  rawLineText: string,
  lineStart: number,
  lineEnd: number
): { cleanText: string; words: LyricWord[]; hasExactTiming: boolean } {
  if (!rawLineText) {
    return { cleanText: '', words: [], hasExactTiming: false };
  }

  const inlineTsPattern = /<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>/g;
  const matches: { index: number; startMs: number; matchLength: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = inlineTsPattern.exec(rawLineText)) !== null) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const fracStr = match[3];
    let fracMs = 0;
    if (fracStr) {
      if (fracStr.length === 2) {
        fracMs = parseInt(fracStr, 10) * 10;
      } else if (fracStr.length === 3) {
        fracMs = parseInt(fracStr, 10);
      } else {
        fracMs = parseInt(fracStr.slice(0, 3), 10);
      }
    }
    matches.push({
      index: match.index,
      startMs: (minutes * 60 + seconds) * 1000 + fracMs,
      matchLength: match[0].length,
    });
  }

  if (matches.length > 0) {
    const words: LyricWord[] = [];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const startPos = m.index + m.matchLength;
      const endPos = i + 1 < matches.length ? matches[i + 1].index : rawLineText.length;
      const chunk = rawLineText.slice(startPos, endPos).trim();

      const nextStartMs = i + 1 < matches.length ? matches[i + 1].startMs : lineEnd;
      const wEnd = Math.max(m.startMs + 80, nextStartMs);

      if (chunk) {
        words.push({
          text: chunk,
          startTime: m.startMs,
          endTime: wEnd,
          isEstimated: false,
          characters: computeWordCharacters(chunk, m.startMs, wEnd, true),
        });
      }
    }

    const cleanText = rawLineText.replace(inlineTsPattern, '').replace(/\s+/g, ' ').trim();
    if (words.length > 0) {
      return { cleanText, words, hasExactTiming: true };
    }
  }

  return { cleanText: rawLineText.trim(), words: [], hasExactTiming: false };
}

/**
 * Computes grapheme-level character timing interpolated within the word's time bounds.
 * Note: When characters are interpolated from word boundaries, they are marked with estimated: true.
 */
export function computeWordCharacters(
  wordText: string,
  startTime: number,
  endTime: number,
  isEstimated = true
): CharacterTiming[] {
  const clusters = getGraphemeClusters(wordText);
  if (clusters.length === 0) return [];

  const duration = Math.max(50, endTime - startTime);
  const charDuration = duration / clusters.length;

  return clusters.map((char, idx) => {
    const cStart = Math.round(startTime + idx * charDuration);
    const cEnd = Math.round(startTime + (idx + 1) * charDuration);
    return {
      character: char,
      startTime: cStart,
      endTime: Math.max(cStart + 10, cEnd),
      estimated: isEstimated,
    };
  });
}

/**
 * Obtains or generates word-level timing data for a lyric line.
 * If the backend already provided exact `line.words` or enhanced LRC tags, uses them directly.
 * Otherwise, calculates proportional phonetic distribution so word-to-word
 * sync is available across all synced songs, marked explicitly as estimated.
 */
export function getLineWords(line: LyricLine, nextLineStartTime?: number): LyricWord[] {
  const lineStart = Math.max(0, line.startTime ?? 0);
  const lineEnd = Math.max(
    lineStart + 100,
    line.endTime !== undefined
      ? line.endTime
      : nextLineStartTime !== undefined
      ? Math.max(lineStart + 100, nextLineStartTime)
      : lineStart + 3500
  );

  // If explicit words already exist
  if (line.words && line.words.length > 0) {
    return line.words.map((w) => {
      const wStart = Math.max(0, w.startTime);
      const wEnd = Math.max(wStart + 50, w.endTime !== undefined ? w.endTime : wStart + 350);
      const isEst = w.isEstimated ?? false;
      return {
        ...w,
        startTime: wStart,
        endTime: wEnd,
        isEstimated: isEst,
        characters: w.characters && w.characters.length > 0
          ? w.characters
          : computeWordCharacters(w.text, wStart, wEnd, true),
      };
    });
  }

  const rawText = (line.text || '').trim();
  if (!rawText) return [];

  // Check if line text contains inline Enhanced LRC timestamps
  if (/<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>/.test(rawText)) {
    const enhanced = parseEnhancedLrcLine(rawText, lineStart, lineEnd);
    if (enhanced.words.length > 0) {
      return enhanced.words;
    }
  }

  const totalDuration = Math.max(300, lineEnd - lineStart);
  const tokens = tokenizeLyricLine(rawText);
  if (tokens.length === 0) {
    return [
      {
        text: rawText,
        startTime: lineStart,
        endTime: lineEnd,
        isEstimated: true,
        characters: computeWordCharacters(rawText, lineStart, lineEnd, true),
      },
    ];
  }

  // Calculate phonetic weights (length + punctuation bonus)
  const weights = tokens.map((w) => {
    let weight = Math.max(1, getGraphemeClusters(w).length);
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
    const finalEnd = Math.max(currentStart + 80, wordEnd);

    words.push({
      text: tokens[i],
      startTime: currentStart,
      endTime: finalEnd,
      isEstimated: true,
      characters: computeWordCharacters(tokens[i], currentStart, finalEnd, true),
    });

    currentStart = wordEnd;
  }

  return words;
}

/**
 * Determines the timing accuracy level for a lyric line.
 */
export function determineLineTimingLevel(line: LyricLine, nextLineStartTime?: number): LyricTimingLevel {
  if (line.timingLevel) return line.timingLevel;
  if (!line.startTime && line.startTime !== 0) return 'none';

  const words = getLineWords(line, nextLineStartTime);
  if (words.length > 0) {
    const hasCharTiming = words.some(
      (w) => w.characters && w.characters.length > 0 && !w.characters[0].estimated
    );
    if (hasCharTiming) return 'character';

    const hasExactWords = words.some((w) => w.isEstimated === false);
    if (hasExactWords) return 'word';

    return 'estimated-word';
  }

  return 'line';
}

/**
 * Determines overall lyrics timing level across all lines.
 */
export function determineLyricsTimingLevel(lines: LyricLine[]): LyricTimingLevel {
  if (!lines || lines.length === 0) return 'none';

  let hasCharacter = false;
  let hasExactWord = false;
  let hasEstimatedWord = false;
  let hasLine = false;

  for (let i = 0; i < lines.length; i++) {
    const level = determineLineTimingLevel(lines[i], lines[i + 1]?.startTime);
    if (level === 'character') hasCharacter = true;
    else if (level === 'word') hasExactWord = true;
    else if (level === 'estimated-word') hasEstimatedWord = true;
    else if (level === 'line') hasLine = true;
  }

  if (hasCharacter) return 'character';
  if (hasExactWord) return 'word';
  if (hasEstimatedWord) return 'estimated-word';
  if (hasLine) return 'line';
  return 'none';
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

/**
 * Computes intra-word character progression details for the HUD and visual breakdown.
 */
export function getCharacterProgress(
  word: LyricWord,
  currentTimeMs: number
): {
  activeCharIndex: number;
  highlightedCount: number;
  totalChars: number;
  progress: number;
} {
  const clusters = getGraphemeClusters(word.text);
  const totalChars = clusters.length;
  if (totalChars === 0) {
    return { activeCharIndex: 0, highlightedCount: 0, totalChars: 0, progress: 0 };
  }

  const progress = getWordProgress(word, currentTimeMs);
  const highlightedCount = Math.floor(progress * totalChars);
  const activeCharIndex = Math.min(totalChars - 1, highlightedCount);

  return {
    activeCharIndex,
    highlightedCount,
    totalChars,
    progress,
  };
}
