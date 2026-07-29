import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/az';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';
import type { Locale } from '../types/resume';

dayjs.extend(customParseFormat);

/** Full-date display format: work experience + date of birth (spec §10.2). */
export const FULL_DATE = 'DD.MM.YYYY';
/** Month–year display format (localized month): education + certificates. */
export const MONTH_YEAR = 'MMM YYYY';

/**
 * Create a locale-bound date formatter. Binding the locale explicitly (rather
 * than relying on the global dayjs locale) lets the exported CV use
 * `resume.locale` for its headings/dates independently of the UI locale.
 */
export function makeDateFormatter(locale: Locale): (iso: string, fmt?: string) => string {
  return (iso: string, fmt: string = FULL_DATE): string => {
    if (!iso) return '';
    const d = dayjs(iso).locale(locale);
    return d.isValid() ? d.format(fmt) : '';
  };
}

/** Format a full ISO date (`YYYY-MM-DD`) as `DD.MM.YYYY` in the given locale. */
export function formatFullDate(iso: string, locale: Locale): string {
  return makeDateFormatter(locale)(iso, FULL_DATE);
}

/** Format an ISO month (`YYYY-MM`) as a localized `MMM YYYY`. */
export function formatMonthYear(iso: string, locale: Locale): string {
  return makeDateFormatter(locale)(iso, MONTH_YEAR);
}

/** Derive age from an ISO date of birth. Never stored (§13). */
export function calcAge(dobIso: string): number | null {
  if (!dobIso) return null;
  const dob = dayjs(dobIso);
  if (!dob.isValid()) return null;
  return dayjs().diff(dob, 'year');
}
