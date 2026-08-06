import dayjs, { type Dayjs } from 'dayjs';
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
/**
 * Full-date display format: work experience + date of birth (spec §10.2).
 *
 * Also the TOKEN that means "a full date" — see `resolveFormat`. Its literal
 * value is the pattern most locales actually use, so passing it straight to
 * dayjs (as the AntD pickers do, for input) still does the right thing.
 */
export const FULL_DATE = 'DD.MM.YYYY';
/** Month–year display format (localized month): education + certificates. */
export const MONTH_YEAR = 'MMM YYYY';

/**
 * Resolve one of the two canonical format tokens to the pattern the locale
 * itself writes (`LocaleMeta.dateFormats`); anything else is passed through.
 *
 * This indirection is what keeps the East Asian date order from becoming a
 * per-template concern. Every caller that renders a date for a reader —
 * the three shipped templates and every future one, the editor's collapsed
 * section summaries, the PDF export — already asks for `FULL_DATE` or
 * `MONTH_YEAR`, so localizing them HERE reaches all of them at once and none of
 * them has to learn that Korean puts the year first.
 *
 * Matching on the token's literal value rather than on a separate enum is
 * deliberate: it means the many callers that hard-coded `'DD.MM.YYYY'` before
 * this table existed keep working, and a template that passes some third
 * pattern of its own still gets exactly what it asked for.
 */
function resolveFormat(fmt: string, locale: Locale): string {
  const formats = LOCALES[locale].dateFormats;
  if (fmt === FULL_DATE) return formats.full;
  if (fmt === MONTH_YEAR) return formats.monthYear;
  return fmt;
}

/**
 * Create a locale-bound date formatter. Binding the locale explicitly (rather
 * than relying on the global dayjs locale) lets the exported CV use
 * `resume.locale` for its headings/dates independently of the UI locale.
 */
export function makeDateFormatter(locale: Locale): (iso: string, fmt?: string) => string {
  return (iso: string, fmt: string = FULL_DATE): string => {
    if (!iso) return '';
    const d = dayjs(iso).locale(locale);
    return d.isValid() ? localizeDigits(d.format(resolveFormat(fmt, locale)), locale) : '';
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

/**
 * An example date in a picker's own display format, for use as its placeholder.
 *
 * Ant Design's default placeholder ("Select date") says nothing about the format,
 * so the field reads as click-only — and clicking your way back to a birth year
 * costs eight to ten decade/year pagings. Showing the SHAPE of the value
 * advertises that the field can simply be TYPED, which is the fast path for any
 * date far from today.
 *
 * Digits stay Western even in Arabic: the placeholder has to be something the
 * user can literally retype, and the input parses what `format` describes, which
 * `KEEP_DIGITS` above keeps in Western numerals. `localizeDigits` is for the
 * finished CV, not for form input.
 */
export function datePlaceholder(fmt: string, locale: Locale): string {
  return dayjs().locale(locale).format(fmt);
}

/**
 * How far back a date-of-birth panel opens — roughly a generation, so the decade
 * view lands within one page of any plausible birth year.
 */
const DOB_PICKER_YEARS_BACK = 25;

/**
 * Where an empty date-of-birth picker should OPEN.
 *
 * Ant Design starts at the current month, which is never the answer for a
 * birthday. This is a starting VIEW only — it sets no value and preselects no
 * day, so an untouched field stays empty and its `required` rule still bites.
 */
export function dobPickerStart(): Dayjs {
  return dayjs().subtract(DOB_PICKER_YEARS_BACK, 'year');
}

/** Derive age from an ISO date of birth. Never stored (§13). */
export function calcAge(dobIso: string): number | null {
  if (!dobIso) return null;
  const dob = dayjs(dobIso);
  if (!dob.isValid()) return null;
  return dayjs().diff(dob, 'year');
}
