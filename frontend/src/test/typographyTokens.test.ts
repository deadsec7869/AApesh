import { describe, it, expect } from 'vitest';
// @ts-ignore
import tailwindConfig from '../../tailwind.config.js';

describe('SF Pro & iOS Typography System Configuration', () => {
  it('defines Apple-first system font stack in Tailwind fontFamily.sans', () => {
    const sansStack = tailwindConfig.theme?.extend?.fontFamily?.sans;
    expect(sansStack).toBeDefined();
    expect(sansStack[0]).toBe('-apple-system');
    expect(sansStack[1]).toBe('BlinkMacSystemFont');
    expect(sansStack).toContain('"SF Pro Text"');
    expect(sansStack).toContain('"SF Pro Display"');
    expect(sansStack).toContain('"Noto Sans"');
    expect(sansStack).toContain('sans-serif');
  });

  it('defines monospace stack for tabular numeric durations and timestamps', () => {
    const monoStack = tailwindConfig.theme?.extend?.fontFamily?.mono;
    expect(monoStack).toBeDefined();
    expect(monoStack[0]).toBe('ui-monospace');
    expect(monoStack[1]).toBe('SFMono-Regular');
    expect(monoStack).toContain('monospace');
  });

  it('defines iOS typographic scale tokens with exact line-height and letter-spacing pairs', () => {
    const fontSizes = tailwindConfig.theme?.extend?.fontSize;
    expect(fontSizes).toBeDefined();

    // Large Title: 34px, line-height 41px, tracking -0.025em
    expect(fontSizes['large-title'][0]).toBe('34px');
    expect(fontSizes['large-title'][1].lineHeight).toBe('41px');
    expect(fontSizes['large-title'][1].letterSpacing).toBe('-0.025em');

    // Title 1: 28px, line-height 34px, tracking -0.02em
    expect(fontSizes['title-1'][0]).toBe('28px');
    expect(fontSizes['title-1'][1].lineHeight).toBe('34px');

    // Title 2: 22px
    expect(fontSizes['title-2'][0]).toBe('22px');

    // Title 3: 20px
    expect(fontSizes['title-3'][0]).toBe('20px');

    // Headline: 17px
    expect(fontSizes['headline'][0]).toBe('17px');

    // Body: 16px
    expect(fontSizes['body'][0]).toBe('16px');

    // Callout: 15px
    expect(fontSizes['callout'][0]).toBe('15px');

    // Subheadline: 14px
    expect(fontSizes['subheadline'][0]).toBe('14px');

    // Footnote: 13px
    expect(fontSizes['footnote'][0]).toBe('13px');

    // Caption 1: 12px
    expect(fontSizes['caption-1'][0]).toBe('12px');

    // Caption 2: 11px
    expect(fontSizes['caption-2'][0]).toBe('11px');
  });

  it('preserves script-specific fallback families in tailwind configuration', () => {
    const families = tailwindConfig.theme?.extend?.fontFamily;
    expect(families.urdu).toBeDefined();
    expect(families.arabic).toBeDefined();
    expect(families.devanagari).toBeDefined();
    expect(families.bengali).toBeDefined();
    expect(families.gurmukhi).toBeDefined();
    expect(families.tamil).toBeDefined();
    expect(families.telugu).toBeDefined();
    expect(families.kannada).toBeDefined();
    expect(families.malayalam).toBeDefined();
    expect(families.japanese).toBeDefined();
    expect(families.korean).toBeDefined();
    expect(families.cjk).toBeDefined();
  });
});
