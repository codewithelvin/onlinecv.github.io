import type { JSX } from 'react';
import { Alert, Button } from 'antd';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';

/** "New version available — reload" prompt on service-worker update (spec §19.1). */
export function PwaUpdatePrompt(): JSX.Element | null {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <Alert
      banner
      type="info"
      showIcon
      message={t('banner.newVersion')}
      action={
        <Button size="small" type="primary" onClick={() => void updateServiceWorker(true)}>
          {t('banner.reload')}
        </Button>
      }
      closable
      onClose={() => setNeedRefresh(false)}
    />
  );
}
