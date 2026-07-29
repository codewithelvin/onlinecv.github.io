import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { LanguageModal } from './LanguageModal';
import { SkillModal } from './SkillModal';

/**
 * Modal bodies render through a portal, so these queries go through `screen` /
 * `document` rather than the render container.
 */

/** Open the field whose label is `label` and read back the options it offers. */
async function openOptions(label: string): Promise<string[]> {
  const user = userEvent.setup();
  const item = screen.getByText(label).closest('.ant-form-item');
  const selector = item?.querySelector('.ant-select-selector');
  expect(selector).toBeTruthy();
  await user.click(selector as Element);
  await waitFor(() => expect(document.querySelector('.ant-select-item-option')).toBeTruthy());
  return Array.from(document.querySelectorAll('.ant-select-item-option-content')).map(
    (el) => el.textContent ?? '',
  );
}

describe('LanguageModal', () => {
  const base = { open: true, title: 'Dil bilikləri', onSubmit: vi.fn(), onCancel: vi.fn() };

  it('hides languages that are already on the CV', async () => {
    renderWithProviders(
      <LanguageModal {...base} defaultValues={{ code: '', level: 'B1' }} usedCodes={['english']} />,
    );
    // Only the first screenful is rendered (the Select virtualizes its list),
    // which is enough to prove the taken code is gone from the top of it.
    const options = await openOptions('Dil');
    expect(options.length).toBeGreaterThan(0);
    expect(options).not.toContain('İngilis dili');
    expect(options).toContain('Azərbaycan dili');
  });

  it('keeps the language of the row being edited so its level can be changed', async () => {
    renderWithProviders(
      <LanguageModal
        {...base}
        defaultValues={{ code: 'english', level: 'B1' }}
        usedCodes={['english', 'russian']}
      />,
    );
    const options = await openOptions('Dil');
    // Own code stays selectable; the other one taken is still filtered out.
    expect(options).toContain('İngilis dili');
    expect(options).not.toContain('Rus dili');
  });
});

describe('modal portal target', () => {
  /**
   * Modals must NOT portal into `<body>`: rc-portal would then lock body scroll,
   * which re-anchors the sticky preview pane off-screen and resets the page
   * scroll position. See `utils/modal-container`.
   */
  it('renders into #modal-root rather than straight into body', () => {
    renderWithProviders(
      <SkillModal
        open
        title="Bacarıqlar"
        defaultValues={{ name: 'TypeScript', level: 70 }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const host = document.getElementById('modal-root');
    expect(host).toBeTruthy();
    expect(host?.querySelector('.ant-modal-content')).toBeTruthy();
  });
});

describe('SkillModal', () => {
  it('uses a slider for the 1–100 knowledge percentage', () => {
    renderWithProviders(
      <SkillModal
        open
        title="Bacarıqlar"
        defaultValues={{ name: 'TypeScript', level: 70 }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const handle = document.querySelector('.ant-slider-handle');
    expect(handle).toBeTruthy();
    expect(handle?.getAttribute('aria-valuenow')).toBe('70');
    expect(handle?.getAttribute('aria-valuemin')).toBe('1');
    expect(handle?.getAttribute('aria-valuemax')).toBe('100');
  });
});
