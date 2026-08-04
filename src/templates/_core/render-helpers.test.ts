import { describe, expect, it } from 'vitest';
import { withUnit } from './render-helpers';

/**
 * `withUnit` exists because the age read-out is the one place the CV concatenates a
 * number with a translated word, and the separator is not the same in every script.
 * Korean writes `39세` with no space; a hard-coded one read as a typo on the finished
 * CV. The rule is derived from the UNIT rather than declared per locale, so this is
 * what pins that behaviour.
 */
describe('withUnit', () => {
  it('separates a Latin or Cyrillic unit with a space', () => {
    expect(withUnit('39', 'il')).toBe('39 il');
    expect(withUnit('39', 'years')).toBe('39 years');
    expect(withUnit('39', 'лет')).toBe('39 лет');
    expect(withUnit('39', 'años')).toBe('39 años');
  });

  it('sets a Hangul counter word tight against the number', () => {
    expect(withUnit('39', '세')).toBe('39세');
  });

  /**
   * Not speculative: the same rule holds for Han and kana, so a Japanese or Chinese
   * locale added later inherits it without touching this file.
   */
  it('does the same for Han and kana, for the next East Asian locale', () => {
    expect(withUnit('39', '歳')).toBe('39歳');
    expect(withUnit('39', '岁')).toBe('39岁');
    expect(withUnit('39', 'さい')).toBe('39さい');
  });

  /**
   * The digits may already be localized — `generalInfoPairs` runs `localizeDigits`
   * before this — so the value is a string and must be passed through untouched.
   */
  it('leaves already-localized digits alone', () => {
    expect(withUnit('٣٩', 'سنة')).toBe('٣٩ سنة');
  });
});
