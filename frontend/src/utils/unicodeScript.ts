/**
 * Unicode-aware script and text direction analyzer for multilingual lyrics in AAPESH.
 */

export type ScriptFamily =
  | 'latin'
  | 'arabic'
  | 'urdu'
  | 'devanagari'
  | 'bengali'
  | 'gurmukhi'
  | 'gujarati'
  | 'tamil'
  | 'telugu'
  | 'kannada'
  | 'malayalam'
  | 'japanese'
  | 'korean'
  | 'cjk'
  | 'hebrew'
  | 'cyrillic'
  | 'thai'
  | 'unknown';

export type TextDirection = 'ltr' | 'rtl';

interface ScriptRange {
  name: ScriptFamily;
  start: number;
  end: number;
}

const SCRIPT_RANGES: ScriptRange[] = [
  // Arabic / Urdu / Persian / Shahmukhi
  { name: 'arabic', start: 0x0600, end: 0x06ff },
  { name: 'arabic', start: 0x0750, end: 0x077f },
  { name: 'arabic', start: 0x08a0, end: 0x08ff },
  { name: 'arabic', start: 0xfb50, end: 0xfdff },
  { name: 'arabic', start: 0xfe70, end: 0xfeff },

  // Hebrew / Yiddish
  { name: 'hebrew', start: 0x0590, end: 0x05ff },

  // Indic Scripts
  { name: 'devanagari', start: 0x0900, end: 0x097f }, // Hindi, Marathi, Sanskrit, Nepali
  { name: 'devanagari', start: 0xa8e0, end: 0xa8ff },
  { name: 'bengali', start: 0x0980, end: 0x09ff }, // Bengali, Assamese
  { name: 'gurmukhi', start: 0x0a00, end: 0x0a7f }, // Punjabi (Gurmukhi)
  { name: 'gujarati', start: 0x0a80, end: 0x0aff }, // Gujarati
  { name: 'tamil', start: 0x0b80, end: 0x0bff }, // Tamil
  { name: 'telugu', start: 0x0c00, end: 0x0c7f }, // Telugu
  { name: 'kannada', start: 0x0c80, end: 0x0cff }, // Kannada
  { name: 'malayalam', start: 0x0d00, end: 0x0d7f }, // Malayalam

  // Thai
  { name: 'thai', start: 0x0e00, end: 0x0e7f },

  // East Asian Scripts
  { name: 'korean', start: 0xac00, end: 0xd7af }, // Hangul Syllables
  { name: 'korean', start: 0x1100, end: 0x11ff }, // Hangul Jamo
  { name: 'korean', start: 0x3130, end: 0x318f },
  { name: 'japanese', start: 0x3040, end: 0x309f }, // Hiragana
  { name: 'japanese', start: 0x30a0, end: 0x30ff }, // Katakana
  { name: 'cjk', start: 0x4e00, end: 0x9fff }, // CJK Unified Ideographs
  { name: 'cjk', start: 0x3400, end: 0x4dbf },

  // Cyrillic
  { name: 'cyrillic', start: 0x0400, end: 0x04ff },
  { name: 'cyrillic', start: 0x0500, end: 0x052f },

  // Latin
  { name: 'latin', start: 0x0041, end: 0x005a },
  { name: 'latin', start: 0x0061, end: 0x007a },
  { name: 'latin', start: 0x00c0, end: 0x00ff }, // Latin-1 Supp (European diacritics)
  { name: 'latin', start: 0x0100, end: 0x017f }, // Latin Ext-A
  { name: 'latin', start: 0x0180, end: 0x024f }, // Latin Ext-B
];

const RTL_SCRIPT_SET = new Set<ScriptFamily>(['arabic', 'urdu', 'hebrew']);

// Specific Urdu letters to distinguish from general Arabic
const URDU_SPECIFIC_CHARS = new Set('ٹڈڑںہھےۓۃٿٽٺٻڄڅڈډڑږښکڳگڻںھہۂۃیے');

/**
 * Returns the script family of a single character code point.
 */
export function getCharScript(char: string): ScriptFamily | null {
  const code = char.codePointAt(0);
  if (!code) return null;

  for (const range of SCRIPT_RANGES) {
    if (code >= range.start && code <= range.end) {
      return range.name;
    }
  }
  return null;
}

export interface ScriptAnalysis {
  primaryScript: ScriptFamily;
  direction: TextDirection;
  isRtl: boolean;
  hasMixedScripts: boolean;
  fontClass: string;
}

