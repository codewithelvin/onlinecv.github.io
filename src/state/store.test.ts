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

  /**
   * The dated sections' ↑/↓ buttons come through here rather than through
   * `reorderItem`, because while a section is still auto-ordered the row the user
   * pressed sits at a SORTED position while `reorderItem`'s indices address the
   * stored one. Committing the whole order in the same call as the flag is what
   * keeps the displayed list and the stored list from diverging on the first move.
   */
  it('freezes a dated section’s order and flips it to manual in one call', () => {
    const s = useResumeStore.getState();
    s.addItem('experience', mkExp('a', 'Dev'));
    s.addItem('experience', mkExp('b', 'Lead'));
    s.addItem('experience', mkExp('c', 'Head'));
    expect(useResumeStore.getState().resume.manualOrder).toBeUndefined();

    s.setManualItemOrder('experience', ['c', 'a', 'b']);
    const after = useResumeStore.getState().resume;
    expect(after.experience.map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(after.manualOrder).toEqual(['experience']);

    // Back to newest-first: the flag goes, the stored arrangement stays, so
    // switching modes to look at the other one loses nothing.
    useResumeStore.getState().setAutoItemOrder('experience');
    const auto = useResumeStore.getState().resume;
    expect(auto.manualOrder).toEqual([]);
    expect(auto.experience.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  /**
   * The caller's id list is a snapshot of what was on screen, so it can be one
   * edit behind. It may move an entry; it must never lose one.
   */
  it('keeps items a stale id list forgets, and ignores ids it does not hold', () => {
    const s = useResumeStore.getState();
    s.addItem('experience', mkExp('a', 'Dev'));
    s.addItem('experience', mkExp('b', 'Lead'));
    s.addItem('experience', mkExp('c', 'Head'));

    s.setManualItemOrder('experience', ['c', 'ghost']);
    expect(useResumeStore.getState().resume.experience.map((x) => x.id)).toEqual(['c', 'a', 'b']);
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

  /**
   * A restore has to do both halves at once. Installing the resume without
   * finishing the wizard would leave the user on the first-run form with the
   * whole restored CV behind it, which is why this is one action rather than a
   * pair a caller could get half-right.
   */
  it('installs a restored resume and leaves the wizard in one step', () => {
    const s = useResumeStore.getState();
    s.setOpenSections(['skills']);
    const restored = createEmptyResume('ru');
    restored.basics.firstName = 'Elvin';
    restored.contact.email = 'elvin@example.az';

    s.importResume(restored);

    const state = useResumeStore.getState();
    expect(state.resume.basics.firstName).toBe('Elvin');
    expect(state.resume.locale).toBe('ru');
    expect(state.wizardCompleted).toBe(true);
    // Back to the editor's default set rather than this browser's last state.
    expect(state.openSections).toBeNull();
    expect(state.resume.updatedAt >= restored.updatedAt).toBe(true);
  });

  it('leaves the UI language alone when a resume is restored', () => {
    useResumeStore.setState({ uiLocale: 'fr' });
    useResumeStore.getState().importResume(createEmptyResume('ja'));
    expect(useResumeStore.getState().resume.locale).toBe('ja');
    expect(useResumeStore.getState().uiLocale).toBe('fr');
  });
});
