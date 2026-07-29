import type { JSX } from 'react';
import { Space } from 'antd';
import { CvLanguageSelect } from '../i18n/CvLanguageSelect';
import { LivePreview } from './LivePreview';

/** Preview pane: CV-language toolbar + the live A4 render. */
export function PreviewPane(): JSX.Element {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CvLanguageSelect />
      </div>
      <LivePreview />
    </Space>
  );
}
