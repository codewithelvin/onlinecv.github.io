import { type JSX, useCallback, useEffect, useState } from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import { FiDownloadCloud, FiSmartphone, FiWifiOff, FiLock } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../state/store';
import { needsWizard } from '../utils/empty-resume';
import { useScrollLock } from '../hooks/useScrollLock';
import { getModalContainer } from '../utils/modal-container';

/**
 * The install screen for the PWA (spec §19.1).
 *
 * Chromium fires `beforeinstallprompt` when the app meets the installability
 * criteria and lets a page defer the browser's own mini-infobar; without
 * `preventDefault()` there is nothing left to show later, so the event is
 * captured and held. `prompt()` may only be called from a user gesture, which is
 * why it hangs off the button rather than the effect.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Remembers that the screen has been answered, so it is offered once and not on
 * every visit. `localStorage`, not the IndexedDB record: this is a property of
 * the browser install state, not of the CV, and it must survive BR-8 "reset CV".
 */
const DISMISSED_KEY = 'onlinecv-install-dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    // Private windows can throw on access — then it simply shows again.
    return false;
  }
}

function rememberDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    /* storage unavailable — the prompt just reappears next visit */
  }
}

/** Already running as an installed app (Chromium/Android + iOS Safari). */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function Benefit({ icon, text }: { icon: JSX.Element; text: string }): JSX.Element {
  return (
    <Space align="start" size={10}>
      <span style={{ display: 'inline-flex', fontSize: 16, lineHeight: '22px' }}>{icon}</span>
      <Typography.Text>{text}</Typography.Text>
    </Space>
  );
}

export function PwaInstallPrompt(): JSX.Element | null {
  const { t } = useTranslation();
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const hydrated = useResumeStore((s) => s.hydrated);
  const resume = useResumeStore((s) => s.resume);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    const onBeforeInstallPrompt = (e: Event): void => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    const onInstalled = (): void => {
      rememberDismissed();
      setOpen(false);
      setEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  /**
   * Never over the first-run wizard: that is the one screen the user must get
   * through, and a modal on top of it reads as the app being broken. Returning
   * visitors — the ones for whom installing is actually worth something — see it
   * on the editor instead.
   */
  const visible = open && hydrated && !needsWizard(resume);
  useScrollLock(visible);

  const close = useCallback(() => {
    rememberDismissed();
    setOpen(false);
  }, []);

  const install = useCallback(async () => {
    if (!event) return;
    // Closing first keeps the app's modal from sitting under the browser's own
    // install dialog; the choice is recorded either way.
    rememberDismissed();
    setOpen(false);
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  }, [event]);

  if (!visible) return null;

  return (
    <Modal
      open
      title={t('install.title')}
      onCancel={close}
      getContainer={getModalContainer}
      width={440}
      centered
      footer={[
        <Button key="later" id="install-later" onClick={close}>
          {t('install.later')}
        </Button>,
        <Button
          key="install"
          id="install-accept"
          type="primary"
          icon={<FiDownloadCloud aria-hidden />}
          onClick={() => void install()}
        >
          {t('install.install')}
        </Button>,
      ]}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text type="secondary">{t('install.intro')}</Typography.Text>
        <Benefit icon={<FiWifiOff aria-hidden />} text={t('install.offline')} />
        <Benefit icon={<FiLock aria-hidden />} text={t('install.private')} />
        <Benefit icon={<FiSmartphone aria-hidden />} text={t('install.quick')} />
      </Space>
    </Modal>
  );
}
