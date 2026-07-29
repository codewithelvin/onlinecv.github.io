import type { JSX } from 'react';
import { Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Locale } from '../../types/resume';
import { useResumeStore } from '../../state/store';

/**
 * Language of the EXPORTED CV's section headings (`Resume.locale`), kept
 * separate from the UI locale (spec §10.1). Typed content is never translated.
 */
export function CvLanguageSelect(): JSX.Element {
  const { t } = useTranslation();
  const locale = useResumeStore((s) => s.resume.locale);
  const setResumeLocale = useResumeStore((s) => s.setResumeLocale);
  return (
    <Space size="small">
      <Typography.Text type="secondary">{t('header.cvLanguage')}:</Typography.Text>
      <Select
        size="small"
        value={locale}
        onChange={(v: Locale) => setResumeLocale(v)}
        options={[
          { label: 'Azərbaycan', value: 'az' },
          { label: 'Русский', value: 'ru' },
          { label: 'English', value: 'en' },
        ]}
        style={{ minWidth: 120 }}
      />
    </Space>
  );
}
