import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExperienceItem, Resume } from '../../types/resume';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { EditorPanel } from './EditorPanel';

/**
 * The order switch on the dated sections.
 *
 * `utils/sort-history.test.ts` owns the ordering rules and their effect on the
 * rendered CV; what is guarded here is the editor half — that the list on screen
 * is the one the CV will print, and that reaching for ↑/↓ hands the section over
 * to the user instead of being undone by the next date edit.
 */

const ORDER_SELECT = '#experience-order';
const AUTO = 'Ən yenilər əvvəl';
const MANUAL = 'Fərdi sıra';

const job = (id: string, position: string, startDate: string, endDate: string): ExperienceItem => ({
  id,
  company: `Company ${id}`,
  position,
  startDate,
  endDate,
  current: false,
});

/**
 * Typed oldest-first, which is what the sort has to correct.
 *
 * The job titles are sentinels, not real ones: `positions` is a dictionary, and
 * a section renders a stored value through `resolveLabel`, which matches free
 * text against the labels of EVERY locale. "Intern" and "Architect" are listed
 * English positions, so an Azerbaijani editor prints them as "Stajçı" and
 * "Memar" — correct behaviour that made the assertions depend on whether the
 * dictionary chunk had finished loading.
 */
const TYPED: ExperienceItem[] = [
  job('old', 'Position-oldest-4f1c', '2010-01-01', '2012-01-01'),
  job('mid', 'Position-middle-4f1c', '2015-01-01', '2017-01-01'),
  job('new', 'Position-newest-4f1c', '2020-01-01', '2022-01-01'),
];
const OLDEST = TYPED[0].position;
const MIDDLE = TYPED[1].position;
const NEWEST = TYPED[2].position;

function seed(patch: Partial<Resume> = {}): void {
  const resume = createEmptyResume('az');
  resume.basics.firstName = 'Elvin';
  resume.basics.lastName = 'Huseynov';
  resume.contact.email = 'elvin@example.az';
  resume.experience = TYPED.map((x) => ({ ...x }));
  useResumeStore.setState({
    resume: { ...resume, ...patch },
    uiLocale: 'az',
    // Reset explicitly: `openSections` is persisted store state, so a test that
    // opens a different panel would otherwise leave the next one looking at a
    // closed accordion and reading as "the section renders nothing".
    openSections: null,
    hydrated: true,
    persistenceError: false,
  });
}

const storedIds = (): string[] => useResumeStore.getState().resume.experience.map((x) => x.id);

/** The positions the editor lists, top to bottom. */
function rows(container: HTMLElement): string[] {
  return TYPED.map(() => '').map((_, i) => {
    const row = container.querySelector(`#experience-item-${i}`);
    const title = row?.querySelector('.ant-typography');
    return (title?.textContent ?? '').trim();
  });
}

/** The `.ant-select` wrapper — the id lands on rc-select's inner input. */
function orderSwitch(container: HTMLElement): HTMLElement {
  const input = container.querySelector(ORDER_SELECT);
  const select = input?.closest('.ant-select');
  if (!select) throw new Error('the order switch is not rendered');
  return select as HTMLElement;
}

/**
 * `mouseDown` on the selector, not a click on the wrapper: that is the event
 * rc-select opens on, and a `userEvent.click` higher up the tree leaves the
 * dropdown closed with no error to say so.
 */
async function choose(container: HTMLElement, label: string): Promise<void> {
  const selector = orderSwitch(container).querySelector('.ant-select-selector');
  fireEvent.mouseDown(selector!);
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(
    (el) => (el.textContent ?? '').trim() === label,
  );
  if (!option) throw new Error(`"${label}" is not offered`);
  await userEvent.setup().click(option);
}

