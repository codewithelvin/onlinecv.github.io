import type { JSX } from 'react';
import { Button, Popconfirm } from 'antd';
import { FiRotateCcw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';

/**
 * Reset the resume to an empty default after explicit confirmation (BR-8).
 * `compact` drops the text label (keeping the accessible name) so the mobile
 * action bar fits on a narrow phone without scrolling sideways.
 */
export function ResetButton({ compact }: { compact?: boolean } = {}): JSX.Element {
  const { t } = useTranslation();
  const resetResume = useResumeStore((s) => s.resetResume);
  return (
    <Popconfirm
      title={t('common.resetConfirm')}
      okText={t('common.yes')}
      cancelText={t('common.no')}
      okButtonProps={{ id: 'reset-cv-confirm' }}
      onConfirm={() => void resetResume()}
    >
      <Button
        id="reset-cv"
        icon={<FiRotateCcw aria-hidden />}
        aria-label={t('common.reset')}
        title={t('common.reset')}
      >
        {compact ? null : t('common.reset')}
      </Button>
    </Popconfirm>
  );
}
