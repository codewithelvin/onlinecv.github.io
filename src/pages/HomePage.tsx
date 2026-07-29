import type { JSX } from 'react';
import { Layout, Spin } from 'antd';
import { useResumeStore } from '../state/store';
import { needsWizard } from '../utils/empty-resume';
import { Brand } from '../components/Brand';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { Wizard } from '../features/wizard/Wizard';
import { EditorLayout } from '../layouts/EditorLayout';

/** Root page (spec §7 pages): loading gate → first-run wizard → full editor. */
export function HomePage(): JSX.Element {
  const hydrated = useResumeStore((s) => s.hydrated);
  const resume = useResumeStore((s) => s.resume);

  if (!hydrated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (needsWizard(resume)) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
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
          <LanguageSwitcher />
        </Layout.Header>
        {/* Flex column so the wizard can centre itself in the remaining height. */}
        <Layout.Content style={{ display: 'flex', flexDirection: 'column' }}>
          <Wizard />
        </Layout.Content>
      </Layout>
    );
  }

  return <EditorLayout />;
}
