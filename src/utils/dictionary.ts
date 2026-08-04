import type { DictionaryEntry } from '../types/dictionary';
import type { Locale } from '../types/resume';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../app/i18n/locales';

/**
 * Read a dictionary row's label in `locale`, falling back to `DEFAULT_LOCALE`
 * and finally to the raw code. The fallback is what lets a newly added locale
 * ship before its dictionary columns are translated.
 */
export function dictionaryLabel(entry: DictionaryEntry, locale: Locale): string {
  return entry[locale] ?? entry[DEFAULT_LOCALE] ?? entry.code;
}

/**
 * Resolve a dictionary code to its label in the requested locale, falling back
 * to the stored free-text when the code is unknown or custom (§13.1).
 *
 * This is what makes dictionary-backed values (skills, languages, interests,
 * nationality, institutions, cities, positions) follow a language switch: the code
 * is the stored truth and the label is derived at render time.
 *
 * WHEN THERE IS NO CODE, the stored text is looked up as a label before giving up
 * — the same migration `resolveDictionaryValue` does for nationality, and for the
 * same reason. Several of these fields gained their code column long after the app
 * shipped (`cities`, `positions`, `faculties`, `specialities` on 2026-08-03), so a
 * CV written before that holds a perfectly good "Bakı" with no `locationCode` and
 * would otherwise stay frozen in Azerbaijani for ever — while the identical city
 * picked today re-labels. That difference reads as a bug, and it is one.
 *
 * Exact match only, deliberately: the point is to recognize a value that WAS the
 * dictionary's own spelling in some language, not to guess at typos. A genuinely
 * free-text value still comes back untouched, which is what §13.1 promises.
 */
export function resolveLabel(
  entries: DictionaryEntry[],
  code: string | undefined,
  fallbackText: string,
  locale: Locale,
): string {
  if (code) {
    const entry = entries.find((e) => e.code === code);
    if (entry) return dictionaryLabel(entry, locale);
  }
  return resolveDictionaryValue(entries, fallbackText, locale);
}

/**
 * Resolve a field that stores EITHER a dictionary code or free text in one
 * string — `generalInfo.nationality`, the §13.1 single-string exception.
 *
 * Unlike `resolveLabel` there is no separate code column to trust, so a value
 * that is not a code is also matched against the labels of every locale. That is
 * what re-localizes records written before nationality was stored as a code (and
 * text pasted in from another language); anything still unmatched is free text
 * and comes back untouched.
 */
export function resolveDictionaryValue(
  entries: DictionaryEntry[],
  value: string,
  locale: Locale,
): string {
  if (!value) return value;
  const entry =
    entries.find((e) => e.code === value) ??
    entries.find((e) => SUPPORTED_LOCALES.some((l) => e[l] === value));
  return entry ? dictionaryLabel(entry, locale) : value;
}

/** Build AntD-style `{ value, label }` options for a dictionary in the active locale. */
export function toOptions(
  entries: DictionaryEntry[],
  locale: Locale,
): Array<{ value: string; label: string }> {
  return entries.map((e) => ({ value: e.code, label: dictionaryLabel(e, locale) }));
}
