import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '../../app/i18n/locales';
import { CV_FONT_STACK, cvFontFamily, cvFontStack } from './fonts';

/**
 * The order of the stack is a correctness property, not a preference.
 *
 * All three faces contain the characters every script shares — the space above
 * all, plus digits and punctuation — so whichever family is named first wins
 * them. With Inter pinned at the front, every space inside an Arabic line
 * resolved to Inter and `fontSubstitution` split the line at each change of
 * font: a measured Arabic line came out as eleven runs in two fonts instead of
 * five in one, and the runs either side of a space were emitted at the same x.
 * That is the "characters on top of each other" a user reported.
 */
describe('cvFontStack', () => {
  it.each(SUPPORTED_LOCALES)('is a permutation of the registered families for %s', (locale) => {
    const stack = cvFontStack(locale);
    // Nothing invented and nothing dropped: every family here must be registered
    // by `registerResumeFonts`, and a missing one exports as blank text.
    expect([...stack].sort()).toEqual([...CV_FONT_STACK].sort());
  });

  it('puts the script that needs its own face first', () => {
    expect(cvFontStack('ar')[0]).toBe('NotoSansArabic');
    expect(cvFontStack('ka')[0]).toBe('NotoSansGeorgian');
  });

  it('leaves Inter in front for the Latin and Cyrillic locales', () => {
    for (const locale of ['az', 'en', 'ru'] as const) {
      expect(cvFontStack(locale)[0]).toBe('Inter');
    }
  });

  it('keeps the other faces available for mixed-script text', () => {
    // A name in Latin inside an Arabic CV still has to find Inter.
    expect(cvFontStack('ar')).toContain('Inter');
    expect(cvFontStack('ka')).toContain('Inter');
  });

  it('renders as a CSS declaration for the preview', () => {
    expect(cvFontFamily('ar')).toBe(cvFontStack('ar').join(', '));
    expect(cvFontFamily('ar').startsWith('NotoSansArabic,')).toBe(true);
  });
});
