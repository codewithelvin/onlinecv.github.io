import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { ContactModal } from './modals/ContactModal';
import { EditorPanel } from './EditorPanel';

/**
 * Microsoft Clarity records session replays, and the app's promise (§18/BR-3) is
 * that the CV never leaves the device. Clarity masks `<input>`/`<textarea>`
 * values by default — but Ant Design renders a CHOSEN `Select` value as ordinary
 * DOM text (`.ant-select-selection-item`), so every pick was readable in a
 * replay: gender, marital status, military status, licence categories, and every
 * dictionary-backed pick in the modals.
 *
 * The dashboard's `Strict` mode would cover the whole class, but it is off by
 * decision — it masks every text node, which leaves a replay unreadable. So the
 * coverage lives in code, and this is what stops it rotting the first time
 * someone adds a select: a value rendered outside `[data-clarity-mask]` fails
 * here rather than showing up in a recording.
 */

/** Texts of every chosen select value NOT inside a Clarity mask. */
function unmaskedSelectValues(root: ParentNode): string[] {
  return [...root.querySelectorAll('.ant-select-selection-item')]
    .filter((el) => el.closest('[data-clarity-mask]') === null)
    .map((el) => (el.textContent ?? '').trim());
}

/** How many chosen select values are rendered at all — guards a vacuous pass. */
function selectValueCount(root: ParentNode): number {
  return root.querySelectorAll('.ant-select-selection-item').length;
}

describe('Clarity masking of chosen Select values', () => {
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

  it('masks every general-info pick in the editor', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    // gender + marital + military + two licence chips.
    expect(selectValueCount(container)).toBeGreaterThanOrEqual(5);
    expect(unmaskedSelectValues(container)).toEqual([]);
  });

  /**
   * Nationality is an `AutoComplete`, so its value sits in an `<input>` rather
   * than in a selection item — the scan above cannot see it, and it is personal
   * data all the same.
   */
  it('masks the nationality typeahead', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    const field = container.querySelector('#generalInfo-nationality');
    expect(field, 'no nationality field').toBeTruthy();
    expect(field?.closest('[data-clarity-mask]')).toBeTruthy();
  });

  /**
   * Modal fields are bound through `RHFSelect`, which carries the mask itself —
   * asserted on one modal because it is the shared component that is being
   * proven, not this particular field. Modals render through a portal, hence
   * `document`.
   */
  it('masks a value chosen through RHFSelect', () => {
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
    expect(unmaskedSelectValues(document)).toEqual([]);
  });
});
