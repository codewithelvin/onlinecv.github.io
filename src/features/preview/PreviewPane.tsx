import type { JSX } from 'react';
import { Checkbox, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';
import { showAttribution } from '../../utils/attribution';
import { CvLanguageSelect } from '../i18n/CvLanguageSelect';
import { LivePreview } from './LivePreview';

/** Preview pane: CV-language toolbar, the live A4 render, and the credit opt-out. */
export function PreviewPane(): JSX.Element {
  const { t } = useTranslation();
  const attribution = useResumeStore((s) => showAttribution(s.resume));
  const setAttribution = useResumeStore((s) => s.setAttribution);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CvLanguageSelect />
      </div>
      <LivePreview />
      {/* Checked by default (`showAttribution` treats "no value" as on), so the
          credit line appears unless the user opts out. */}
      <Checkbox
        id="cv-attribution"
        checked={attribution}
        onChange={(e) => setAttribution(e.target.checked)}
      >
        {t('preview.attribution')}
      </Checkbox>
    </Space>
  );
}
