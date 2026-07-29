import type { Locale, LocalizedText } from '../types/resume';
import { DEFAULT_LOCALE } from '../app/i18n/locales';

/** Read a `LocalizedText` in `locale`, falling back to the default locale. */
export function localizedText(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text[DEFAULT_LOCALE];
}
