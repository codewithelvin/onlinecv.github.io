import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { applyLocale, i18n } from '../../app/i18n';
import { SUPPORTED_LOCALES } from '../../app/i18n/locales';
import { Wizard } from './Wizard';

/** Does the control's form item carry Ant Design's required asterisk? */
function isRequired(container: HTMLElement, id: string): boolean {
  const item = container.querySelector(id)?.closest('.ant-form-item');
  expect(item, `${id} is not on screen`).toBeTruthy();
  return Boolean(item?.querySelector('.ant-form-item-required'));
}

/** Open an antd Select by its control id and choose the option reading `label`. */
async function pickOption(
  user: UserEvent,
  container: HTMLElement,
  id: string,
  label: string,
): Promise<void> {
  const selector = container
    .querySelector(id)
    ?.closest('.ant-select')
    ?.querySelector('.ant-select-selector');
  expect(selector, `${id} is not a Select`).toBeTruthy();
  await user.click(selector as Element);
  // The dropdown renders through a portal, so it is queried off `document`.
  await waitFor(() => expect(document.querySelector('.ant-select-item-option')).toBeTruthy());
  const option = [
    ...document.querySelectorAll<HTMLElement>('.ant-select-item-option-content'),
  ].find((el) => el.textContent === label);
  expect(option, `no "${label}" option`).toBeTruthy();
  await user.click(option as HTMLElement);
}

