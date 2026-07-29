import type { JSX } from 'react';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/** Offline banner (spec §19.1). Editing + export still work offline. */
export function OfflineBanner(): JSX.Element | null {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  if (online) return null;
  return <Alert banner type="warning" showIcon message={t('banner.offline')} />;
}
