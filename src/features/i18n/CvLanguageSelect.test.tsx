import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { CV_LOCALES, LOCALES, SUPPORTED_LOCALES } from '../../app/i18n';
import { CvLanguageSelect } from './CvLanguageSelect';

/**
 * The CV's own language is not the UI's (spec §10.1), and since Arabic the two
 * lists are not even the same length: a language can be translated for the app
 * before the exporter can render a PDF in it (`LocaleMeta.cv`). This select is
 * the one place where that difference is visible to a user, so it is asserted
 * against the registry rather than against a hard-coded list.
 */
describe('CvLanguageSelect', () => {
  beforeEach(() => {
    useResumeStore.setState({
      resume: createEmptyResume('az'),
      uiLocale: 'az',
      hydrated: true,
      persistenceError: false,
    });
  });

  async function openOptions(): Promise<HTMLElement[]> {
    const { container } = renderWithProviders(<CvLanguageSelect />);
    fireEvent.mouseDown(container.querySelector('.ant-select-selector') as HTMLElement);
    await waitFor(() => {
      expect(document.querySelector('.ant-select-item-option')).toBeTruthy();
    });
    return [...document.querySelectorAll<HTMLElement>('.ant-select-item-option-content')];
  }

  it('offers exactly the exportable languages, by their own names', async () => {
    const labels = (await openOptions()).map((el) => el.textContent);
    expect(labels).toEqual(CV_LOCALES.map((code) => LOCALES[code].nativeName));
  });

  /**
   * Every shipped language is exportable today, so this asserts the RULE rather
   * than a current exception: whatever `cv` says is what the select offers. A
   * language added for the UI before its export works must not appear here.
   */
  it('is driven by the cv flag, not by the UI language list', async () => {
    const labels = (await openOptions()).map((el) => el.textContent);
    for (const code of SUPPORTED_LOCALES) {
      const offered = labels.includes(LOCALES[code].nativeName);
      expect(offered, `"${code}" is offered=${offered} but cv=${LOCALES[code].cv}`).toBe(
        LOCALES[code].cv,
      );
    }
  });

  it('writes the choice to the resume, not to the UI locale', async () => {
    const options = await openOptions();
    const english = options.find((el) => el.textContent === LOCALES.en.nativeName);
    fireEvent.click(english as HTMLElement);
    expect(useResumeStore.getState().resume.locale).toBe('en');
    expect(useResumeStore.getState().uiLocale).toBe('az');
  });
});
