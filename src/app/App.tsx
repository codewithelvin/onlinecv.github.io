import { type JSX, useEffect, useMemo } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import { I18nextProvider } from 'react-i18next';
import { LOCALES, i18n } from './i18n';
import { themeFor } from './theme';
import { updateSeo } from './seo';
import { useResumeStore } from '../state/store';
import { initAnalytics } from '../services/analytics';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
import { PersistenceBanner } from '../components/PersistenceBanner';
import { PwaUpdatePrompt } from '../components/PwaUpdatePrompt';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt';
import { HomePage } from '../pages/HomePage';

/**
 * App root (spec §7): providers (AntD theme + locale, i18n), store hydration,
 * analytics init, SEO, error boundary, and the offline/update banners.
 */
export function App(): JSX.Element {
  const uiLocale = useResumeStore((s) => s.uiLocale);
  const hydrate = useResumeStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    initAnalytics();
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
            {/* After the page, so the install screen can gate itself on the
                first-run wizard being done. */}
            <PwaInstallPrompt />
          </ErrorBoundary>
        </AntdApp>
      </ConfigProvider>
    </I18nextProvider>
  );
}
