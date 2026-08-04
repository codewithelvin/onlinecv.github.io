import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { EducationModal } from './EducationModal';
import { ExperienceModal } from './ExperienceModal';
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

  /**
   * Opting out of AntD's portal-based lock means the app owns scroll-locking
   * itself, on the ROOT element rather than `<body>` (see `hooks/useScrollLock`);
   * without it the page behind a full-screen mobile modal stayed scrollable.
   */
  it('locks background scrolling while open and releases it on unmount', () => {
    const { unmount } = renderWithProviders(
      <SkillModal
        open
        title="Bacarıqlar"
        defaultValues={{ name: 'TypeScript', level: 70 }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(document.documentElement.style.overflow).toBe('hidden');
    unmount();
    expect(document.documentElement.style.overflow).toBe('');
    // Never `<body>`: that would break the sticky header and preview pane.
    expect(document.body.style.overflow).toBe('');
  });
});

/**
 * A dictionary AutoComplete accepts free text by design (§13.1), so nothing on
 * screen used to distinguish a value that carries a dictionary CODE — and so
 * re-labels itself when the CV language changes — from one frozen as typed. QA
 * reported exactly that as "unclear whether the suggestion needed to be clicked
 * to commit". These assert the two halves of the answer: the state is visible,
 * and near-miss typing resolves instead of silently falling through to free text.
 */
describe('dictionary recognition', () => {
  const base = { open: true, title: 'Bacarıqlar', onCancel: vi.fn() };

  /** The indicator's state, waiting for the lazily-imported dictionary to land. */
  async function matchState(): Promise<string | null> {
    const flag = () => document.querySelector('[data-dictionary-match]');
    await waitFor(() => expect(flag()).toBeTruthy());
    return flag()?.getAttribute('data-dictionary-match') ?? null;
  }

  it('marks a value that resolves to a dictionary entry', async () => {
    renderWithProviders(
      <SkillModal {...base} defaultValues={{ name: 'TypeScript', level: 70 }} onSubmit={vi.fn()} />,
    );
    await waitFor(async () => expect(await matchState()).toBe('true'));
    // The tick is announced, not decorative — it is the field's only state read-out.
    expect(document.querySelector('[data-dictionary-match] svg')).toBeTruthy();
  });

  it('leaves free text unmarked, without rejecting it', async () => {
    renderWithProviders(
      <SkillModal
        {...base}
        defaultValues={{ name: 'Fərdi icad etdiyim bacarıq', level: 40 }}
        onSubmit={vi.fn()}
      />,
    );
    expect(await matchState()).toBe('false');
    expect(document.querySelector('[data-dictionary-match] svg')).toBeNull();
    // Free text is a supported value, so the input keeps it verbatim. (Queried by
    // class, not by id: the scoped `#skill-name` id comes from the `FieldScope` in
    // `EditorPanel`, and this test renders the modal on its own.)
    expect(document.querySelector<HTMLInputElement>('.ant-select-auto-complete input')?.value).toBe(
      'Fərdi icad etdiyim bacarıq',
    );
  });

  /**
   * The fold is what makes the code attach for someone typing from a keyboard
   * without `ə`/`ü`/`İ`. Before it, `findByLabel` was exact-match only and this
   * stored "suruculuk verdisleri" as free text — losing the translation the
   * dictionary exists to provide.
   */
  it('attaches the code when the label was typed without its diacritics', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <SkillModal
        {...base}
        defaultValues={{ name: 'suruculuk verdisleri', level: 60 }}
        onSubmit={onSubmit}
      />,
    );
    expect(await matchState()).toBe('true');

    await userEvent.setup().click(screen.getByText('Yadda saxla'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ code: 'driving' });
  });

  /**
   * The suffix required moving to a customize-input child, which is a different
   * rc-select code path (`ant-select-customize-input`) — so the interaction the
   * suffix exists to clarify has to be re-proven end to end: typing opens the
   * suggestions, clicking one commits it, and the tick then confirms the commit.
   */
  it('still commits a clicked suggestion, and marks it', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SkillModal {...base} defaultValues={{ name: '', level: 50 }} onSubmit={vi.fn()} />,
    );
    expect(await matchState()).toBe('false');

    const input = document.querySelector('.ant-select-auto-complete input') as HTMLInputElement;
    await user.type(input, 'TypeScr');
    const option = await waitFor(() => {
      const el = document.querySelector('.ant-select-item-option-content');
      expect(el?.textContent).toBe('TypeScript');
      return el;
    });
    await user.click(option as Element);

    expect(input.value).toBe('TypeScript');
    await waitFor(async () => expect(await matchState()).toBe('true'));
  });

  it('still prefers the exact label over a folded near-match', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <SkillModal
        {...base}
        defaultValues={{ name: 'Sürücülük vərdişləri', level: 60 }}
        onSubmit={onSubmit}
      />,
    );
    expect(await matchState()).toBe('true');
    await userEvent.setup().click(screen.getByText('Yadda saxla'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ code: 'driving' });
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

