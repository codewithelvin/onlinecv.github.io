import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { calcAge } from '../../utils/date';
import { EditorPanel } from './EditorPanel';

/** The AZ section titles, in the order they must appear in the accordion. */
const SECTION_ORDER = [
  // "Ümumi məlumat" is not a panel of its own — it was folded into
  // "Əsas məlumatlar", which now covers the whole personal-details block.
  'Əsas məlumatlar',
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

  /**
   * A label belongs to the control beneath it, and antd's default 8px gap reads
   * as a separator instead — badly, in an accordion that stacks a dozen
   * label/control pairs. The tokens live in `app/theme.ts`; asserted on the CSS
   * antd actually emits, so renaming or dropping a token is caught rather than
   * just restating the constant.
   */
  it('keeps labels tight against their controls', () => {
    renderWithProviders(<EditorPanel />);
    const css = [...document.querySelectorAll('style')]
      .map((el) => el.textContent ?? '')
      .join('');
    expect(css, 'antd is still emitting its 8px vertical label padding').not.toContain(
      'padding:0 0 8px',
    );
    expect(css).toContain('padding:0 0 2px');
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

  /**
   * Test automation addresses controls by id, so the ids are part of the app's
   * contract with QA: scoped to their section, derived from the field name, and
   * NOT React's render-order-dependent `useId` output. Both properties are
   * asserted here — a `:r3:`-style id leaking back in would break every
   * recorded selector.
   */
  describe('QA automation ids', () => {
    const EXPECTED = [
      'basics-firstName',
      'basics-lastName',
      'basics-headline',
      'basics-location',
      'generalInfo-gender',
      'generalInfo-maritalStatus',
      'generalInfo-nationality',
      'generalInfo-dateOfBirth',
      'generalInfo-summary',
      'contact-email',
      'contact-add',
      'experience-add',
    ];

    it('gives every control a stable, scoped id', () => {
      const { container } = renderWithProviders(<EditorPanel />);
      for (const id of EXPECTED) {
        expect(container.querySelector(`#${id}`), `missing #${id}`).toBeTruthy();
      }
    });

    it('labels point at those ids rather than generated ones', () => {
      const { container } = renderWithProviders(<EditorPanel />);
      const targets = [...container.querySelectorAll('.ant-form-item-label label')].map((l) =>
        l.getAttribute('for'),
      );
      expect(targets.length).toBeGreaterThan(8);
      for (const target of targets) {
        expect(target, 'a label has no for=').toBeTruthy();
        expect(target, `"${target}" looks like a generated React id`).not.toMatch(/^:r/);
      }
    });

    it('never issues the same id twice', () => {
      const { container } = renderWithProviders(<EditorPanel />);
      const ids = [...container.querySelectorAll('[id]')].map((el) => el.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  /**
   * The derived age reads out inside the date picker rather than as a hint under
   * it: it describes the value, not the field. The empty case matters as much as
   * the filled one — antd renders its calendar icon whenever `suffixIcon` is
   * `undefined`, so "no age" must leave that icon in place instead of an empty
   * slot or a stray "Yaş: null".
   */
  describe('age read-out', () => {
    const pickerOf = (container: HTMLElement): Element | null | undefined =>
      container.querySelector('#generalInfo-dateOfBirth')?.closest('.ant-picker');

    it('shows no age, and keeps the calendar icon, until a date is picked', () => {
      const { container } = renderWithProviders(<EditorPanel />);
      expect(container.querySelector('#generalInfo-dateOfBirth-age')).toBeNull();
      expect(pickerOf(container)?.querySelector('.ant-picker-suffix svg')).toBeTruthy();
    });

    it('puts the age in the picker suffix, not under the field', () => {
      useResumeStore.getState().updateGeneralInfo({ dateOfBirth: '2000-01-01' });
      const { container } = renderWithProviders(<EditorPanel />);

      const age = container.querySelector('#generalInfo-dateOfBirth-age');
      expect(age?.textContent).toBe(`Yaş: ${calcAge('2000-01-01')}`);
      expect(age?.closest('.ant-picker-suffix'), 'age is outside the suffix slot').toBeTruthy();
      // The `extra` slot under the field is where the age used to live and now
      // holds the "show in CV" toggle, so the guard is on the age NOT being there
      // rather than on the slot being empty.
      const item = container.querySelector('#generalInfo-dateOfBirth')?.closest('.ant-form-item');
      expect(
        item?.querySelector('.ant-form-item-extra')?.textContent ?? '',
        'age is still rendered under the field',
      ).not.toContain('Yaş');
    });
  });

  /**
   * QA reported that reaching a birth year cost eight to ten decade/year pagings.
   * Two things fix that, and both are properties of the rendered field rather than
   * of a helper: the format is advertised, so the date can simply be typed, and
   * the panel opens a generation back instead of on today.
   */
  describe('date of birth entry', () => {
    it('advertises the typeable format as its placeholder', () => {
      const { container } = renderWithProviders(<EditorPanel />);
      const input = container.querySelector<HTMLInputElement>('#generalInfo-dateOfBirth');
      // Not antd's own "Select date", which reads as click-only.
      expect(input?.placeholder).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    it('opens its panel in the past, not on the current year', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<EditorPanel />);
      await user.click(container.querySelector('#generalInfo-dateOfBirth') as Element);

      const header = await waitFor(() => {
        const el = document.querySelector('.ant-picker-header-view');
        expect(el).toBeTruthy();
        return el;
      });
      const shownYear = Number((header?.textContent ?? '').match(/\d{4}/)?.[0]);
      expect(shownYear).toBeLessThan(dayjs().year());
      // Opening a VIEW must not fill the field — an untouched date stays empty.
      expect(container.querySelector<HTMLInputElement>('#generalInfo-dateOfBirth')?.value).toBe(
        '',
      );
    });
  });

  /**
   * The general-info fields moved INTO the basics panel; they must not have gone
   * missing on the way, and the ids QA automation records must not have been
   * rewritten by the move (that half is covered above, in "QA automation ids").
   */
  it('holds the general-info fields and the self-description in the basics panel', () => {
    const { container } = renderWithProviders(<EditorPanel />);

    // One panel, not two.
    const headers = [...container.querySelectorAll('.ant-collapse-header-text')].map((el) =>
      (el.textContent ?? '').trim(),
    );
    expect(headers.some((h) => h.includes('Ümumi məlumat'))).toBe(false);

    const basicsPanel = container
      .querySelector('#basics-firstName')
      ?.closest('.ant-collapse-item');
    expect(basicsPanel, 'no basics panel').toBeTruthy();
    for (const id of ['generalInfo-gender', 'generalInfo-nationality', 'generalInfo-summary']) {
      expect(basicsPanel?.querySelector(`#${id}`), `#${id} is outside the basics panel`).toBeTruthy();
    }

    // No standalone "Haqqımda" accordion any more…
    expect(screen.queryByText('Haqqımda')).toBeNull();
    // …and the summary textarea is rendered (basics is open by default).
    expect(screen.getByText('Özünüzü qısa təsvir edin')).toBeTruthy();
  });
});