/**
 * Analyzes a text string to determine its primary script, writing direction, and CSS font class.
 */
export function analyzeTextScriptAndDirection(text: string): ScriptAnalysis {
  if (!text || !text.trim()) {
    return {
      primaryScript: 'latin',
      direction: 'ltr',
      isRtl: false,
      hasMixedScripts: false,
      fontClass: 'font-sans',
    };
  }

  const counts: Partial<Record<ScriptFamily, number>> = {};
  let rtlCount = 0;
  let ltrCount = 0;
  let hasUrduChars = false;

  for (const char of text) {
    const script = getCharScript(char);
    if (script) {
      counts[script] = (counts[script] || 0) + 1;
      if (RTL_SCRIPT_SET.has(script)) {
        rtlCount++;
        if (URDU_SPECIFIC_CHARS.has(char)) {
          hasUrduChars = true;
        }
      } else {
        ltrCount++;
      }
    }
  }

  const entries = Object.entries(counts) as [ScriptFamily, number][];
  if (entries.length === 0) {
    return {
      primaryScript: 'latin',
      direction: 'ltr',
      isRtl: false,
      hasMixedScripts: false,
      fontClass: 'font-sans',
    };
  }

  // Find most frequent script
  entries.sort((a, b) => b[1] - a[1]);
  let primaryScript = entries[0][0];

  if (primaryScript === 'arabic' && hasUrduChars) {
    primaryScript = 'urdu';
  }

  const isRtl = rtlCount > 0 && (rtlCount >= ltrCount || RTL_SCRIPT_SET.has(primaryScript));
  const direction: TextDirection = isRtl ? 'rtl' : 'ltr';
  const hasMixedScripts = entries.length > 1;

  // Determine appropriate font stack class
  let fontClass = 'font-sans';
  switch (primaryScript) {
    case 'urdu':
      fontClass = 'font-urdu';
      break;
    case 'arabic':
      fontClass = 'font-arabic';
      break;
    case 'devanagari':
      fontClass = 'font-devanagari';
      break;
    case 'bengali':
      fontClass = 'font-bengali';
      break;
    case 'gurmukhi':
      fontClass = 'font-gurmukhi';
      break;
    case 'gujarati':
      fontClass = 'font-gujarati';
      break;
    case 'tamil':
      fontClass = 'font-tamil';
      break;
    case 'telugu':
      fontClass = 'font-telugu';
      break;
    case 'kannada':
      fontClass = 'font-kannada';
      break;
    case 'malayalam':
      fontClass = 'font-malayalam';
      break;
    case 'japanese':
      fontClass = 'font-japanese';
      break;
    case 'korean':
      fontClass = 'font-korean';
      break;
    case 'cjk':
      fontClass = 'font-cjk';
      break;
    case 'thai':
      fontClass = 'font-thai';
      break;
    default:
      fontClass = 'font-sans';
      break;
  }

  return {
    primaryScript,
    direction,
    isRtl,
    hasMixedScripts,
    fontClass,
  };
}

/**
 * Gets line-level direction ('rtl' | 'ltr') for a given lyric line.
 */
export function getLineDirection(text: string, serverDirection?: string): TextDirection {
  if (serverDirection === 'rtl' || serverDirection === 'ltr') {
    return serverDirection;
  }
  return analyzeTextScriptAndDirection(text).direction;
}

/**
 * Gets font CSS class for a given lyric line.
 */
export function getLineFontClass(text: string, serverScript?: string): string {
  if (serverScript) {
    switch (serverScript.toLowerCase()) {
      case 'urdu':
        return 'font-urdu';
      case 'arabic':
        return 'font-arabic';
      case 'devanagari':
        return 'font-devanagari';
      case 'bengali':
        return 'font-bengali';
      case 'gurmukhi':
        return 'font-gurmukhi';
      case 'gujarati':
        return 'font-gujarati';
      case 'tamil':
        return 'font-tamil';
      case 'telugu':
        return 'font-telugu';
      case 'kannada':
        return 'font-kannada';
      case 'malayalam':
        return 'font-malayalam';
      case 'japanese':
        return 'font-japanese';
      case 'korean':
        return 'font-korean';
      case 'cjk':
        return 'font-cjk';
      case 'thai':
        return 'font-thai';
      default:
        break;
    }
  }
  return analyzeTextScriptAndDirection(text).fontClass;
}
