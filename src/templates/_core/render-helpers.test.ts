import { describe, expect, it } from 'vitest';
import type { ContactType, Locale, Resume } from '../../types/resume';
import { createEmptyResume } from '../../utils/empty-resume';
import { contactDisplay, contactHref, fullName, nameInitials, withUnit } from './render-helpers';

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

/**
 * `contactHref` is what makes a printed contact line tappable in the preview and
 * clickable in the exported PDF. It is core rather than per-template on purpose:
 * what a phone number or a WhatsApp handle turns into belongs to the CHANNEL, so
 * every template — present and future — gets the same target.
 */
describe('contactHref', () => {
  const item = (type: ContactType, value: string) => ({ id: 'c', type, value });

  it('dials phone-shaped channels through tel:', () => {
    expect(contactHref(item('mobile', '+994501234567'))).toBe('tel:+994501234567');
    expect(contactHref(item('landline', '+994 12 345 67 89'))).toBe('tel:+994123456789');
    // A fax number is still a telephone number (RFC 3966).
    expect(contactHref(item('fax', '+994121234567'))).toBe('tel:+994121234567');
  });

  it('drops the + for wa.me, which 404s with one', () => {
    expect(contactHref(item('whatsapp', '+994501234567'))).toBe('https://wa.me/994501234567');
  });

  it('takes Telegram in every shape a user writes it', () => {
    expect(contactHref(item('telegram', '@elvin'))).toBe('https://t.me/elvin');
    expect(contactHref(item('telegram', 'elvin'))).toBe('https://t.me/elvin');
    expect(contactHref(item('telegram', 't.me/elvin'))).toBe('https://t.me/elvin');
    expect(contactHref(item('telegram', 'https://t.me/elvin'))).toBe('https://t.me/elvin');
    // Telegram's own form for a registered phone number; an invite hash is never
    // all digits, so the two cannot be confused.
    expect(contactHref(item('telegram', '+994501234567'))).toBe('https://t.me/+994501234567');
  });

  it('opens Skype through its own URI, and leaves an invite URL alone', () => {
    expect(contactHref(item('skype', 'live:elvin_1'))).toBe('skype:live:elvin_1?chat');
    expect(contactHref(item('skype', 'https://join.skype.com/abc'))).toBe(
      'https://join.skype.com/abc',
    );
  });

  it('mails an e-mail and links a profile URL as-is', () => {
    expect(contactHref(item('email', 'a@b.com'))).toBe('mailto:a@b.com');
    expect(contactHref(item('linkedin', 'https://www.linkedin.com/in/elvin/'))).toBe(
      'https://www.linkedin.com/in/elvin/',
    );
    // Stored without a scheme (older records, or a user who typed the host).
    expect(contactHref(item('website', 'elvin.dev'))).toBe('https://elvin.dev');
  });

  /**
   * The preview puts this straight into the DOM, so a value that is not already
   * `http(s)` must never come back out as an executable scheme. Everything else
   * either gets a fixed scheme with a sanitized payload or no link at all.
   */
  it('cannot emit a dangerous scheme from a user-supplied URL', () => {
    expect(contactHref(item('website', 'javascript:alert(1)'))).toBeUndefined();
    expect(contactHref(item('telegram', '"><script>x</script>'))).toBe(
      'https://t.me/scriptxscript',
    );
  });

  it('leaves a postal address unlinked and skips an empty value', () => {
    expect(contactHref(item('address', 'Bakı, Nizami küç. 1'))).toBeUndefined();
    expect(contactHref(item('mobile', '   '))).toBeUndefined();
  });

  /**
   * The PRINTED string is unchanged by any of this — an ATS reads the same
   * contact line it always did, and a paper copy still shows the number.
   */
  it('never changes what is printed', () => {
    expect(contactDisplay(item('mobile', '+994501234567'))).toBe('+994501234567');
    expect(contactDisplay(item('linkedin', 'https://www.linkedin.com/in/elvin/'))).toBe(
      'linkedin.com/in/elvin',
    );
  });
});
