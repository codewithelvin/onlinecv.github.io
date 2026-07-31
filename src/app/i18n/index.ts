import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';

import az from './az.json';
import ru from './ru.json';
import en from './en.json';
import ka from './ka.json';
import type { Locale } from '../../types/resume';
import { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES, isLocale, toLocale } from './locales';

/**
 * i18next bootstrap. The set of languages lives in `./locales` — this module
 * only binds each one to its translation bundle. Add a language there and here
 * (one `import` + one `resources` entry); nothing else needs touching.
 */

export { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES, isLocale, toLocale };
export type { LocaleMeta, TextDirection } from './locales';

void i18n.use(initReactI18next).init({
  resources: {
    az: { translation: az },
    ru: { translation: ru },
    en: { translation: en },
    ka: { translation: ka },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

/**
 * Switch the whole app to a locale at once: react-i18next, dayjs, and the
 * document's `lang`/`dir` attributes. The AntD `ConfigProvider` locale and
 * direction are applied reactively in `App` (from `LOCALES`).
 */
export function applyLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  dayjs.locale(locale);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', LOCALES[locale].dir);
  }
}

/** The locale i18next is currently running in, normalized to a supported one. */
export function currentLocale(): Locale {
  return toLocale(i18n.language);
}

export { i18n };
