import type { JSX } from 'react';
import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Locale } from '../../types/resume';
import { LOCALES, SUPPORTED_LOCALES } from '../../app/i18n';
import { useResumeStore } from '../../state/store';

/**
 * UI language switcher (spec §10.1). Persists via the store → IndexedDB. The
 * options come from the locale registry, so a new language appears here as soon
 * as it is registered.
 */
export function LanguageSwitcher(): JSX.Element {
  const { t } = useTranslation();
  const uiLocale = useResumeStore((s) => s.uiLocale);
  const setUiLocale = useResumeStore((s) => s.setUiLocale);
  return (
    <Segmented
      aria-label={t('header.language')}
      value={uiLocale}
      onChange={(v) => setUiLocale(v as Locale)}
      options={SUPPORTED_LOCALES.map((code) => ({
        label: LOCALES[code].short,
        value: code,
        title: LOCALES[code].nativeName,
      }))}
    />
  );
}
