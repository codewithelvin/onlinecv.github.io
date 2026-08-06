import { type JSX, useCallback, useEffect, useState } from 'react';
import { Alert, Button, Drawer, Layout, Space, Typography } from 'antd';
import { FiBarChart2, FiLock, FiShield } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../state/store';
import { useResponsive } from '../hooks/useResponsive';
import { getModalContainer } from '../utils/modal-container';
import {
  type ConsentDecision,
  isConsentRequired,
  isConsentReviewable,
  onConsentReview,
  readConsent,
  requestConsentReview,
  setConsent,
} from '../services/consent';

/**
 * The analytics consent drawer (see `services/consent` for the why and the rules).
 *
 * A bottom drawer rather than a modal, and deliberately WITHOUT a mask: the app
 * is usable while it is open, so nothing is held hostage to an answer — but it
 * cannot be dismissed without one either (no close button, no Escape), because a
 * dismissal is not a decision and "asked once per device" only holds if the one
 * ask is answered. Analytics stays off until the Accept button is pressed.
 *
 * Reopened from the footer link, which is what makes withdrawing consent as easy
 * as giving it.
 */

/** Reading width for the notice — a full-bleed line of text on a 4K screen is unreadable. */
const CONTENT_WIDTH = 760;

/**
 * The same column, applied to the drawer's own header and footer.
 *
 * `+ 48` is AntD's 24px inline padding on both of those elements: capping them at
 * the content width alone would indent the title and the buttons by another 24px
 * and leave the notice looking like three differently-aligned blocks. Centred
 * this way, title, text and buttons share one left and one right edge.
 */
const PANEL_COLUMN = {
  maxWidth: CONTENT_WIDTH + 48,
  marginInline: 'auto',
  width: '100%',
} as const;

function Point({ icon, children }: { icon: JSX.Element; children: string }): JSX.Element {
  return (
    <Space align="start" size={10}>
      <span style={{ display: 'inline-flex', fontSize: 16, lineHeight: '22px' }}>{icon}</span>
      <Typography.Text type="secondary">{children}</Typography.Text>
    </Space>
  );
}

export function ConsentDrawer(): JSX.Element | null {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  const hydrated = useResumeStore((s) => s.hydrated);

  const [open, setOpen] = useState(() => isConsentRequired());
  const [decision, setDecision] = useState<ConsentDecision | null>(() => readConsent());
  /**
   * True only when consent was withdrawn in THIS page load, i.e. while the tags
   * were already running. `disableAnalytics` is best-effort against a script that
   * is already in the document, so that — and only that — case earns the "reload
   * to finish it" line. A first-visit refusal loads nothing at all.
   */
  const [reloadPending, setReloadPending] = useState(false);

  useEffect(
    () =>
      onConsentReview(() => {
        setDecision(readConsent());
        setReloadPending(false);
        setOpen(true);
      }),
    [],
  );

  const choose = useCallback(
    (next: ConsentDecision) => {
      setConsent(next);
      setReloadPending(decision === 'granted' && next === 'denied');
      setDecision(next);
      // Agreeing needs no confirmation screen — the drawer's job is done. A
      // refusal stays open to say what that means (the "own risk" notice).
      if (next === 'granted') setOpen(false);
    },
    [decision],
  );

  const close = useCallback(() => setOpen(false), []);

  // Not shown over the loading spinner: until the store has hydrated there is no
  // app behind it, and a drawer over a blank page reads as a broken load.
  if (!isConsentReviewable() || !open || !hydrated) return null;

  const asking = decision === null;
  const buttonProps = isMobile ? ({ block: true, size: 'large' } as const) : {};

  return (
    <Drawer
      open
      id="consent-drawer"
      placement="bottom"
      height="auto"
      /* No mask: this is a notice, not a gate — the editor stays usable behind it. */
      mask={false}
      closable={!asking}
      keyboard={!asking}
      onClose={close}
      getContainer={getModalContainer}
      title={
        <Space size={8}>
          <span style={{ display: 'inline-flex', fontSize: 16 }}>
            <FiShield aria-hidden />
          </span>
          {t('consent.title')}
        </Space>
      }
      styles={{
        header: { ...PANEL_COLUMN, borderBottom: 'none', paddingBottom: 0 },
        body: { paddingTop: 12 },
        footer: { ...PANEL_COLUMN, borderTop: 'none' },
      }}
      footer={
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column-reverse' : 'row',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          {asking ? (
            <>
              <Button id="consent-decline" onClick={() => choose('denied')} {...buttonProps}>
                {t('consent.decline')}
              </Button>
              <Button
                id="consent-accept"
                type="primary"
                onClick={() => choose('granted')}
                {...buttonProps}
              >
                {t('consent.accept')}
              </Button>
            </>
          ) : (
            <>
              {decision === 'granted' ? (
                <Button id="consent-revoke" onClick={() => choose('denied')} {...buttonProps}>
                  {t('consent.revoke')}
                </Button>
              ) : (
                <Button id="consent-accept" onClick={() => choose('granted')} {...buttonProps}>
                  {t('consent.accept')}
                </Button>
              )}
              <Button id="consent-close" type="primary" onClick={close} {...buttonProps}>
                {t('common.close')}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div style={{ maxWidth: CONTENT_WIDTH, margin: '0 auto' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {asking ? (
            <>
              <Typography.Text>{t('consent.intro')}</Typography.Text>
              <Point icon={<FiBarChart2 aria-hidden />}>{t('consent.tools')}</Point>
              <Point icon={<FiLock aria-hidden />}>{t('consent.masked')}</Point>
            </>
          ) : null}

          {decision === 'granted' ? (
            <>
              <Typography.Text>{t('consent.statusGranted')}</Typography.Text>
              <Point icon={<FiLock aria-hidden />}>{t('consent.masked')}</Point>
            </>
          ) : null}

          {decision === 'denied' ? (
            <Alert
              id="consent-declined-notice"
              type="warning"
              showIcon
              message={t('consent.declinedTitle')}
              description={t('consent.declined')}
            />
          ) : null}

          {reloadPending ? <Alert type="info" showIcon message={t('consent.reloadHint')} /> : null}
        </Space>
      </div>
    </Drawer>
  );
}

/**
 * The way back to the decision, in a slim page footer.
 *
 * Renders nothing — footer included, so no empty strip is left behind — when the
 * build has no analytics ids to talk about.
 */
export function ConsentFooter(): JSX.Element | null {
  const { t } = useTranslation();
  if (!isConsentReviewable()) return null;

  return (
    <Layout.Footer
      style={{
        padding: '4px 16px calc(12px + env(safe-area-inset-bottom))',
        background: 'transparent',
        textAlign: 'center',
      }}
    >
      <Button
        id="consent-review"
        type="link"
        size="small"
        icon={<FiShield aria-hidden />}
        onClick={requestConsentReview}
      >
        {t('consent.review')}
      </Button>
    </Layout.Footer>
  );
}
