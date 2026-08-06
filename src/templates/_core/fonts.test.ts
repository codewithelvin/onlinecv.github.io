import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '../../app/i18n/locales';
import { FONT_FAMILY, uiFontFamily } from '../../app/theme';
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
    expect(cvFontStack('he')[0]).toBe('NotoSansHebrew');
    expect(cvFontStack('ko')[0]).toBe('NanumGothic');
    expect(cvFontStack('zh')[0]).toBe('NotoSansSC');
    expect(cvFontStack('ja')[0]).toBe('NotoSansJP');
  });

  /**
   * Japanese and Chinese are the pair that cannot be settled by ordering the
   * stack ONCE: both faces claim the whole CJK Unified block, so first-match-wins
   * hands every ideograph in the document to whichever leads — and 65.6% of the
   * ideographs the two fonts share are drawn differently (fontkit, 1,806 sampled).
   * A Japanese CV in NotoSansSC is legible and visibly Chinese-typeset.
   *
   * So this is a two-way assertion on purpose: each language's own face must beat
   * the other's, in the CV and in the chrome alike.
   */
  it('never lets one Han face answer for the other language', () => {
    expect(cvFontStack('ja').indexOf('NotoSansJP')).toBeLessThan(
      cvFontStack('ja').indexOf('NotoSansSC'),
    );
    expect(cvFontStack('zh').indexOf('NotoSansSC')).toBeLessThan(
      cvFontStack('zh').indexOf('NotoSansJP'),
    );
    const chrome = (locale: 'ja' | 'zh'): string[] =>
      uiFontFamily(locale)
        .split(',')
        .map((f) => f.trim());
    expect(chrome('ja').indexOf('NotoSansJP')).toBeLessThan(chrome('ja').indexOf('NotoSansSC'));
    expect(chrome('zh').indexOf('NotoSansSC')).toBeLessThan(chrome('zh').indexOf('NotoSansJP'));
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

  /**
   * The EDITOR has to be able to draw every script the CV can, and its stack is a
   * second copy of this one (`FONT_FAMILY` in `app/theme.ts`, which AntD's
   * `ConfigProvider` applies, plus the `body` rule in `index.css`).
   *
   * This caught a real drift: both copies stopped at `NotoSansGeorgian` and never
   * gained the Arabic or Hebrew faces, so those UIs were drawn by whatever the OS
   * happened to have. Windows hid it — Segoe UI covers both scripts — and Hangul
   * would have hidden it the same way, right up to the first machine with no
   * Korean font installed.
   *
   * The `index.css` half cannot be asserted (`css: false` under vitest makes
   * `?raw` return an empty string), so this guards the JS half and the CSS carries
   * a comment. Adding a face to `CV_FONT_STACK` now fails here until the editor
   * gets it too.
   */
  it('offers every CV face to the editor UI as well', () => {
    for (const family of CV_FONT_STACK) {
      expect(FONT_FAMILY, `${family} is missing from the UI font stack`).toContain(family);
    }
    // Inter still leads, so the chrome looks the same in every language.
    expect(FONT_FAMILY.startsWith('Inter,')).toBe(true);
  });

  /**
   * `NanumGothic` must stay AHEAD of `NotoSansSC` in the editor's stack, and this
   * is not a style preference — it is 333 KB against 8 MB.
   *
   * Both faces claim CJK punctuation (U+3000–303F: 。、《》「」) in `index.css`,
   * because both languages legitimately use it, so whichever is declared first
   * supplies those marks to the CHROME and gets downloaded for them. Declared this
   * way round, a Chinese page pulls the Korean woff2 for its 。 — mildly wasteful.
   * Reversed, a Korean page pulls 8 MB of Han for its 〜. The CV itself is immune
   * either way: `cvFontStack` puts the document's own face first.
   */
  it('keeps the cheaper East Asian face ahead of the 8 MB one in the UI stack', () => {
    const families = FONT_FAMILY.split(',').map((f) => f.trim());
    expect(families.indexOf('NanumGothic')).toBeLessThan(families.indexOf('NotoSansSC'));
    expect(families.indexOf('NanumGothic')).toBeGreaterThan(-1);
  });

  /**
   * `uiFontFamily` reorders the chrome the way `cvFontStack` reorders the
   * document, and everything else about it must stay put: the same families, and
   * Inter still first so the UI's own Latin letterforms do not change with the
   * language (the promoted CJK faces carry no `ə ğ ı İ ş` anyway).
   */
  it('keeps the UI stack a permutation with Inter still leading', () => {
    const base = FONT_FAMILY.split(',').map((f) => f.trim());
    for (const locale of SUPPORTED_LOCALES) {
      const stack = uiFontFamily(locale)
        .split(',')
        .map((f) => f.trim());
      expect([...stack].sort(), `${locale} changed the UI font set`).toEqual([...base].sort());
      expect(stack[0], `${locale} moved Inter out of the front`).toBe('Inter');
    }
  });
});
