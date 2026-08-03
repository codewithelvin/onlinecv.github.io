import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import { SUPPORTED_LOCALES } from '../app/i18n/locales';
import {
  FULL_DATE,
  MONTH_YEAR,
  calcAge,
  datePlaceholder,
  dobPickerStart,
  formatFullDate,
  formatMonthYear,
  makeDateFormatter,
} from './date';

dayjs.extend(localeData);

describe('date utils', () => {
  // Driven by the registry, not a copy of it: a newly registered language whose
  // dayjs data was never imported fails here instead of in production.
  it.each(SUPPORTED_LOCALES)('starts the week on Monday in %s', (locale) => {
    expect(dayjs().locale(locale).localeData().firstDayOfWeek()).toBe(1);
  });

  it('formats a full date as DD.MM.YYYY', () => {
    expect(formatFullDate('1990-05-14', 'az')).toBe('14.05.1990');
  });

  it('formats a month-year with a localized month', () => {
    // English month abbreviation for 2022-06.
    expect(formatMonthYear('2022-06', 'en')).toMatch(/Jun\s+2022/);
  });

  it('capitalizes the abbreviated month in every locale', () => {
    expect(formatMonthYear('2026-02', 'en')).toBe('Feb 2026');
    expect(formatMonthYear('2026-02', 'az')).toBe('Fev 2026');
    // Azerbaijani upper-cases `i` as `İ`, so plain toUpperCase would be wrong.
    expect(formatMonthYear('2026-06', 'az')).toBe('İyn 2026');
    expect(formatMonthYear('2026-02', 'ru')).toMatch(/^Февр\.?\s+2026$/);
    // Georgian (Mkhedruli) is unicameral — there is no capital to apply, so the
    // month must come through exactly as dayjs has it.
    expect(formatMonthYear('2026-02', 'ka')).toBe('თებ 2026');
  });

  /**
   * dayjs's Arabic locale rewrites every digit it formats into Arabic-Indic
   * numerals — including `format('YYYY-MM-DD')`, which is how a picked date
   * becomes the value stored in IndexedDB. Left alone, an Arabic UI would
   * persist `٢٠٢٦-٠٧-٣١` as a date of birth and no other locale could read it
   * back. `utils/date` neutralizes `preparse`/`postformat` for that reason;
   * this is the assertion that it stays neutralized.
   */
  it.each(SUPPORTED_LOCALES)('keeps stored dates in Western digits in %s', (locale) => {
    dayjs.locale(locale);
    try {
      expect(dayjs('2026-07-31').format('YYYY-MM-DD')).toBe('2026-07-31');
      // …and a date written in that locale still parses back to the same day.
      expect(dayjs(dayjs('2026-07-31').format('YYYY-MM-DD')).date()).toBe(31);
    } finally {
      dayjs.locale('az');
    }
  });

  /**
   * DISPLAY is the other half of that split: what the reader sees does follow
   * the locale's numerals (`LocaleMeta.digits`), it is only the stored value
   * that must not. Both come out of the same formatter, so both are asserted.
   */
  it('writes dates in the locale’s own numerals', () => {
    expect(formatFullDate('2026-07-31', 'az')).toBe('31.07.2026');
    expect(formatFullDate('2026-07-31', 'ar')).toBe('٣١.٠٧.٢٠٢٦');
    // Arabic month names, Arabic digits — dayjs supplies the first, we the second.
    expect(formatMonthYear('2026-02', 'ar')).toBe('فبراير ٢٠٢٦');
  });

  it('returns empty string for empty/invalid input', () => {
    const fmt = makeDateFormatter('az');
    expect(fmt('')).toBe('');
    expect(fmt('not-a-date')).toBe('');
  });

  it('derives a non-negative age from a date of birth', () => {
    const age = calcAge('2000-01-01');
    expect(age).not.toBeNull();
    expect(age).toBeGreaterThanOrEqual(20);
  });

  it('returns null age for empty dob', () => {
    expect(calcAge('')).toBeNull();
  });

  /**
   * The placeholder exists to tell the user the field can be TYPED, so it has to
   * be something they can literally retype — which makes it the one formatted
   * string in the app that must NOT follow `LocaleMeta.digits`. The input parses
   * what `format` describes, and that is Western digits in every locale.
   */
  describe('datePlaceholder', () => {
    it.each(SUPPORTED_LOCALES)('is a re-typeable example in %s', (locale) => {
      const placeholder = datePlaceholder(FULL_DATE, locale);
      expect(placeholder).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
      // Round-trips: what is shown parses back under the format that is shown.
      expect(dayjs(placeholder, FULL_DATE, true).isValid()).toBe(true);
    });

    it('keeps Western digits in Arabic, unlike the rendered CV', () => {
      expect(datePlaceholder(FULL_DATE, 'ar')).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
      // The same instant through the CV formatter localizes — they differ on purpose.
      expect(formatFullDate('2026-07-31', 'ar')).toBe('٣١.٠٧.٢٠٢٦');
    });

    it('follows the locale for a month picker’s own format', () => {
      expect(datePlaceholder(MONTH_YEAR, 'en')).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
      expect(datePlaceholder(MONTH_YEAR, 'ka')).toMatch(/^\p{Script=Georgian}+ \d{4}$/u);
    });
  });

  /**
   * The date-of-birth panel opens a generation back rather than on today, which is
   * what turns eight-to-ten decade pagings into one. It is a VIEW, not a value.
   */
  describe('dobPickerStart', () => {
    it('opens roughly a generation back, in the past', () => {
      const start = dobPickerStart();
      const yearsBack = dayjs().diff(start, 'year');
      expect(yearsBack).toBeGreaterThanOrEqual(15);
      expect(yearsBack).toBeLessThanOrEqual(45);
      expect(start.isBefore(dayjs())).toBe(true);
    });

    it('lands on a plausible birth year, past the 16-year age floor (§16)', () => {
      expect(calcAge(dobPickerStart().format('YYYY-MM-DD'))).toBeGreaterThanOrEqual(16);
    });
  });
});
