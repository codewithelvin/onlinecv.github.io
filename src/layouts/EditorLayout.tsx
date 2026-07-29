import type { JSX } from 'react';
import { Layout, Space, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../hooks/useResponsive';
import { Brand } from '../components/Brand';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { TemplatePicker } from '../features/templates/TemplatePicker';
import { ExportButton } from '../features/export/ExportButton';
import { ResetButton } from '../features/reset/ResetButton';
import { EditorPanel } from '../features/editor/EditorPanel';
import { PreviewPane } from '../features/preview/PreviewPane';

const { Header, Content } = Layout;
const MAX_WIDTH = 1600;

/** Editor + preview layout: two-pane on `≥ lg`, tabbed with a bottom action bar on `< lg` (§10.3). */
export function EditorLayout(): JSX.Element {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 16px',
          paddingTop: 'env(safe-area-inset-top)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Brand />
        <Space wrap style={{ minWidth: 0, justifyContent: 'flex-end' }}>
          <LanguageSwitcher />
          {isDesktop ? (
            <>
              <TemplatePicker />
              <ResetButton />
              <ExportButton />
            </>
          ) : null}
        </Space>
      </Header>

      <Content style={{ padding: 16, minWidth: 0 }}>
        <div style={{ maxWidth: MAX_WIDTH, margin: '0 auto' }}>
          {isDesktop ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 45%', minWidth: 0 }}>
                <EditorPanel />
              </div>
              <div
                style={{
                  flex: '1 1 55%',
                  minWidth: 0,
                  position: 'sticky',
                  top: 80,
                  maxHeight: 'calc(100vh - 96px)',
                  overflowY: 'auto',
                }}
              >
                <PreviewPane />
              </div>
            </div>
          ) : (
            <Tabs
              defaultActiveKey="edit"
              items={[
                { key: 'edit', label: t('header.edit'), children: <EditorPanel /> },
                { key: 'preview', label: t('header.preview'), children: <PreviewPane /> },
              ]}
            />
          )}
        </div>
      </Content>

      {!isDesktop ? (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            gap: 8,
            padding: 12,
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            zIndex: 10,
          }}
        >
          {/* Icon-only secondaries here: with their labels, the three buttons
              overflow a narrow phone and force the page to scroll sideways. */}
          <TemplatePicker compact />
          <ResetButton compact />
          <div style={{ flex: 1, minWidth: 0 }}>
            <ExportButton block />
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
