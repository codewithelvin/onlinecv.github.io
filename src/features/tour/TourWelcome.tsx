import type { JSX } from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import { FiCompass, FiPlay } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useScrollLock } from '../../hooks/useScrollLock';
import { getModalContainer } from '../../utils/modal-container';
import { useTourStore } from './tour-store';

/**
 * The invitation (FR-20 / §10.5): a modal, once per browser, offering to show the
 * editor around.
 *
 * A MODAL rather than a banner or a toast, and that is the one deliberate
 * interruption in this app. The failure it answers is not that the tour was
 * ignored — it is that the Templates button was never seen at all, which is
 * exactly what happens to anything that shares the screen with a form somebody has
 * come to fill in. So this asks, in the middle, before the typing starts.
 *
 * It offers a choice and takes either answer as final: **both** buttons end the
 * offer for good (`useTourStore.end` records it), because a question re-asked on
 * every visit is not an invitation, it is nagging. The way back in is the guide's
 * own replay entry, which costs nobody who declined anything.
 *
 * Same chrome as `PwaInstallPrompt`, the app's other one-off invitation: portalled
 * into `#modal-root` (see `utils/modal-container`) with the app's own scroll lock
 * rather than AntD's.
 */
export function TourWelcome(): JSX.Element {
  const { t } = useTranslation();
  const start = useTourStore((s) => s.start);
  const end = useTourStore((s) => s.end);

  useScrollLock(true);

  return (
    <Modal
      open
      title={
        <Space size={10}>
          <span style={{ display: 'inline-flex', fontSize: 18, lineHeight: 1 }}>
            <FiCompass aria-hidden />
          </span>
          {t('tour.welcome.title')}
        </Space>
      }
      /**
       * The cross and the backdrop both mean "no thanks", not "ask me later".
       * Anything else leaves the offer half-open: the modal would be gone, the
       * decision unrecorded, and it would be back on the next visit.
       */
      onCancel={end}
      getContainer={getModalContainer}
      width={440}
      centered
      footer={[
        <Button key="skip" id="tour-skip" onClick={end}>
          {t('tour.welcome.skip')}
        </Button>,
        <Button
          key="start"
          id="tour-start"
          type="primary"
          icon={<FiPlay aria-hidden />}
          onClick={start}
        >
          {t('tour.welcome.start')}
        </Button>,
      ]}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text>{t('tour.welcome.body')}</Typography.Text>
        <Typography.Text type="secondary">{t('tour.welcome.hint')}</Typography.Text>
      </Space>
    </Modal>
  );
}
