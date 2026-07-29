import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { EditorPanel } from './EditorPanel';

/** The AZ section titles, in the order they must appear in the accordion. */
const SECTION_ORDER = [
  'Əsas məlumatlar',
  'Ümumi məlumat',
  'Əlaqə vasitələri',
  'İş təcrübəsi',
  'Təhsil',
  'Kurslar və sertifikatlar',
  'Bacarıqlar',
  'Dil bilikləri',
  'Layihələr',
  'Maraqlar',
];

describe('EditorPanel', () => {
  beforeEach(() => {
    const resume = createEmptyResume('az');
    resume.basics.firstName = 'Elvin';
    resume.basics.lastName = 'Huseynov';
    resume.contact.email = 'elvin@example.az';
    resume.skills = [
      { id: 's1', name: 'TypeScript', level: 90 },
      { id: 's2', name: 'React', level: 80 },
    ];
    resume.languages = [{ id: 'l1', code: 'english', name: 'English', level: 'C1' }];
    useResumeStore.setState({ resume, uiLocale: 'az', hydrated: true, persistenceError: false });
  });

  it('lists the sections in the required order', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    const headers = Array.from(container.querySelectorAll('.ant-collapse-header-text')).map((el) =>
      (el.textContent ?? '').trim(),
    );
    expect(headers).toHaveLength(SECTION_ORDER.length);
    SECTION_ORDER.forEach((title, i) => {
      expect(headers[i]).toContain(title);
    });
  });

  it('puts the expand chevron at the end of the header', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    expect(container.querySelector('.ant-collapse-icon-position-end')).toBeTruthy();
  });

  it('shows a counter of added entries next to list-section titles', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    const byTitle = (title: string): Element | undefined =>
      Array.from(container.querySelectorAll('.ant-collapse-header-text')).find((el) =>
        (el.textContent ?? '').includes(title),
      );
    // Two skills, one language, no projects yet.
    expect(byTitle('Bacarıqlar')?.querySelector('.ant-tag')?.textContent).toBe('2');
    expect(byTitle('Dil bilikləri')?.querySelector('.ant-tag')?.textContent).toBe('1');
    expect(byTitle('Layihələr')?.querySelector('.ant-tag')?.textContent).toBe('0');
    // "Əsas məlumatlar" holds no list, so it carries no counter.
    expect(byTitle('Əsas məlumatlar')?.querySelector('.ant-tag')).toBeFalsy();
  });

  it('renders every field label above its control, with required fields starred', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    const items = container.querySelectorAll('.ant-form-item');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.classList.contains('ant-form-item-vertical')).toBe(true);
      expect(item.classList.contains('ant-form-item-horizontal')).toBe(false);
    }
    // Ad / Soyad / CV başlığı are required → antd marks their labels.
    expect(container.querySelectorAll('.ant-form-item-required').length).toBeGreaterThan(0);
  });

  /**
   * Ant Design only generates an id/`for` pair for `Form.Item`s that own their
   * state via a `name`. These are layout-only (React Hook Form owns the state),
   * so `components/form/fields` supplies the id itself — without it every
   * control is nameless to a screen reader, which is a critical axe/Lighthouse
   * failure ("Form elements must have labels").
   */
  it('associates every visible label with its control', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    const labels = [...container.querySelectorAll('.ant-form-item-label label')];
    expect(labels.length).toBeGreaterThan(8);
    for (const label of labels) {
      const htmlFor = label.getAttribute('for');
      expect(htmlFor, `"${label.textContent}" has no for=`).toBeTruthy();
      expect(
        container.querySelector(`#${CSS.escape(htmlFor as string)}`),
        `nothing matches #${htmlFor} for "${label.textContent}"`,
      ).toBeTruthy();
    }
  });

  it('keeps the short self-description inside "Ümumi məlumat"', () => {
    renderWithProviders(<EditorPanel />);
    // No standalone "Haqqımda" accordion any more…
    expect(screen.queryByText('Haqqımda')).toBeNull();
    // …and the summary textarea is rendered (generalInfo is open by default).
    expect(screen.getByText('Özünüzü qısa təsvir edin')).toBeTruthy();
  });
});
