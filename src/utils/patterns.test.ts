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
  /**
   * Chinese: family name first again, and the whole name is TWO code points — the
   * shortest native name in this list. 李 alone is the surname of something like a
   * hundred million people, so a length floor on either field would have locked
   * them out; `min(3)` is already gone (see `schemas.ts`) and this pins it.
   */
  zh: '李明',
  // A French name with an accent and the hyphen a compound given name carries.
  fr: 'Jean-Luc Béart',
  // German: an umlaut and an eszett, the two letters an ASCII rule would refuse.
  de: 'Jürgen Weiß',
  it: 'Giuseppe Lo Càscio',
  /**
   * Turkish: `ş` and `ğ`, plus the DOTLESS `ı` — which is a distinct letter here
   * rather than a decorated `i`, and is why the fold in `utils/search` has to map
   * it explicitly (NFD leaves it alone).
   */
  tr: 'Işıl Şahingöz',
  // Portuguese: a tilde and a cedilla, both diacritics an ASCII rule would refuse.
  pt: 'João Conceição',
  // Polish: the barred Ł and an accented Ś, neither of which is a Latin-1 letter.
  pl: 'Łukasz Wiśniewski',
  // Hungarian: the double-acute Ő — a letter of its own, not "O" with a typo'd accent.
  hu: 'Győző Kovács',
  // Greek: a different script, and every vowel here carries its (mandatory) tonos.
  el: 'Γιώργος Παπαδόπουλος',
  // Kazakh: Ә and Қ, two of the nine Cyrillic letters Kazakh adds beyond Russian's.
  kk: 'Әлия Қасымова',
  /**
   * Uzbek: the turned comma `ʻ` in "Ulugʻbek" is a spacing MODIFIER letter
   * (Unicode category Lm), not a combining mark — `\p{L}` already covers that
   * category, so the pattern needed no change, but it is worth pinning: this is
   * the same character `utils/search`'s fold has to handle explicitly, since NFD
   * leaves it alone the way it leaves `ə`/`ı`/`ß` alone.
   */
  uz: 'Ulugʻbek Karimov',
  /**
   * Japanese: family name first again, and the first sample here written in TWO
   * scripts at once — 山田 is kanji (Han) and there are names whose given part is
   * hiragana or katakana. `\p{L}` covers all three, but the mixture is the reason
   * a script-by-script rule would have been the wrong shape.
   */
  ja: '山田 太郎',
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
