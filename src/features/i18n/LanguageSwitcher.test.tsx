import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { LOCALES, SUPPORTED_LOCALES } from '../../app/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * The switcher is a dropdown rather than a row of chips so that the header does
 * not grow with every language — which means the registry, not the markup, has to
 * be the thing that decides what is on offer.
 */
describe('LanguageSwitcher', () => {
  beforeEach(() => {
    useResumeStore.setState({
      resume: createEmptyResume('az'),
      uiLocale: 'az',
      hydrated: true,
      persistenceError: false,
    });
  });

  it('shows the current locale on one trigger, whatever the language count', () => {
    const { container } = renderWithProviders(<LanguageSwitcher />);
    const trigger = container.querySelector('#ui-language') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain(LOCALES.az.short);
    // One control, not one per language.
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });

  it('offers every registered locale by its own name, and switches to it', async () => {
    const { container } = renderWithProviders(<LanguageSwitcher />);
    fireEvent.click(container.querySelector('#ui-language') as HTMLElement);

    await waitFor(() => {
      expect(document.querySelector('.ant-dropdown-menu')).toBeTruthy();
    });
    for (const code of SUPPORTED_LOCALES) {
      const option = document.getElementById(`ui-language-${code}`);
      expect(option, `no option for "${code}"`).toBeTruthy();
      expect(option?.textContent).toBe(LOCALES[code].nativeName);
    }

    fireEvent.click(document.getElementById('ui-language-ka') as HTMLElement);
    expect(useResumeStore.getState().uiLocale).toBe('ka');
  });
});
