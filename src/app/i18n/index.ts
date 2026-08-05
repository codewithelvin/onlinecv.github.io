import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';

import az from './az.json';
import ru from './ru.json';
import en from './en.json';
import ka from './ka.json';
import ar from './ar.json';
import es from './es.json';
import he from './he.json';
import ko from './ko.json';
import zh from './zh.json';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';
import tr from './tr.json';
import type { Locale } from '../../types/resume';
import { pathForLocale } from '../seo-locales';
import {
  CV_LOCALES,
  DEFAULT_LOCALE,
  LOCALES,
  REGION_ORDER,
  SUPPORTED_LOCALES,
  isLocale,
  toLocale,
} from './locales';

/**
 * i18next bootstrap. The set of languages lives in `./locales` — this module
 * only binds each one to its translation bundle. Add a language there and here
 * (one `import` + one `resources` entry); nothing else needs touching.
 */

export { CV_LOCALES, DEFAULT_LOCALE, LOCALES, REGION_ORDER, SUPPORTED_LOCALES, isLocale, toLocale };
export type { LocaleMeta, LocaleRegion, TextDirection } from './locales';

void i18n.use(initReactI18next).init({
  resources: {
    az: { translation: az },
    ru: { translation: ru },
    en: { translation: en },
    ka: { translation: ka },
    ar: { translation: ar },
    es: { translation: es },
    he: { translation: he },
    ko: { translation: ko },
    zh: { translation: zh },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
    tr: { translation: tr },
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

/**
 * Point the address bar at the current language, without navigating.
 *
 * Each language has its own indexable URL (`/ru/` — see `app/seo-locales`), so the
 * language on screen has to be the one in the bar; otherwise a shared link hands
 * the recipient a different language than the sender saw.
 *
 * `replaceState` rather than a real navigation: switching stays instant and the
 * editor keeps its state, while the URL is still something a visitor can copy,
 * bookmark or share. Crawlers never take this path — they fetch the static
 * per-locale files the build emits.
 *
 * Lives here rather than beside the other URL helpers because it is the only one
 * that touches the DOM, and that module is imported by the build-time page
 * generator, which runs in Node.
 */
export function syncLocaleUrl(locale: Locale): void {
  if (typeof window === 'undefined' || typeof window.history?.replaceState !== 'function') return;
  const next = pathForLocale(window.location.pathname, locale);
  if (next === window.location.pathname) return;
  window.history.replaceState(null, '', `${next}${window.location.search}${window.location.hash}`);
}

/** The locale i18next is currently running in, normalized to a supported one. */
export function currentLocale(): Locale {
  return toLocale(i18n.language);
}

export { i18n };
