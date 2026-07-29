import type { JSX } from 'react';
import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Locale } from '../../types/resume';
import { useResumeStore } from '../../state/store';

/** UI language switcher (spec §10.1). Persists via the store → IndexedDB. */
export function LanguageSwitcher(): JSX.Element {
  const { t } = useTranslation();
  const uiLocale = useResumeStore((s) => s.uiLocale);
  const setUiLocale = useResumeStore((s) => s.setUiLocale);
  return (
    <Segmented
      aria-label={t('header.language')}
      value={uiLocale}
      onChange={(v) => setUiLocale(v as Locale)}
      options={[
        { label: 'AZ', value: 'az' },
        { label: 'RU', value: 'ru' },
        { label: 'EN', value: 'en' },
      ]}
    />
  );
}
