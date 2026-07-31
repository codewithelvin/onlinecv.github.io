import type { JSX, ReactNode } from 'react';
import { Layout, Space, Tabs } from 'antd';
import { FiEdit3, FiEye } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../hooks/useResponsive';
import { Brand } from '../components/Brand';
import { TelegramButton } from '../components/TelegramButton';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { TemplatePicker } from '../features/templates/TemplatePicker';
import { ExportButton } from '../features/export/ExportButton';
import { ResetButton } from '../features/reset/ResetButton';
import { EditorPanel } from '../features/editor/EditorPanel';
import { PreviewPane } from '../features/preview/PreviewPane';

const { Header, Content } = Layout;
const MAX_WIDTH = 1600;

/**
 * A tab's icon + title. Laid out here rather than through antd's own `icon` prop
 * on the tab: that one leaves the glyph on the text baseline and sets a 12px
 * gap, where the accordion's own `SectionHeader` — the other icon+title pair on
 * the same screen — centres it against an 8px one.
 */
function TabLabel({ icon, children }: { icon: ReactNode; children: string }): JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-flex', fontSize: 16, lineHeight: 1 }}>{icon}</span>
      {children}
    </span>
  );
}

/** Editor + preview layout: two-pane on `≥ lg`, tabbed with a bottom action bar on `< lg` (§10.3). */
export function EditorLayout(): JSX.Element {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();

  return (
    <Layout className="min-h-viewport">
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
          {/* Kept out of the `isDesktop` branch below on purpose: the community
              invite is one of the two things the mobile header still shows
              (the rest moved to the bottom action bar). */}
          <TelegramButton />
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
                className="preview-column"
                style={{
                  flex: '1 1 55%',
                  minWidth: 0,
                  position: 'sticky',
                  top: 80,
                  overflowY: 'auto',
                }}
              >
                <PreviewPane />
              </div>
            </div>
          ) : (
            <Tabs
              // Fixes the generated id prefix, so the tab buttons are
              // `#editorTabs-tab-edit` / `#editorTabs-tab-preview` rather than
              // rc-tabs' render-order-dependent `rc-tabs-0-…`.
              id="editorTabs"
              defaultActiveKey="edit"
              items={[
                {
                  key: 'edit',
                  label: <TabLabel icon={<FiEdit3 aria-hidden />}>{t('header.edit')}</TabLabel>,
                  children: <EditorPanel />,
                },
                {
                  key: 'preview',
                  label: <TabLabel icon={<FiEye aria-hidden />}>{t('header.preview')}</TabLabel>,
                  children: <PreviewPane />,
                },
              ]}
            />
          )}
        </div>
      </Content>

      {!isDesktop ? (
        <div
          id="action-bar"
          style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            /* The safety valve that lets all three buttons keep a text label: on
               a phone too narrow for one row, the export button drops to a
               second, full-width one instead of forcing the page to scroll
               sideways (its `flex-basis` below is what decides when). */
            flexWrap: 'wrap',
            gap: 8,
            padding: 12,
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            zIndex: 10,
          }}
        >
          {/* The two secondaries keep the labels they carry in the desktop
              header — icon-only, they were a guessing game. What pays for the
              room is the export button's short label (`↓ PDF` instead of
              "PDF kimi endir"), which still names the one thing it does. */}
          <TemplatePicker compact />
          <ResetButton />
          <div style={{ flex: '1 1 96px', minWidth: 0 }}>
            <ExportButton block compact />
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
