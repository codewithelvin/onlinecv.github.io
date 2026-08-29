import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { A4Frame } from '../preview/A4Frame';
import { ContactModal } from './modals/ContactModal';
import { EditorPanel } from './EditorPanel';

/**
 * Where Microsoft Clarity's session replays may look, and where they may not.
 *
 * The line moved on 2026-08-29. It used to run around every piece of personal
 * data, which meant a replay was a page of dots and could not answer the one
 * question worth recording for — where a person stalls, retypes or gives up. It
 * now runs around the RENDERED CV instead: the editor's fields are recorded
 * verbatim (`CLARITY_UNMASK` on `VerticalFields`), while the preview sheet and
 * the avatar stay masked, because those are the whole document in one frame
 * rather than the keystroke being studied.
 *
 * Both halves are guarded here, and the second half is the one that rots: a
 * `CLARITY_MASK` inside the form still wins (nearest declaration does), so the
 * avatar's exemption is a real thing that a refactor can silently drop.
 */

/** Is this node recorded — inside the unmasked form, with no mask in between? */
function isRecorded(el: Element): boolean {
  return el.closest('[data-clarity-mask]') === null && el.closest('[data-clarity-unmask]') !== null;
}

/** Texts of every chosen select value Clarity would NOT record. */
function unrecordedSelectValues(root: ParentNode): string[] {
  return [...root.querySelectorAll('.ant-select-selection-item')]
    .filter((el) => !isRecorded(el))
    .map((el) => (el.textContent ?? '').trim());
}

/** How many chosen select values are rendered at all — guards a vacuous pass. */
function selectValueCount(root: ParentNode): number {
  return root.querySelectorAll('.ant-select-selection-item').length;
}

describe('Clarity recording of the editor', () => {
  beforeEach(() => {
    const resume = createEmptyResume('az');
    resume.basics.firstName = 'Elvin';
    resume.basics.lastName = 'Hüseynov';
    resume.generalInfo.gender = 'male';
    resume.generalInfo.maritalStatus = 'married';
    resume.generalInfo.militaryStatus = 'served';
    resume.generalInfo.nationality = 'azerbaijani';
    resume.generalInfo.driverLicense = ['B', 'BE'];
    useResumeStore.setState({ resume, uiLocale: 'az', hydrated: true, persistenceError: false });
  });

  /**
   * Clarity masks `<input>` values by default, so the typed fields need the
   * unmask as much as the selects do — and they are the reason it exists.
   */
  it('records what is typed into the editor’s text fields', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    const firstName = container.querySelector('#basics-firstName');
    expect(firstName, 'no first-name field').toBeTruthy();
    expect(firstName && isRecorded(firstName)).toBe(true);
  });

  it('records every general-info pick in the editor', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    // gender + marital + military + two licence chips.
    expect(selectValueCount(container)).toBeGreaterThanOrEqual(5);
    expect(unrecordedSelectValues(container)).toEqual([]);
  });

  /**
   * Nationality is an `AutoComplete`, so its value sits in an `<input>` rather
   * than in a selection item — the scan above cannot see it.
   */
  it('records the nationality typeahead', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    const field = container.querySelector('#generalInfo-nationality');
    expect(field, 'no nationality field').toBeTruthy();
    expect(field && isRecorded(field)).toBe(true);
  });

  /**
   * A modal renders through a portal, so it is NOT a DOM descendant of the
   * editor panel — it is covered only because `ModalForm` wraps its own body in
   * `VerticalFields` too. Asserted on one modal because that shared shell is
   * what is being proven, not this particular field.
   */
  it('records a value chosen inside an item modal', () => {
    renderWithProviders(
      <ContactModal
        open
        title="Əlaqə vasitələri"
        defaultValues={{ type: 'phone', value: '+994501234567' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(selectValueCount(document)).toBeGreaterThan(0);
    expect(unrecordedSelectValues(document)).toEqual([]);
  });
});

describe('Clarity masking of the rendered CV', () => {
  /**
   * The avatar sits INSIDE the unmasked form, so this also proves the override
   * direction: a mask nested in an unmask still masks.
   */
  it('keeps the avatar out of replays even inside the recorded form', () => {
    const resume = createEmptyResume('az');
    useResumeStore.setState({ resume, uiLocale: 'az', hydrated: true, persistenceError: false });
    const { container } = renderWithProviders(<EditorPanel />);
    const masked = container.querySelector('[data-clarity-mask]');
    expect(masked, 'the avatar lost its mask').toBeTruthy();
    expect(masked?.closest('[data-clarity-unmask]'), 'expected it inside the form').toBeTruthy();
  });

  it('keeps the whole preview sheet out of replays', () => {
    const { container } = renderWithProviders(
      <A4Frame>
        <p>Elvin Hüseynov</p>
      </A4Frame>,
    );
    const name = container.querySelector('p');
    expect(name?.closest('[data-clarity-mask]'), 'the preview sheet lost its mask').toBeTruthy();
  });
});
