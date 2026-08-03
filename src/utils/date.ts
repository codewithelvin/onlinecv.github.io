import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import updateLocale from 'dayjs/plugin/updateLocale';
import type { Locale } from '../types/resume';
// Importing the registry also loads every locale's dayjs data (side-effect
// imports live there), which `updateLocale` below depends on.
import { LOCALES, SUPPORTED_LOCALES } from '../app/i18n/locales';
import { toArabicDigits } from './arabic';

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
 * Identity `preparse`/`postformat`, replacing whatever a locale ships.
 *
 * dayjs's Arabic locale rewrites EVERY digit of every formatted string into
 * Arabic-Indic numerals (and `,` into `،`). That is a display convention, but
 * dayjs applies it to `.format()` as such — including `format('YYYY-MM-DD')`,
 * the call that produces the value stored in IndexedDB. An Arabic UI would
 * therefore persist `٢٠٢٦-٠٧-٣١` as a date of birth: no longer the ISO string
 * the model is defined in (§13), unsortable, and unreadable to every other
 * locale the moment the user switches languages.
 *
 * Neutralizing the pair keeps the Arabic month and weekday names while leaving
 * the digits alone, so the storage format is the same in all locales.
 */
const KEEP_DIGITS = { preparse: (s: string) => s, postformat: (s: string) => s };

/**
 * Per-locale dayjs overrides, applied once for every registered locale:
 *
 *  - `weekStart: 1` — the week starts on Monday everywhere (`az`/`ru` already
 *    ship this, `en` defaults to Sunday). Ant Design's pickers read it through
 *    `dayjs.localeData().firstDayOfWeek()`, so this fixes every calendar at once.
 *  - capitalized short month names (see above).
 *  - Western digits (see above) — a no-op for every locale but `ar`.
 */
for (const locale of SUPPORTED_LOCALES) {
  dayjs.updateLocale(locale, {
    weekStart: 1,
    monthsShort: capitalizedMonthsShort(locale),
    ...KEEP_DIGITS,
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
    return d.isValid() ? localizeDigits(d.format(fmt), locale) : '';
  };
}

/**
 * Rewrite a FORMATTED string's digits into the locale's own numerals
 * (`31.07.2026` → `٣١.٠٧.٢٠٢٦` in Arabic). `LocaleMeta.digits` decides; every
 * other locale is a no-op.
 *
 * Deliberately at the display end rather than in dayjs, which applies its
 * `postformat` to `.format()` as such — including the `YYYY-MM-DD` call whose
 * result is STORED. Formatting for the eye and formatting for the record are two
 * different things, and only the first one localizes.
 */
export function localizeDigits(text: string, locale: Locale): string {
  return LOCALES[locale].digits === 'arab' ? toArabicDigits(text) : text;
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
