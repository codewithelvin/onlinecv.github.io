import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { A4Frame } from '../preview/A4Frame';
import { ContactModal } from './modals/ContactModal';
import { EditorPanel } from './EditorPanel';

/**
 * Where Microsoft Clarity's session replays may look, and where they may not.
 *
 * The line moved twice. On 2026-08-29 it was pulled back to the rendered CV so
 * that replays would show what people TYPE instead of dots; on 2026-08-31 that
 * was undone, because Clarity cannot do it: *"Content in the input boxes is
 * masked in all modes and can't be customized"* — the same sentence answers the
 * FAQ's "Can I unmask input text boxes?", and drop-downs are named alongside.
 * No mode, attribute or dashboard rule changes it.
 *
 * So `data-clarity-unmask` bought no keystroke at all, and it was not free: the
 * only thing it reached was the ORDINARY TEXT around the fields, which in the
 * editor is the item lists — employer, school, phone number, e-mail. That is CV
 * content, and the app's promise (§18/BR-3, and the landing page) is that the CV
 * stays on the device. Hence the guards below: the two masks are still in place,
 * and the app ships no unmask anywhere.
 */

describe('Clarity recording of the editor', () => {
  function seed(): void {
    const resume = createEmptyResume('az');
    resume.basics.firstName = 'Elvin';
    resume.basics.lastName = 'Hüseynov';
    resume.generalInfo.gender = 'male';
    resume.generalInfo.nationality = 'azerbaijani';
    useResumeStore.setState({ resume, uiLocale: 'az', hydrated: true, persistenceError: false });
  }

  it('leaves the editor on Clarity’s own masking, with nothing unmasked', () => {
    seed();
    const { container } = renderWithProviders(<EditorPanel />);
    // The panel really rendered — otherwise "no unmask" is vacuously true.
    expect(container.querySelector('#basics-firstName'), 'no first-name field').toBeTruthy();
    expect(container.querySelectorAll('[data-clarity-unmask]')).toHaveLength(0);
  });

  /**
   * A modal renders through a portal, so it is not a DOM descendant of the
   * editor panel: `ModalForm` wraps its own body and would have to be undone
   * separately. Asserted on one modal because that shared shell is the subject.
   */
  it('leaves an item modal on Clarity’s own masking too', () => {
    seed();
    renderWithProviders(
      <ContactModal
        open
        title="Əlaqə vasitələri"
        defaultValues={{ type: 'phone', value: '+994501234567' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(document.querySelector('.ant-modal'), 'the modal did not open').toBeTruthy();
    expect(document.querySelectorAll('[data-clarity-unmask]')).toHaveLength(0);
  });

  /**
   * The invariant the DOM cases above cannot hold on their own: an unmask added
   * to a component neither of them renders is invisible to them, and the whole
   * point is that unmasking a *form* subtree looks harmless and leaks the text
   * beside it. So the source itself is the assertion — the same
   * `import.meta.glob(…, '?raw')` mechanism `consent.test.ts` uses, since
   * `@types/node` is deliberately not a dependency (§27). Comment lines are
   * stripped, because `analytics.ts` and `fields.tsx` both name the attribute in
   * prose precisely to warn about it.
   */
  it('ships no unmask attribute anywhere in the app', () => {
    const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

    const offenders = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path))
      .filter(([, code]) =>
        code
          .split('\n')
          .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
          .join('\n')
          .includes('clarity-unmask'),
      )
      .map(([path]) => path);

    expect(Object.keys(sources).length).toBeGreaterThan(50);
    expect(
      offenders,
      'Clarity cannot unmask an input; an unmask only leaks the text around it',
    ).toEqual([]);
  });
});

describe('Clarity masking of the rendered CV', () => {
  it('keeps the avatar out of replays', () => {
    const resume = createEmptyResume('az');
    useResumeStore.setState({ resume, uiLocale: 'az', hydrated: true, persistenceError: false });
    const { container } = renderWithProviders(<EditorPanel />);
    expect(container.querySelector('[data-clarity-mask]'), 'the avatar lost its mask').toBeTruthy();
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
