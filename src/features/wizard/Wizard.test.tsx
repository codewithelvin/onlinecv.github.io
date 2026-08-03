import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { applyLocale, i18n } from '../../app/i18n';
import { SUPPORTED_LOCALES } from '../../app/i18n/locales';
import { Wizard } from './Wizard';

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
});
