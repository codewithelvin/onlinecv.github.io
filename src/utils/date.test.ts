import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import type { Locale } from '../types/resume';
import { calcAge, formatFullDate, formatMonthYear, makeDateFormatter } from './date';

dayjs.extend(localeData);

describe('date utils', () => {
  it.each<Locale>(['az', 'ru', 'en'])('starts the week on Monday in %s', (locale) => {
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
});
