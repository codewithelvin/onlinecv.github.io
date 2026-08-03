import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import { useResumeStore } from '../state/store';
import { createEmptyResume } from '../utils/empty-resume';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  beforeEach(() => {
    useResumeStore.setState({
      resume: createEmptyResume('az'),
      uiLocale: 'az',
      hydrated: false,
      wizardCompleted: false,
      persistenceError: false,
    });
  });

  it('shows a loading spinner until hydrated', () => {
    const { container } = renderWithProviders(<HomePage />);
    expect(container.querySelector('.ant-spin')).toBeTruthy();
  });

  it('shows the first-run wizard before it has been completed', () => {
    useResumeStore.setState({ hydrated: true, wizardCompleted: false });
    renderWithProviders(<HomePage />);
    expect(screen.getByRole('button', { name: 'Növbəti' })).toBeInTheDocument();
  });

  it('renders the editor once the wizard has been completed', () => {
    const resume = createEmptyResume('az');
    resume.basics.firstName = 'Elvin';
    resume.basics.lastName = 'Huseynov';
    resume.contact.email = 'elvin@example.az';
    useResumeStore.setState({ resume, hydrated: true, wizardCompleted: true });

    renderWithProviders(<HomePage />);
    // Editor section headings (AZ) are present.
    expect(screen.getAllByText('İş təcrübəsi').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bacarıqlar').length).toBeGreaterThan(0);
    // The heaviest render in the suite — the full editor AND the live preview in
    // one pass. It lands around 3s alone and drifts past vitest's 5s default
    // when the other files are competing for cores, so the budget is stated
    // rather than left to chance.
  }, 30_000);

  /**
   * The reported bug: an empty required field is a validation error, not a
   * reason to unmount the editor and start the CV over.
   */
  it('stays in the editor when the name is cleared', () => {
    const resume = createEmptyResume('az');
    resume.basics.lastName = 'Huseynov';
    resume.contact.email = 'elvin@example.az';
    useResumeStore.setState({ resume, hydrated: true, wizardCompleted: true });

    renderWithProviders(<HomePage />);
    expect(screen.getAllByText('İş təcrübəsi').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Növbəti' })).not.toBeInTheDocument();
  }, 30_000);
});
