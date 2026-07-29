import type { DictionaryEntry } from '../types/dictionary';
import type { Locale } from '../types/resume';

/**
 * Resolve a dictionary code to its label in the active UI locale, falling back
 * to the stored free-text name when the code is unknown or custom (§13.1).
 */
export function resolveLabel(
  entries: DictionaryEntry[],
  code: string | undefined,
  fallbackText: string,
  locale: Locale,
): string {
  if (code) {
    const entry = entries.find((e) => e.code === code);
    if (entry) return entry[locale];
  }
  return fallbackText;
}

/** Build AntD-style `{ value, label }` options for a dictionary in the active locale. */
export function toOptions(
  entries: DictionaryEntry[],
  locale: Locale,
): Array<{ value: string; label: string }> {
  return entries.map((e) => ({ value: e.code, label: e[locale] }));
}
