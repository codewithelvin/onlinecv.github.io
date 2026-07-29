import { type JSX, useEffect } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import { I18nextProvider } from 'react-i18next';
import { ANTD_LOCALES, i18n } from './i18n';
import { themeConfig } from './theme';
import { updateSeo } from './seo';
import { useResumeStore } from '../state/store';
import { initAnalytics } from '../services/analytics';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
import { PersistenceBanner } from '../components/PersistenceBanner';
import { PwaUpdatePrompt } from '../components/PwaUpdatePrompt';
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

  return (
    <I18nextProvider i18n={i18n}>
      <ConfigProvider theme={themeConfig} locale={ANTD_LOCALES[uiLocale]}>
        <AntdApp>
          <ErrorBoundary>
            <PwaUpdatePrompt />
            <OfflineBanner />
            <PersistenceBanner />
            <HomePage />
          </ErrorBoundary>
        </AntdApp>
      </ConfigProvider>
    </I18nextProvider>
  );
}
