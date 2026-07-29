import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';
import type { Locale as AntdLocale } from 'antd/es/locale';
import azAZ from 'antd/locale/az_AZ';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import 'dayjs/locale/az';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';

import az from './az.json';
import ru from './ru.json';
import en from './en.json';
import type { Locale } from '../../types/resume';

export const SUPPORTED_LOCALES: Locale[] = ['az', 'ru', 'en'];
export const DEFAULT_LOCALE: Locale = 'az';

/** Ant Design `ConfigProvider` locale bundle per UI locale (§10.1 synchronized switch). */
export const ANTD_LOCALES: Record<Locale, AntdLocale> = {
  az: azAZ,
  ru: ruRU,
  en: enUS,
};

void i18n.use(initReactI18next).init({
  resources: {
    az: { translation: az },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

/**
 * Switch the whole app to a locale at once: react-i18next, dayjs, and the
 * document `lang` attribute. The AntD `ConfigProvider` locale is applied
 * reactively in `App` (see `ANTD_LOCALES`).
 */
export function applyLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  dayjs.locale(locale);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', locale);
  }
}

export { i18n };
