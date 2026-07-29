import type { JSX } from 'react';
import { Button, Popconfirm } from 'antd';
import { FiRotateCcw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../../state/store';

/** Reset the resume to an empty default after explicit confirmation (BR-8). */
export function ResetButton(): JSX.Element {
  const { t } = useTranslation();
  const resetResume = useResumeStore((s) => s.resetResume);
  return (
    <Popconfirm
      title={t('common.resetConfirm')}
      okText={t('common.yes')}
      cancelText={t('common.no')}
      onConfirm={() => void resetResume()}
    >
      <Button icon={<FiRotateCcw aria-hidden />} aria-label={t('common.reset')}>
        {t('common.reset')}
      </Button>
    </Popconfirm>
  );
}
