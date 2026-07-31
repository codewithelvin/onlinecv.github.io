import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import updateLocale from 'dayjs/plugin/updateLocale';
import type { Locale } from '../types/resume';
// Importing the registry also loads every locale's dayjs data (side-effect
// imports live there), which `updateLocale` below depends on.
import { LOCALES, SUPPORTED_LOCALES } from '../app/i18n/locales';

dayjs.extend(customParseFormat);
dayjs.extend(updateLocale);

/** Any mid-month day: `.month(n)` on the 31st would overflow into month n+1. */
const MONTH_PROBE = '2024-01-15';

/**
 * A locale's abbreviated month names, capitalized.
 *
 * Azerbaijani and Russian write months in lower case ("fev", "февр."), English
 * in title case ("Feb"), which made the exported CV read inconsistently across
 * languages. Only the SHORT names are overridden — they are the only ones this
 * app renders (`MMM YYYY` in the CV, the month picker's input and its panel
 * cells) — so Russian full month names keep their genitive form in any format
 * that also carries a day.
 *
 * Locales whose script has no title case are left exactly as dayjs has them —
 * see `LocaleMeta.capitalizeMonths`.
 */
function capitalizedMonthsShort(locale: Locale): string[] {
  return Array.from({ length: 12 }, (_, month) => {
    const name = dayjs(MONTH_PROBE).month(month).locale(locale).format('MMM');
    if (!LOCALES[locale].capitalizeMonths) return name;
    // Locale-aware casing: in Azerbaijani the capital of `i` is `İ`, not `I`.
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  });
}

/**
 * Per-locale dayjs overrides, applied once for every registered locale:
 *
 *  - `weekStart: 1` — the week starts on Monday everywhere (`az`/`ru` already
 *    ship this, `en` defaults to Sunday). Ant Design's pickers read it through
 *    `dayjs.localeData().firstDayOfWeek()`, so this fixes every calendar at once.
 *  - capitalized short month names (see above).
 */
for (const locale of SUPPORTED_LOCALES) {
  dayjs.updateLocale(locale, {
    weekStart: 1,
    monthsShort: capitalizedMonthsShort(locale),
  });
}

/** ISO storage format for full dates (`YYYY-MM-DD`). */
export const ISO_DATE = 'YYYY-MM-DD';
/** ISO storage format for month-precision dates (`YYYY-MM`). */
export const ISO_MONTH = 'YYYY-MM';
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
