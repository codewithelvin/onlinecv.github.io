import { describe, expect, it } from 'vitest';
import type { Locale, Resume } from '../../types/resume';
import { createEmptyResume } from '../../utils/empty-resume';
import { fullName, nameInitials, withUnit } from './render-helpers';

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

function named(firstName: string, lastName: string, locale: Locale = 'az'): Resume {
  const r = createEmptyResume(locale);
  r.basics = { ...r.basics, firstName, lastName };
  return r;
}

/**
 * Name ORDER is a correctness property of the CV, not a layout choice, which is why
 * it lives here instead of in each template.
 *
 * Chinese, Korean and Japanese all write the family name first with no separator.
 * Printed the Latin way, 李明 becomes "明 李" — and because 李 is one of the
 * commonest surnames on earth, that does not read as an odd ordering, it reads as a
 * different and nonexistent name. Same class of defect as the `min(3)` that used to
 * reject every Korean surname.
 */
describe('fullName', () => {
  it('joins a Latin or Cyrillic name given-name-first, with a space', () => {
    expect(fullName(named('Elvin', 'Hüseynov'))).toBe('Elvin Hüseynov');
    expect(fullName(named('Иван', 'Петров'))).toBe('Иван Петров');
    expect(fullName(named('José', 'Núñez'))).toBe('José Núñez');
  });

  it('puts the family name first, unseparated, for Han and Hangul', () => {
    expect(fullName(named('明', '李', 'zh'))).toBe('李明');
    expect(fullName(named('民准', '欧阳', 'zh'))).toBe('欧阳民准');
    expect(fullName(named('민준', '김', 'ko'))).toBe('김민준');
  });

  /**
   * Derived from the NAME, not from `resume.locale` — so it is right in both
   * directions, which keying it off the CV language would not have been.
   */
  it('follows the name rather than the CV language', () => {
    // A Chinese name on an Azerbaijani CV is still a Chinese name.
    expect(fullName(named('明', '李', 'az'))).toBe('李明');
    // …and a Latin name on a Chinese CV is still ordered the Latin way.
    expect(fullName(named('John', 'Smith', 'zh'))).toBe('John Smith');
  });

  it('leaves a half-filled or mixed-script name alone', () => {
    // Mixed means the writer chose to render one part in Latin; that order is theirs.
    expect(fullName(named('明', 'Li', 'zh'))).toBe('明 Li');
    expect(fullName(named('李明', '', 'zh'))).toBe('李明');
    expect(fullName(named('', '李', 'zh'))).toBe('李');
  });
});

/**
 * Two callers in two layers — the modern template's sidebar and the editor's
 * `AvatarField` — which is why this is in core at all: the editor was drawing 明李
 * beside a preview that said 李明.
 */
describe('nameInitials', () => {
  it('takes the first character of each part, in display order', () => {
    expect(nameInitials('Elvin', 'Hüseynov')).toBe('EH');
    // Family name first, so the monogram reads the way the name does: 李明 → 李明.
    expect(nameInitials('明', '李')).toBe('李明');
    expect(nameInitials('민준', '김')).toBe('김민');
  });

  it('agrees with fullName about which character comes first', () => {
    for (const [first, last] of [
      ['明', '李'],
      ['민준', '김'],
      ['Elvin', 'Hüseynov'],
      ['明', 'Li'],
    ] as const) {
      expect(nameInitials(first, last)[0]).toBe(fullName(named(first, last))[0]);
    }
  });

  it('survives an empty field', () => {
    expect(nameInitials('Elvin', '')).toBe('E');
    expect(nameInitials('', '')).toBe('');
  });
});
