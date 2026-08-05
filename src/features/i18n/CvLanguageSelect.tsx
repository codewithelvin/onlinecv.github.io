import type { JSX } from 'react';
import { Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Locale } from '../../types/resume';
import { CV_LOCALES, LOCALES } from '../../app/i18n';
import { useResumeStore } from '../../state/store';

/**
 * Language of the EXPORTED CV's section headings (`Resume.locale`), kept
 * separate from the UI locale (spec §10.1). Typed content is never translated —
 * but dictionary-backed values (skills, languages, interests, nationality,
 * institutions) do follow this select, since they are stored as codes.
 *
 * `CV_LOCALES`, not `SUPPORTED_LOCALES`: a language can be translated for the UI
 * before the exporter can render a CV in it (Arabic — see `LocaleMeta.cv`).
 */
export function CvLanguageSelect(): JSX.Element {
  const { t } = useTranslation();
  const locale = useResumeStore((s) => s.resume.locale);
  const setResumeLocale = useResumeStore((s) => s.setResumeLocale);
  const labelId = 'cv-language-label';
  return (
    <Space size="small">
      <Typography.Text type="secondary" id={labelId}>
        {t('header.cvLanguage')}:
      </Typography.Text>
      {/* This label is a plain Text, not a <label>, so point the combobox at it
          explicitly — otherwise the control is unnamed for screen readers. */}
      <Select
        id="cv-language"
        size="small"
        aria-labelledby={labelId}
        value={locale}
        onChange={(v: Locale) => setResumeLocale(v)}
        options={CV_LOCALES.map((code) => ({
          label: LOCALES[code].nativeName,
          value: code,
        }))}
        /**
         * ⚠️ NOT virtualized, deliberately — and this is a fix, not a preference.
         * rc-select renders only what fits `listHeight` (256px ≈ 9 rows), so at the
         * tenth language the DOM silently stopped containing four of the options
         * the user is offered. The list is bounded by the number of languages the
         * app ships, so virtualization buys nothing here, and "what is offered is
         * in the DOM" is the contract the QA ids rest on. The DICTIONARY selects
         * (thousands of rows) must keep theirs.
         */
        virtual={false}
        style={{ minWidth: 120 }}
      />
    </Space>
  );
}
