import type { JSX } from 'react';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../state/store';

/** Non-blocking notice when IndexedDB is unavailable (spec §17 memory-only mode). */
export function PersistenceBanner(): JSX.Element | null {
  const { t } = useTranslation();
  const error = useResumeStore((s) => s.persistenceError);
  if (!error) return null;
  return <Alert banner type="warning" showIcon closable message={t('banner.persistenceError')} />;
}