/**
 * Faculty and speciality used to be unconstrained text, which is how the
 * production data ended up with 14k distinct faculties and 16k specialities for
 * a few hundred real ones. They are dictionary typeaheads now (still free-text
 * per §13.1), so what these assert is the pair of guarantees that follow: a
 * listed value gains a CODE — the thing that re-labels it when the CV language
 * changes — and an unlisted one is still accepted.
 */
describe('EducationModal', () => {
  const base = { open: true, title: 'Təhsil', onCancel: vi.fn() };
  const university = {
    type: 'university',
    institution: 'Bakı Dövlət Universiteti',
    faculty: '',
    specialization: '',
    degree: 'bachelor',
    startDate: '2007-09',
    endDate: '2011-06',
    current: false,
    comment: '',
  };

  /** The form item that owns `label`, so per-field queries cannot cross over. */
  function field(label: string): HTMLElement {
    const item = screen.getByText(label).closest('.ant-form-item');
    expect(item).toBeTruthy();
    return item as HTMLElement;
  }

  /**
   * The dictionaries are imported lazily, so the tick starts out `false` and
   * flips once the chunk lands — assertions on it have to WAIT for the value, not
   * just for the element (a bare read passes for the wrong reason).
   */
  async function expectMatch(label: string, expected: 'true' | 'false'): Promise<void> {
    await waitFor(() =>
      expect(
        field(label)
          .querySelector('[data-dictionary-match]')
          ?.getAttribute('data-dictionary-match'),
      ).toBe(expected),
    );
  }

  const save = async (): Promise<void> => {
    await userEvent.setup().click(screen.getByText('Yadda saxla'));
  };

  it('suggests listed faculties as you type', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EducationModal {...base} defaultValues={university} onSubmit={vi.fn()} />);

    await user.type(field('Fakültə').querySelector('input') as HTMLInputElement, 'Filolo');
    const options = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.ant-select-item-option-content'));
      expect(found.length).toBeGreaterThan(0);
      return found.map((el) => el.textContent);
    });
    expect(options).toContain('Filologiya');
  });

  it('attaches a code to both fields when the values are listed', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <EducationModal
        {...base}
        defaultValues={{ ...university, faculty: 'İqtisadiyyat', specialization: 'Maliyyə' }}
        onSubmit={onSubmit}
      />,
    );
    await expectMatch('Fakültə', 'true');
    await expectMatch('Peşə (ixtisas)', 'true');

    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      facultyCode: 'economics',
      specializationCode: 'finance',
    });
  });

  /**
   * Starts from a recognized value so the wait proves the dictionary really
   * loaded, then types over it: recognition has to DROP, and the unlisted text
   * still has to be accepted and stored verbatim (§13.1 free-text fallback).
   */
  it('keeps an unlisted value and stores no code for it', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(
      <EducationModal
        {...base}
        defaultValues={{ ...university, faculty: 'İqtisadiyyat', specialization: 'Maliyyə' }}
        onSubmit={onSubmit}
      />,
    );
    await expectMatch('Fakültə', 'true');

    const input = field('Fakültə').querySelector('input') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Özüm uydurduğum fakültə');
    await expectMatch('Fakültə', 'false');

    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const values = onSubmit.mock.calls[0]?.[0];
    expect(values.faculty).toBe('Özüm uydurduğum fakültə');
    expect(values.facultyCode).toBeUndefined();
  });

  /**
   * The user's rule, and a departure from the source app: not every diploma names
   * a faculty, so requiring one only made people invent it. The speciality is on
   * every diploma, so that one stays mandatory.
   */
  it('saves a university with no faculty, but not without a speciality', async () => {
    const onSubmit = vi.fn();
    const { unmount } = renderWithProviders(
      <EducationModal
        {...base}
        defaultValues={{ ...university, specialization: 'Maliyyə' }}
        onSubmit={onSubmit}
      />,
    );
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0].faculty).toBe('');
    unmount();

    const blocked = vi.fn();
    renderWithProviders(
      <EducationModal
        {...base}
        defaultValues={{ ...university, faculty: 'İqtisadiyyat' }}
        onSubmit={blocked}
      />,
    );
    await save();
    await waitFor(() =>
      expect(field('Peşə (ixtisas)').className).toContain('ant-form-item-has-error'),
    );
    expect(blocked).not.toHaveBeenCalled();
  });
});

