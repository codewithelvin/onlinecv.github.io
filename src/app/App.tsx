import { type JSX, useEffect, useMemo } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import { I18nextProvider } from 'react-i18next';
import { LOCALES, i18n } from './i18n';
import { themeFor } from './theme';
import { updateSeo } from './seo';
import { useResumeStore } from '../state/store';
import { applyStoredConsent } from '../services/consent';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
import { PersistenceBanner } from '../components/PersistenceBanner';
import { PwaUpdatePrompt } from '../components/PwaUpdatePrompt';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt';
import { ConsentDrawer } from '../components/ConsentDrawer';
import { HelpMount } from '../features/help/HelpMount';
import { HomePage } from '../pages/HomePage';

/**
 * App root (spec §7): providers (AntD theme + locale, i18n), store hydration,
 * analytics consent, SEO, error boundary, and the offline/update banners.
 */
export function App(): JSX.Element {
  const uiLocale = useResumeStore((s) => s.uiLocale);
  const hydrate = useResumeStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    /**
     * NOT `initAnalytics()` — a first-time visitor has agreed to nothing yet, so
     * this starts the tags only if a previous visit said yes. The drawer starts
     * them the moment consent is given. See `services/consent`.
     */
    applyStoredConsent();
  }, [hydrate]);

  useEffect(() => {
    updateSeo(uiLocale);
  }, [uiLocale]);

  /**
   * Rebuilt per language, not per render: the theme object's identity is what
   * AntD hashes its generated CSS on, so a fresh one every render would re-emit
   * every component style. The stack itself changes with the language because
   * Japanese and Chinese compete for the same code points — see `uiFontFamily`.
   */
  const theme = useMemo(() => themeFor(uiLocale), [uiLocale]);

  return (
    <I18nextProvider i18n={i18n}>
      <ConfigProvider
        theme={theme}
        locale={LOCALES[uiLocale].antd}
        direction={LOCALES[uiLocale].dir}
      >
        <AntdApp>
          <ErrorBoundary>
            <PwaUpdatePrompt />
            <OfflineBanner />
            <PersistenceBanner />
            <HomePage />
            {/* Before the install screen: consent is the one thing that must be
                answered on a first visit, and it is what decides whether
                anything is collected at all. */}
            <ConsentDrawer />
            {/* Mounted at the root rather than inside a screen, because it opens
                over BOTH the wizard and the editor (spec §10.4) and must survive
                the transition between them. Renders nothing until first opened. */}
            <HelpMount />
            {/* After the page, so the install screen can gate itself on the
                first-run wizard being done. */}
            <PwaInstallPrompt />
          </ErrorBoundary>
        </AntdApp>
      </ConfigProvider>
    </I18nextProvider>
  );
}
