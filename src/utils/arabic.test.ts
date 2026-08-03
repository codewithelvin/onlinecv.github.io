import { describe, expect, it } from 'vitest';
import { ZWNJ, preshapeArabic, toArabicDigits } from './arabic';

/**
 * The pre-shaper picks a contextual form per letter (`utils/arabic` explains
 * why the exporter cannot do it). Two properties matter and neither is
 * eyeball-able in a language most reviewers of this repo do not read:
 *
 *  - the FORM is the one Arabic orthography calls for, and
 *  - nothing but the shape changes — NFKC of the output is the input again, so
 *    the letters are all still there, in order, and the PDF's text layer stays
 *    recoverable.
 */

/** The pre-shaped string with the zero-width non-joiners taken back out. */
const forms = (text: string): string[] => [...preshapeArabic(text).replace(/\u200C/g, '')];
const hex = (ch: string): string => ch.codePointAt(0)!.toString(16).toUpperCase();

describe('preshapeArabic', () => {
  /**
   * `مرحبا` = meem + reh + hah + beh + alef. Meem opens the word (initial); reh
   * only joins to its right, so it takes the final form AND leaves hah opening a
   * new run (initial); beh sits between two joiners (medial); alef closes it
   * (final). This is the word the exporter got wrong on every letter.
   */
  it('joins each letter according to its neighbours', () => {
    expect(forms('مرحبا').map(hex)).toEqual([
      'FEE3', // meem initial   (U+0645: FEE1 isol, FEE2 fina, FEE3 init, FEE4 medi)
      'FEAE', // reh final      (U+0631: FEAD isol, FEAE fina — right-joining)
      'FEA3', // hah initial    (U+062D: FEA1 isol, FEA2 fina, FEA3 init, FEA4 medi)
      'FE92', // beh medial     (U+0628: FE8F isol, FE90 fina, FE91 init, FE92 medi)
      'FE8E', // alef final     (U+0627: FE8D isol, FE8E fina — right-joining)
    ]);
  });

  /** A letter with no neighbours keeps its isolated form. */
  it('leaves a lone letter isolated', () => {
    expect(forms('م').map(hex)).toEqual(['FEE1']);
  });

  /** Lam + alef is one glyph in Arabic, never two letters side by side. */
  it('forms the mandatory lam-alef ligature', () => {
    expect(forms('لا').map(hex)).toEqual(['FEFB']);
    // After a joining letter it takes the ligature's final form instead.
    expect(forms('بلا').map(hex)).toEqual(['FE91', 'FEFC']);
  });

  /**
   * The non-joiner is surgical, and that is the whole point.
   *
   * The engine still runs OpenType layout over the pre-shaped line, and exactly
   * one rule misfires: `rlig` sees the reversed `ال` as the lam-alef pattern and
   * ligates it into `لا`. One non-joiner between that alef and that lam blocks
   * it. Nothing else needs one — a presentation form has no context left to lose.
   *
   * Putting one between EVERY pair (what this used to do) suppressed the same
   * ligature but wrecked the text layer: the shipped font maps U+200C to its
   * `space` glyph, so an extracted Arabic CV read "م ح م د" — a space between
   * every letter of every word. Measured per line: 8–21 stray space glyphs
   * against the 0 this produces, and no gain in width fidelity.
   */
  it('inserts a non-joiner only where the engine would invent a ligature', () => {
    // `السيرة` opens with the definite article: alef, then lam.
    const article = preshapeArabic('السيرة');
    expect([...article].filter((c) => c === ZWNJ)).toHaveLength(1);
    expect(article.indexOf(ZWNJ)).toBe(1);

    // No `ال` in any of these, so no non-joiner at all.
    for (const source of ['مرحبا', 'م م', 'محمد', 'بلا']) {
      expect(preshapeArabic(source), source).not.toContain(ZWNJ);
    }
  });

  /**
   * The stray-space regression, in the terms an ATS actually sees: nothing in
   * the output may be a space that was not a space in the input.
   */
  it('adds no spaces to the text', () => {
    const spaces = (text: string): number => [...text].filter((c) => c === ' ').length;
    for (const source of ['مرحبا', 'السيرة الذاتية', 'محمد العلي', 'إدارة المشاريع']) {
      expect(spaces(preshapeArabic(source)), source).toBe(spaces(source));
    }
  });

  /**
   * The text layer has to survive the round trip: presentation forms are
   * compatibility characters, so NFKC maps every one of them back to the plain
   * letter (and the lam-alef ligature back to two letters).
   */
  it('preserves the text under NFKC normalization', () => {
    for (const source of ['مرحبا', 'لا', 'السيرة الذاتية', 'محمد علي', 'إدارة المشاريع']) {
      const restored = preshapeArabic(source).replace(/\u200C/g, '').normalize('NFKC');
      expect(restored, `"${source}" did not round-trip`).toBe(source);
    }
  });

  /**
   * It runs over the whole rendered markup, so everything that is not an Arabic
   * letter — tags, attributes, URLs, and every other script — has to come back
   * byte-identical.
   */
  it('leaves non-Arabic text exactly as it was', () => {
    const markup = '<div data-keep-together="true"><span>Elvin Hüseynov</span> — ნიკოლოზ Жуков</div>';
    expect(preshapeArabic(markup)).toBe(markup);
    expect(preshapeArabic('')).toBe('');
  });

  /** Latin inside an Arabic line (an e-mail, a product name) is untouched. */
  it('shapes only the Arabic part of a mixed line', () => {
    const shaped = preshapeArabic('البريد: ali@example.com');
    expect(shaped).toContain('ali@example.com');
    expect(shaped.replace(/\u200C/g, '').normalize('NFKC')).toBe('البريد: ali@example.com');
  });
});

describe('toArabicDigits', () => {
  it('rewrites Western digits and nothing else', () => {
    expect(toArabicDigits('31.07.2026')).toBe('٣١.٠٧.٢٠٢٦');
    expect(toArabicDigits('A1 — C2')).toBe('A١ — C٢');
    expect(toArabicDigits('لا')).toBe('لا');
  });
});