describe('dated-section order', () => {
  beforeEach(() => seed());

  /**
   * The whole point: the store holds the typed order and the editor shows the
   * order the CV will print, so the user is never looking at a list that
   * disagrees with the preview beside it.
   */
  it('lists a history typed oldest-first newest-first', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    expect(storedIds()).toEqual(['old', 'mid', 'new']);
    expect(rows(container)).toEqual([NEWEST, MIDDLE, OLDEST]);
  });

  it('offers the switch on a dated section, showing newest-first by default', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    expect(orderSwitch(container).textContent).toContain(AUTO);
    expect(container.querySelector('[data-order-mode]')?.getAttribute('data-order-mode')).toBe(
      'auto',
    );
  });

  /**
   * Below two entries there is no order to choose, so the row would be chrome
   * explaining a decision the user cannot yet have made.
   */
  it('hides the switch until there are two entries', () => {
    seed({ experience: [TYPED[0]] });
    const { container } = renderWithProviders(<EditorPanel />);
    expect(container.querySelector(ORDER_SELECT)).toBeNull();
  });

  /**
   * Skills, languages, interests and projects carry no date, so there is nothing
   * to derive an order from and the switch would be offering a choice with only
   * one possible answer.
   */
  it('offers no switch on an undated section', () => {
    seed({
      skills: [
        { id: 's1', name: 'TypeScript', level: 90 },
        { id: 's2', name: 'React', level: 80 },
      ],
    });
    useResumeStore.setState({ openSections: ['skills'] });
    const { container } = renderWithProviders(<EditorPanel />);
    expect(container.querySelector('#skills-order')).toBeNull();
    // …but its ↑/↓ controls are still there: that order IS the user's to make.
    expect(container.querySelector('#skills-item-0-down')).toBeTruthy();
  });

  /**
   * The move the user can SEE, committed. Pressing ↓ on the top row of a sorted
   * list has to move that row down — the row they pressed, not whichever entry
   * happens to be first in the stored array — which is why the button commits
   * the whole visible order rather than a pair of indices.
   */
  it('commits the visible order when ↑/↓ is used on a sorted section', async () => {
    const { container } = renderWithProviders(<EditorPanel />);
    expect(rows(container)).toEqual([NEWEST, MIDDLE, OLDEST]);

    await userEvent.setup().click(container.querySelector('#experience-item-0-down')!);

    // The row the user pressed went down one, and the section is now theirs.
    expect(storedIds()).toEqual(['mid', 'new', 'old']);
    expect(useResumeStore.getState().resume.manualOrder).toEqual(['experience']);
    expect(rows(container)).toEqual([MIDDLE, NEWEST, OLDEST]);
    expect(container.querySelector('[data-order-mode]')?.getAttribute('data-order-mode')).toBe(
      'manual',
    );
  });

  it('freezes the sorted order when switched to a custom one', async () => {
    const { container } = renderWithProviders(<EditorPanel />);
    await choose(container, MANUAL);

    // Nothing on screen moves — the order that was derived is now the stored one,
    // so the switch is a handover rather than a rearrangement.
    expect(storedIds()).toEqual(['new', 'mid', 'old']);
    expect(rows(container)).toEqual([NEWEST, MIDDLE, OLDEST]);
    expect(useResumeStore.getState().resume.manualOrder).toEqual(['experience']);
  });

  /**
   * And back again. The stored arrangement is deliberately left alone, so a user
   * who looks at newest-first and returns to their own order still has it.
   */
  it('returns to newest-first without discarding the hand-made order', async () => {
    seed({ manualOrder: ['experience'] });
    const { container } = renderWithProviders(<EditorPanel />);
    expect(rows(container)).toEqual([OLDEST, MIDDLE, NEWEST]);

    await choose(container, AUTO);
    expect(rows(container)).toEqual([NEWEST, MIDDLE, OLDEST]);
    expect(useResumeStore.getState().resume.manualOrder).toEqual([]);
    expect(storedIds()).toEqual(['old', 'mid', 'new']);
  });

  /**
   * Editing and deleting take an index into the DISPLAYED list, so a sorted
   * section is where an off-by-one would send the user to the wrong entry — the
   * class of bug that makes someone delete a job they did not mean to.
   */
  it('edits and removes the row that was actually clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<EditorPanel />);

    // Row 0 is the newest job, which is stored LAST. Found by its VALUE rather
    // than by a field id — the position input is an AutoComplete, and antd's
    // customize-input puts the id somewhere other than the element holding it.
    await user.click(container.querySelector('#experience-item-0-edit')!);
    expect(screen.getByDisplayValue(NEWEST)).toBeTruthy();
    await user.click(document.querySelector('#experience-cancel')!);

    await user.click(container.querySelector('#experience-item-0-delete')!);
    await user.click(document.querySelector('#experience-item-0-delete-confirm')!);
    expect(storedIds()).toEqual(['old', 'mid']);
  });
});
