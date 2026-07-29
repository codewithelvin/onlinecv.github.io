import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import { I18nextProvider } from 'react-i18next';
import { DEFAULT_LOCALE, LOCALES, i18n } from '../app/i18n';
import { themeConfig } from '../app/theme';

/** Mount a UI element with the app's providers (spec §21 shared test helper). */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(
    <I18nextProvider i18n={i18n}>
      <ConfigProvider theme={themeConfig} locale={LOCALES[DEFAULT_LOCALE].antd}>
        <AntdApp>{ui}</AntdApp>
      </ConfigProvider>
    </I18nextProvider>,
  );
}