/**
 * Job title and city are dictionary typeaheads for the same reason the education
 * fields are — a code is what re-labels the value when the CV language changes,
 * and free text still has to be accepted for anything the list does not cover.
 */
describe('ExperienceModal', () => {
  const base = { open: true, title: 'İş təcrübəsi', onCancel: vi.fn() };
  const job = {
    position: '',
    company: 'Cybernet',
    employmentType: undefined,
    location: '',
    startDate: '2020-01-01',
    endDate: '',
    current: true,
    description: '',
    highlights: [],
  };

  function field(label: string): HTMLElement {
    const item = screen.getByText(label).closest('.ant-form-item');
    expect(item).toBeTruthy();
    return item as HTMLElement;
  }

  /** See `EducationModal` above: the tick's VALUE has to be awaited. */
  async function expectMatch(label: string, expected: 'true' | 'false'): Promise<void> {
    await waitFor(() =>
      expect(
        field(label)
          .querySelector('[data-dictionary-match]')
          ?.getAttribute('data-dictionary-match'),
      ).toBe(expected),
    );
  }

  it('attaches a code to a listed job title and a listed city', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <ExperienceModal
        {...base}
        defaultValues={{ ...job, position: 'Mühasib', location: 'Bakı' }}
        onSubmit={onSubmit}
      />,
    );
    await expectMatch('Vəzifə', 'true');
    await expectMatch('Şəhər', 'true');

    await userEvent.setup().click(screen.getByText('Yadda saxla'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      positionCode: 'accountant',
      locationCode: 'baku',
    });
  });

  it('keeps an unlisted job title verbatim, with no code', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(
      <ExperienceModal
        {...base}
        defaultValues={{ ...job, position: 'Mühasib' }}
        onSubmit={onSubmit}
      />,
    );
    await expectMatch('Vəzifə', 'true');

    const input = field('Vəzifə').querySelector('input') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Baş şüşəsilən');
    await expectMatch('Vəzifə', 'false');

    await user.click(screen.getByText('Yadda saxla'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const values = onSubmit.mock.calls[0]?.[0];
    expect(values.position).toBe('Baş şüşəsilən');
    expect(values.positionCode).toBeUndefined();
  });

  /** Cities are searched through `utils/search`, so a keyboard without `ə`/`Ş`
   *  still reaches them — the defect that once hid "İtalyan" from its own name. */
  it('finds a city typed without its Azerbaijani diacritics', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExperienceModal {...base} defaultValues={job} onSubmit={vi.fn()} />);

    await user.type(field('Şəhər').querySelector('input') as HTMLInputElement, 'seki');
    const options = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.ant-select-item-option-content'));
      expect(found.length).toBeGreaterThan(0);
      return found.map((el) => el.textContent);
    });
    expect(options).toContain('Şəki');
  });
});
