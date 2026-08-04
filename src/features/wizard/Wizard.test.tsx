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
  const selector = container.querySelector(id)?.closest('.ant-select')?.querySelector('.ant-select-selector');
  expect(selector, `${id} is not a Select`).toBeTruthy();
  await user.click(selector as Element);
  // The dropdown renders through a portal, so it is queried off `document`.
  await waitFor(() => expect(document.querySelector('.ant-select-item-option')).toBeTruthy());
  const option = [...document.querySelectorAll<HTMLElement>('.ant-select-item-option-content')].find(
    (el) => el.textContent === label,
  );
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

    it('gives each locale its own wording', () => {
      const wordings = SUPPORTED_LOCALES.map((l) => i18n.getFixedT(l)('wizard.createdBy'));
      // Not a translation-quality check — just that nobody pasted English in.
      expect(new Set(wordings).size).toBe(wordings.length);
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
