import { beforeEach, describe, expect, it } from 'vitest';
import type { ExperienceItem } from '../types/resume';
import { createEmptyResume } from '../utils/empty-resume';
import { useResumeStore } from './store';

const mkExp = (id: string, position: string): ExperienceItem => ({
  id,
  company: 'ACME',
  position,
  startDate: '2020-01-01',
  current: false,
});

describe('resume store', () => {
  beforeEach(() => {
    useResumeStore.setState({
      resume: createEmptyResume('az'),
      uiLocale: 'az',
      openSections: null,
      wizardCompleted: false,
      hydrated: false,
    });
  });

  /**
   * Regression: the wizard used to be gated on `resume` itself, so clearing the
   * name field in the editor threw the user back to the first-run wizard and the
   * whole CV disappeared from the screen. Completion is now its own state.
   */
  it('keeps the wizard finished after the name is cleared again', () => {
    const s = useResumeStore.getState();
    s.updateBasics({ firstName: 'Elvin', lastName: 'Huseynov' });
    s.updateContactEmail('elvin@example.az');
    s.completeWizard();
    expect(useResumeStore.getState().wizardCompleted).toBe(true);

    useResumeStore.getState().updateBasics({ firstName: '' });
    expect(useResumeStore.getState().resume.basics.firstName).toBe('');
    expect(useResumeStore.getState().wizardCompleted).toBe(true);

    useResumeStore.getState().updateContactEmail('');
    expect(useResumeStore.getState().wizardCompleted).toBe(true);
  });

  it('sends the user back to the wizard on reset (BR-8)', async () => {
    useResumeStore.getState().completeWizard();
    await useResumeStore.getState().resetResume();
    expect(useResumeStore.getState().wizardCompleted).toBe(false);
  });

  it('adds, updates, removes and reorders list items', () => {
    const s = useResumeStore.getState();
    s.addItem('experience', mkExp('a', 'Dev'));
    s.addItem('experience', mkExp('b', 'Lead'));
    expect(useResumeStore.getState().resume.experience.map((x) => x.id)).toEqual(['a', 'b']);

    s.reorderItem('experience', 0, 1);
    expect(useResumeStore.getState().resume.experience.map((x) => x.id)).toEqual(['b', 'a']);

    s.updateItem('experience', 'a', { ...mkExp('a', 'Senior Dev') });
    expect(useResumeStore.getState().resume.experience.find((x) => x.id === 'a')?.position).toBe(
      'Senior Dev',
    );

    s.removeItem('experience', 'b');
    expect(useResumeStore.getState().resume.experience.map((x) => x.id)).toEqual(['a']);
  });

  it('updates basics and bumps updatedAt', () => {
    const before = useResumeStore.getState().resume.updatedAt;
    useResumeStore.getState().updateBasics({ firstName: 'Elvin' });
    const after = useResumeStore.getState().resume;
    expect(after.basics.firstName).toBe('Elvin');
    expect(after.updatedAt >= before).toBe(true);
  });

  it('tracks which editor sections are open, starting unset', () => {
    expect(useResumeStore.getState().openSections).toBeNull();
    useResumeStore.getState().setOpenSections(['skills']);
    expect(useResumeStore.getState().openSections).toEqual(['skills']);
    // Collapsing everything is a real choice, not "unset" — it must survive.
    useResumeStore.getState().setOpenSections([]);
    expect(useResumeStore.getState().openSections).toEqual([]);
  });

  it('manages contact items', () => {
    const s = useResumeStore.getState();
    s.addContactItem({ id: 'c1', type: 'mobile', value: '+994501112233' });
    expect(useResumeStore.getState().resume.contact.items).toHaveLength(1);
    s.updateContactItem('c1', { value: '+994505556677' });
    expect(useResumeStore.getState().resume.contact.items[0].value).toBe('+994505556677');
    s.removeContactItem('c1');
    expect(useResumeStore.getState().resume.contact.items).toHaveLength(0);
  });
});
