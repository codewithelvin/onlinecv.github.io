import type { JSX } from 'react';
import { Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../../state/store';

export function SummarySection(): JSX.Element {
  const { t } = useTranslation();
  const summary = useResumeStore((s) => s.resume.summary);
  const setSummary = useResumeStore((s) => s.updateSummary);
  const tooLong = summary.length > 300;

  return (
    <Form.Item
      label={t('fields.summaryText')}
      validateStatus={tooLong ? 'error' : ''}
      help={tooLong ? t('validation.maximumThreeHundredCharacter') : undefined}
      style={{ marginBottom: 0 }}
    >
      <Input.TextArea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={5}
        maxLength={300}
        showCount
      />
    </Form.Item>
  );
}