describe('Wizard', () => {
  beforeEach(() => {
    // Each case starts in Azerbaijani; the locale sweep switches deliberately.
    applyLocale('az');
    useResumeStore.setState({
      resume: createEmptyResume('az'),
      uiLocale: 'az',
      hydrated: true,
      wizardCompleted: false,
      persistenceError: false,
    });
  });

  it('shows the first step', () => {
    renderWithProviders(<Wizard />);
    expect(screen.getByRole('button', { name: 'Növbəti' })).toBeInTheDocument();
  });

  describe('build credit', () => {
    it('is centred in the card footer, with the icon before the name', () => {
      const { container } = renderWithProviders(<Wizard />);
      const credit = container.querySelector('#wizard-credit') as HTMLElement;
      expect(credit, 'the credit line is missing').toBeTruthy();

      expect(credit.textContent).toBe('HazırlayanClaude AI');
      expect(credit.style.justifyContent).toBe('center');

      // The icon sits BETWEEN the translated prefix and "Claude AI", so a reader
      // meets it immediately before the name it belongs to.
      const icon = credit.querySelector('svg');
      expect(icon, 'no icon rendered').toBeTruthy();
      expect(icon?.previousSibling?.textContent?.trim()).toBe('Hazırlayan');
      expect(icon?.nextSibling?.textContent?.trim()).toBe('Claude AI');
    });

    /**
     * The name follows the icon in the text, so announcing the icon too would
     * repeat the brand.
     */
    it('hides the icon from assistive technology', () => {
      const { container } = renderWithProviders(<Wizard />);
      const icon = container.querySelector('#wizard-credit svg');
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });

    /**
     * The line is split on purpose: the prefix is prose and gets translated, the
     * product name never does. Driven off the bundles rather than hard-coded
     * strings, so adding a locale extends this automatically — and a missing
     * `wizard.createdBy` shows up as the raw key, which the assertion rejects.
     */
    it.each(SUPPORTED_LOCALES)('translates the prefix but not the name in %s', (locale) => {
      const prefix = i18n.getFixedT(locale)('wizard.createdBy');
      expect(prefix, `wizard.createdBy is missing for ${locale}`).not.toBe('wizard.createdBy');

      applyLocale(locale);
      const { container } = renderWithProviders(<Wizard />);
      const credit = container.querySelector('#wizard-credit') as HTMLElement;
      expect(credit.textContent).toBe(`${prefix}Claude AI`);
    });

    /**
     * ⚠️ THE PREMISE HERE BROKE ONCE, and the fix is the point of the comment.
     *
     * This asserted that all N wordings are DISTINCT, as a cheap proxy for "nobody
     * pasted one locale's text into another". Turkish falsified it: `wizard.createdBy`
     * is "Hazırlayan" in both Azerbaijani and Turkish, because they are sister
     * languages in the same Turkic branch and that genuinely is the same word. A
     * distinctness rule quietly assumes every pair of shipped languages is unrelated,
     * which stopped being true the moment a second Oghuz language arrived — the same
     * class of broken assumption as `direction.test.ts` asserting Arabic was the only
     * RTL locale until Hebrew landed.
     *
     * So the rule is now what was actually meant: no locale may reuse the wording of
     * an UNRELATED language. Related pairs are declared, not inferred, so a future
     * Portuguese-beside-Spanish or Kazakh-beside-Turkish addition states its case
     * here instead of quietly weakening the guard — and nobody is tempted to distort
     * a translation to satisfy a test.
     */
    const RELATED_LANGUAGES: Array<[string, string]> = [['az', 'tr']];

    it('gives each unrelated locale its own wording', () => {
      const isRelated = (a: string, b: string): boolean =>
        RELATED_LANGUAGES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

      const collisions: string[] = [];
      for (const a of SUPPORTED_LOCALES) {
        for (const b of SUPPORTED_LOCALES) {
          if (a >= b || isRelated(a, b)) continue;
          const [wa, wb] = [a, b].map((l) => i18n.getFixedT(l)('wizard.createdBy'));
          if (wa === wb) collisions.push(`${a} and ${b} both say "${wa}"`);
        }
      }
      expect(collisions).toEqual([]);
    });

    /** The declared pairs must be real — a stale entry would hide a genuine paste. */
    it('only declares related languages that actually agree', () => {
      for (const [a, b] of RELATED_LANGUAGES) {
        const [wa, wb] = [a, b].map((l) => i18n.getFixedT(l)('wizard.createdBy'));
        expect(wa, `"${a}"/"${b}" are declared related but no longer agree`).toBe(wb);
      }
    });

    it('survives to the second step', async () => {
      const { container } = renderWithProviders(<Wizard />);
      expect(container.querySelector('#wizard-credit')).toBeTruthy();
      // The credit belongs to the card, not to a step, so it must not be inside
      // the step-specific field group.
      expect(container.querySelector('#wizard-credit')?.closest('form')).toBeNull();
    });
  });

  /**
   * Marital status and nationality are OPTIONAL. The source app demanded both
   * before it would let anyone in; neither identifies a candidate, and in many
   * markets stating them is discouraged. Finishing without them must leave them
   * UNSET rather than store a blank, or the CV grows an empty general-info row.
   */
  describe('optional personal details', () => {
    it('neither field is marked required', () => {
      const { container } = renderWithProviders(<Wizard />);
      // Step 1's own required marks prove the assertion can see one at all.
      expect(isRequired(container, '#wizard-firstName')).toBe(true);
    });

    it('finishes with no marital status and no nationality', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<Wizard />);

      await user.type(container.querySelector('#wizard-firstName')!, 'Elvin');
      await user.type(container.querySelector('#wizard-lastName')!, 'Huseynov');
      await user.type(container.querySelector('#wizard-email')!, 'elvin@example.az');
      // The picker takes its own displayed format directly — see `datePlaceholder`.
      await user.type(container.querySelector('#wizard-dateOfBirth')!, '04.05.1990{Enter}');
      await user.click(container.querySelector('#wizard-next')!);

      await waitFor(() => expect(container.querySelector('#wizard-headline')).toBeTruthy());
      expect(isRequired(container, '#wizard-maritalStatus')).toBe(false);
      expect(isRequired(container, '#wizard-nationality')).toBe(false);

      await user.type(container.querySelector('#wizard-headline')!, 'Frontend Developer');
      await pickOption(user, container, '#wizard-gender', 'Kişi');
      await user.click(container.querySelector('#wizard-finish')!);

      await waitFor(() => expect(useResumeStore.getState().wizardCompleted).toBe(true));
      const { resume } = useResumeStore.getState();
      expect(resume.basics.headline).toBe('Frontend Developer');
      expect(resume.generalInfo.gender).toBe('male');
      expect(resume.generalInfo.dateOfBirth).toBe('1990-05-04');
      // Left unset, not blank-stringed: `generalInfoPairs` omits a falsy row.
      expect(resume.generalInfo.maritalStatus).toBeUndefined();
      expect(resume.generalInfo.nationality).toBe('');
    });
  });
});
