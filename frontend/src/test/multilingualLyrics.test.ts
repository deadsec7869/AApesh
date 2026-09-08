import { describe, it, expect } from 'vitest';
import {
  analyzeTextScriptAndDirection,
  getLineDirection,
  getLineFontClass,
  getCharScript,
} from '../utils/unicodeScript';
import { findActiveLyricLine } from '../hooks/useSyncedLyrics';
import { LyricLine } from '../types/music';

describe('Multilingual Unicode Script & Direction Analysis', () => {
  it('detects Latin English script as LTR with standard sans font', () => {
    const text = 'I want to live';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('latin');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.isRtl).toBe(false);
    expect(analysis.fontClass).toBe('font-sans');
  });

  it('detects Urdu script as RTL with font-urdu Nastaliq', () => {
    const text = 'تم کیا کر رہے ہو';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('urdu');
    expect(analysis.direction).toBe('rtl');
    expect(analysis.isRtl).toBe(true);
    expect(analysis.fontClass).toBe('font-urdu');
  });

  it('detects Hindi Devanagari script as LTR with font-devanagari', () => {
    const text = 'तुम क्या कर रहे हो';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('devanagari');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.isRtl).toBe(false);
    expect(analysis.fontClass).toBe('font-devanagari');
  });

  it('detects Punjabi Gurmukhi script as LTR with font-gurmukhi', () => {
    const text = 'ਤੁਸੀਂ ਕੀ ਕਰ ਰਹੇ ਹੋ';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('gurmukhi');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.fontClass).toBe('font-gurmukhi');
  });

  it('detects Bengali script as LTR with font-bengali', () => {
    const text = 'তুমি কী করছো';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('bengali');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.fontClass).toBe('font-bengali');
  });

  it('detects Arabic script as RTL with font-arabic', () => {
    const text = 'ماذا تفعل؟';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('arabic');
    expect(analysis.direction).toBe('rtl');
    expect(analysis.isRtl).toBe(true);
    expect(analysis.fontClass).toBe('font-arabic');
  });

  it('detects Tamil script as LTR with font-tamil', () => {
    const text = 'நீ என்ன செய்கிறாய்?';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('tamil');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.fontClass).toBe('font-tamil');
  });

  it('detects Telugu script as LTR with font-telugu', () => {
    const text = 'నువ్వు ఏమి చేస్తున్నావు?';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('telugu');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.fontClass).toBe('font-telugu');
  });

  it('detects Kannada script as LTR with font-kannada', () => {
    const text = 'ನೀನು ಏನು ಮಾಡುತ್ತಿದ್ದೀಯ?';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('kannada');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.fontClass).toBe('font-kannada');
  });

  it('detects Malayalam script as LTR with font-malayalam', () => {
    const text = 'നീ എന്താണ് ചെയ്യുന്നത്?';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('malayalam');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.fontClass).toBe('font-malayalam');
  });

  it('detects Japanese script as LTR with font-japanese', () => {
    const text = '何をしているの？';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('japanese');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.fontClass).toBe('font-japanese');
  });

  it('detects Korean script as LTR with font-korean', () => {
    const text = '무엇을 하고 있어?';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('korean');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.fontClass).toBe('font-korean');
  });

  it('detects Chinese CJK script as LTR with font-cjk', () => {
    const text = '你在做什么？';
    const analysis = analyzeTextScriptAndDirection(text);
    expect(analysis.primaryScript).toBe('cjk');
    expect(analysis.direction).toBe('ltr');
    expect(analysis.fontClass).toBe('font-cjk');
  });

  it('correctly classifies mixed RTL and LTR scripts without breaking', () => {
    const mixedUrdu = 'مجھے آج Summer of Love سننا ہے';
    const analysis = analyzeTextScriptAndDirection(mixedUrdu);
    expect(analysis.isRtl).toBe(true);
    expect(analysis.direction).toBe('rtl');
    expect(analysis.hasMixedScripts).toBe(true);
    expect(analysis.fontClass).toBe('font-urdu');

    const mixedHindi = 'मुझे आज Summer of Love सुनना है';
    const analysisHindi = analyzeTextScriptAndDirection(mixedHindi);
    expect(analysisHindi.isRtl).toBe(false);
    expect(analysisHindi.direction).toBe('ltr');
    expect(analysisHindi.hasMixedScripts).toBe(true);
    expect(analysisHindi.fontClass).toBe('font-devanagari');
  });
});

describe('Multilingual Synchronized Playback Synchronization', () => {
  const multilingualLyrics: LyricLine[] = [
    {
      id: '0',
      startTime: 10000,
      endTime: 15000,
      text: 'تم کیا کر رہے ہو', // Urdu (10s - 15s)
      direction: 'rtl',
      script: 'arabic',
    },
    {
      id: '1',
      startTime: 15000,
      endTime: 20000,
      text: 'What are you doing?', // English (15s - 20s)
      direction: 'ltr',
      script: 'latin',
    },
    {
      id: '2',
      startTime: 20000,
      endTime: 25000,
      text: 'तुम क्या कर रहे हो', // Hindi (20s - 25s)
      direction: 'ltr',
      script: 'devanagari',
    },
    {
      id: '3',
      startTime: 25000,
      endTime: 30000,
      text: 'তুমি কী করছো', // Bengali (25s - 30s)
      direction: 'ltr',
      script: 'bengali',
    },
  ];

  it('correctly tracks active line across multilingual lines based purely on timestamp', () => {
    // Before 10s: intro silence
    expect(findActiveLyricLine(multilingualLyrics, 5000)).toBe(-1);

    // At 10s: Urdu line active
    expect(findActiveLyricLine(multilingualLyrics, 10000)).toBe(0);
    expect(multilingualLyrics[0].text).toBe('تم کیا کر رہے ہو');
    expect(getLineDirection(multilingualLyrics[0].text, multilingualLyrics[0].direction)).toBe('rtl');

    // At 15s: English line active
    expect(findActiveLyricLine(multilingualLyrics, 15000)).toBe(1);
    expect(multilingualLyrics[1].text).toBe('What are you doing?');
    expect(getLineDirection(multilingualLyrics[1].text, multilingualLyrics[1].direction)).toBe('ltr');

    // At 20s: Hindi line active
    expect(findActiveLyricLine(multilingualLyrics, 20000)).toBe(2);
    expect(multilingualLyrics[2].text).toBe('तुम क्या कर रहे हो');
    expect(getLineDirection(multilingualLyrics[2].text, multilingualLyrics[2].direction)).toBe('ltr');

    // At 25s: Bengali line active
    expect(findActiveLyricLine(multilingualLyrics, 25000)).toBe(3);
    expect(multilingualLyrics[3].text).toBe('তুমি কী করছো');
    expect(getLineDirection(multilingualLyrics[3].text, multilingualLyrics[3].direction)).toBe('ltr');
  });
});
