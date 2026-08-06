import type { JSX } from 'react';
import { Layout, Space, Spin } from 'antd';
import { useResumeStore } from '../state/store';
import { Brand } from '../components/Brand';
import { ConsentFooter } from '../components/ConsentDrawer';
import { TelegramButton } from '../components/TelegramButton';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { Wizard } from '../features/wizard/Wizard';
import { EditorLayout } from '../layouts/EditorLayout';

/** Root page (spec §7 pages): loading gate → first-run wizard → full editor. */
export function HomePage(): JSX.Element {
  const hydrated = useResumeStore((s) => s.hydrated);
  const wizardCompleted = useResumeStore((s) => s.wizardCompleted);

  if (!hydrated) {
    return (
      <div
        className="min-h-viewport"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!wizardCompleted) {
    return (
      <Layout className="min-h-viewport">
        <Layout.Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Brand />
          <Space wrap style={{ minWidth: 0, justifyContent: 'flex-end' }}>
            <TelegramButton />
            <LanguageSwitcher />
          </Space>
        </Layout.Header>
        {/* Flex column so the wizard can centre itself in the remaining height. */}
        <Layout.Content style={{ display: 'flex', flexDirection: 'column' }}>
          <Wizard />
        </Layout.Content>
        {/* The consent drawer is answered on this screen on a first visit, so the
            way back to it has to exist here too. */}
        <ConsentFooter />
      </Layout>
    );
  }

  return <EditorLayout />;
}
