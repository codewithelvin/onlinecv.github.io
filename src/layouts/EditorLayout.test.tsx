import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { useResumeStore } from '../state/store';
import { createEmptyResume } from '../utils/empty-resume';
import { EditorLayout } from './EditorLayout';

/**
 * The shared test `matchMedia` answers `false` to everything, so this renders in
 * the `< lg` layout — the tabbed editor plus the bottom action bar, which is
 * exactly what is asserted below.
 */
describe('EditorLayout on a phone', () => {
  beforeEach(() => {
    const resume = createEmptyResume('az');
    resume.basics.firstName = 'Elvin';
    resume.basics.lastName = 'Huseynov';
    resume.contact.email = 'elvin@example.az';
    useResumeStore.setState({ resume, uiLocale: 'az', hydrated: true, persistenceError: false });
  });

  /**
   * Two tabs and nothing else on the row: without a glyph, "Redaktə" and
   * "Önizləmə" are two words of similar length that have to be read to be told
   * apart. The icon has to sit BEFORE the title, so its DOM position is asserted
   * as well as its presence.
   */
  it('puts an icon before each tab title', () => {
    const { container } = renderWithProviders(<EditorLayout />);

    for (const [key, title] of [
      ['edit', 'Redaktə'],
      ['preview', 'Önizləmə'],
    ]) {
      const tab = container.querySelector(`#editorTabs-tab-${key}`) as HTMLElement;
      expect(tab, `no #editorTabs-tab-${key}`).toBeTruthy();
      expect(tab.textContent).toContain(title);

      const icon = tab.querySelector('svg');
      expect(icon, `the "${title}" tab has no icon`).toBeTruthy();

      /*
       * The label box holds the glyph and the title, in that order. rc-tabs also
       * puts a screen-reader-only "Tab 1 of 2" span inside the tab, so the box is
       * identified by holding the icon rather than by position.
       */
      const label = [...tab.querySelectorAll('span')].find(
        (el) => el.contains(icon as Node) && el.textContent === title,
      );
      expect(label, `no icon+title box in the "${title}" tab`).toBeTruthy();
      const [glyph, ...rest] = [...(label as HTMLElement).childNodes];
      expect((glyph as HTMLElement).contains(icon as Node), 'the title comes first').toBe(true);
      expect(rest.map((node) => node.textContent).join('')).toBe(title);
    }
  }, 30_000);

  /**
   * Every action in the bar names itself in words, icon-only buttons having been
   * a guessing game. The room comes from the export button's short label — see
   * the bar's own comment — and `flex-wrap` is what keeps the row off the
   * horizontal scrollbar on the narrowest phones.
   */
  it('labels all three buttons in the action bar', () => {
    const { container } = renderWithProviders(<EditorLayout />);
    const bar = container.querySelector('#action-bar') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.flexWrap).toBe('wrap');

    for (const [id, label] of [
      ['template-picker-compact', 'Şablonlar'],
      ['reset-cv', 'Sıfırla'],
      ['export-pdf', 'PDF'],
    ]) {
      const button = bar.querySelector(`#${id}`) as HTMLElement;
      expect(button, `no #${id} in the action bar`).toBeTruthy();
      expect(button.textContent?.trim()).toBe(label);
      expect(button.querySelector('svg'), `#${id} lost its icon`).toBeTruthy();
    }

    // The shortened primary keeps the full sentence as its accessible name.
    expect(bar.querySelector('#export-pdf')?.getAttribute('aria-label')).toBe('PDF kimi endir');
  }, 30_000);

  /**
   * Reset throws away the whole CV, so it is the one button in the bar that must
   * not look like its neighbours: red outline, never a red fill (a filled red
   * beside the filled blue export would read as a second primary action).
   */
  it('marks reset as destructive without turning it into a second primary', () => {
    const { container } = renderWithProviders(<EditorLayout />);
    const reset = container.querySelector('#action-bar #reset-cv') as HTMLElement;

    expect(reset.classList.contains('ant-btn-dangerous')).toBe(true);
    expect(reset.classList.contains('ant-btn-primary')).toBe(false);
    // The export button beside it stays the only filled one.
    const exportBtn = container.querySelector('#action-bar #export-pdf') as HTMLElement;
    expect(exportBtn.classList.contains('ant-btn-primary')).toBe(true);
    expect(exportBtn.classList.contains('ant-btn-dangerous')).toBe(false);
  }, 30_000);
});
