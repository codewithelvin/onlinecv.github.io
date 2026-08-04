import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '../app/i18n/locales';
import { PERSON_NAME } from './patterns';

/**
 * A name the speaker of each UI language would actually type. This is the
 * contract that broke: the app offered Arabic and Georgian but its name rule
 * only knew Latin/Azerbaijani/Cyrillic letters, so those users could not get
 * past the first wizard field.
 */
const NATIVE_NAME: Record<string, string> = {
  az: 'Elvin Hüseynov',
  en: 'John Smith',
  ru: 'Иван Петров',
  ka: 'გიორგი ბერიძე',
  ar: 'محمد العلي',
  // An accented vowel and an eñe — what an ASCII-Latin rule would have rejected.
  es: 'José Núñez',
  // Hebrew: an unpointed name, as it is normally written.
  he: 'דוד כהן',
  /**
   * Korean: family name first, and it is a SINGLE Hangul syllable — which is why
   * the name rule's `min(3)` had to go (see `schemas.ts`). Each syllable is one
   * `\p{L}` code point, so the pattern itself needed no change.
   */
  ko: '김민준',
};

describe('PERSON_NAME', () => {
  it.each(SUPPORTED_LOCALES)('accepts a native name in %s', (locale) => {
    const name = NATIVE_NAME[locale];
    expect(name, `add a native sample name for the new "${locale}" locale`).toBeDefined();
    expect(PERSON_NAME.test(name)).toBe(true);
  });

  it('accepts the separators real names contain', () => {
    for (const name of ['Əli-zadə', "O'Brien", 'O’Brien', 'Van der Meer', 'Anna Maria']) {
      expect(PERSON_NAME.test(name), name).toBe(true);
    }
  });

  it('accepts Arabic with harakat (combining marks are part of the letter)', () => {
    expect(PERSON_NAME.test('مُحَمَّد')).toBe(true);
  });

  it('still rejects digits, punctuation and symbols', () => {
    for (const bad of ['Elvin1', 'Elvin_H', 'Elvin.', 'a@b', '<script>', '٣٤']) {
      expect(PERSON_NAME.test(bad), bad).toBe(false);
    }
  });

  it('requires a letter first, so separators alone cannot pass', () => {
    for (const bad of ['---', "'x", ' Elvin', '-Elvin']) {
      expect(PERSON_NAME.test(bad), bad).toBe(false);
    }
  });
});
