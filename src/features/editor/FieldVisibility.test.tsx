import { beforeEach, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { HIDEABLE_FIELDS } from '../../utils/field-visibility';
import { EditorPanel } from './EditorPanel';

/**
 * The "show in CV" toggles in the personal-details panel.
 *
 * Each one sits in its own field's `extra` slot, so the ids are the field's plus
 * `-visible` — the same QA-id contract the controls follow, extended rather than
 * replaced. The behaviour that matters is that unchecking takes the field OFF the
 * CV while leaving the value in the editor, which is what makes it different from
 * clearing the field.
 */

/** Which `FieldScope` each toggle is rendered in — the field's own scope. */
const SCOPE: Record<string, string> = {
  avatar: 'basics',
  location: 'basics',
  gender: 'generalInfo',
  maritalStatus: 'generalInfo',
  nationality: 'generalInfo',
  dateOfBirth: 'generalInfo',
  militaryStatus: 'generalInfo',
  driverLicense: 'generalInfo',
  summary: 'generalInfo',
};

const toggleId = (field: string): string => `#${SCOPE[field]}-${field}-visible`;

describe('field visibility toggles', () => {
  beforeEach(() => {
    const resume = createEmptyResume('az');
    resume.basics.firstName = 'Elvin';
    resume.basics.lastName = 'Huseynov';
    resume.contact.email = 'elvin@example.az';
    resume.generalInfo.dateOfBirth = '1990-05-04';
    resume.summary = 'Experienced developer.';
    useResumeStore.setState({ resume, uiLocale: 'az', hydrated: true, persistenceError: false });
  });

  it('offers a toggle for every hideable field', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    // The avatar's appears only once there is a photo — see its own case below.
    for (const field of HIDEABLE_FIELDS.filter((f) => f !== 'avatar')) {
      expect(container.querySelector(toggleId(field)), `${field} has no toggle`).toBeTruthy();
    }
  });

  it('offers none for the name, surname or CV title', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    for (const field of ['firstName', 'lastName', 'headline']) {
      expect(container.querySelector(`#basics-${field}-visible`)).toBeNull();
    }
  });

  it('starts checked, since a resume with no choices recorded shows everything', () => {
    const { container } = renderWithProviders(<EditorPanel />);
    const box = container.querySelector<HTMLInputElement>(toggleId('summary'));
    expect(box?.checked).toBe(true);
    expect(box?.dataset.fieldVisible).toBe('true');
  });

  it('takes the field off the CV and leaves the value in the editor', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<EditorPanel />);

    await user.click(container.querySelector<HTMLInputElement>(toggleId('summary'))!);

    expect(useResumeStore.getState().resume.hiddenFields).toEqual(['summary']);
    expect(useResumeStore.getState().resume.summary).toBe('Experienced developer.');
    expect(container.querySelector<HTMLInputElement>(toggleId('summary'))?.checked).toBe(false);
    // The textarea still holds it, so the CV can get it back with one click.
    expect(container.querySelector<HTMLTextAreaElement>('#generalInfo-summary')?.value).toBe(
      'Experienced developer.',
    );
  });

  it('re-checking removes the field from hiddenFields rather than piling up', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<EditorPanel />);
    const box = (): HTMLInputElement =>
      container.querySelector<HTMLInputElement>(toggleId('gender'))!;

    await user.click(box());
    expect(useResumeStore.getState().resume.hiddenFields).toEqual(['gender']);
    await user.click(box());
    expect(useResumeStore.getState().resume.hiddenFields).toEqual([]);
  });

  it('tracks each field independently', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<EditorPanel />);

    await user.click(container.querySelector<HTMLInputElement>(toggleId('dateOfBirth'))!);
    await user.click(container.querySelector<HTMLInputElement>(toggleId('driverLicense'))!);

    expect(useResumeStore.getState().resume.hiddenFields).toEqual(['dateOfBirth', 'driverLicense']);
    expect(container.querySelector<HTMLInputElement>(toggleId('nationality'))?.checked).toBe(true);
  });

  /**
   * "Show in CV" says nothing about an empty avatar slot, so the toggle waits for a
   * photo. Once there is one it is the non-destructive alternative to Remove.
   */
  it('shows the photo toggle only once a photo has been added', () => {
    const withoutPhoto = renderWithProviders(<EditorPanel />);
    expect(withoutPhoto.container.querySelector(toggleId('avatar'))).toBeNull();
    withoutPhoto.unmount();

    useResumeStore.getState().setAvatar('data:image/jpeg;base64,AAAA');
    const withPhoto = renderWithProviders(<EditorPanel />);
    expect(withPhoto.container.querySelector(toggleId('avatar'))).toBeTruthy();
  });
});
