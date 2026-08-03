import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistedState } from '../services/persistence';
import { createEmptyResume } from '../utils/empty-resume';

/**
 * Hydration decides whether a returning visitor lands in the editor or back in
 * the first-run wizard, so the back-compat branch gets its own file with the
 * persistence boundary mocked (jsdom has no IndexedDB).
 */
const loadState = vi.hoisted(() => vi.fn<() => Promise<PersistedState | null>>());
vi.mock('../services/persistence', () => ({
  loadState,
  saveState: vi.fn(async () => {}),
  clearState: vi.fn(async () => {}),
}));

const { useResumeStore } = await import('./store');

const withIdentity = (): PersistedState['resume'] => {
  const resume = createEmptyResume('az');
  resume.basics.firstName = 'Elvin';
  resume.basics.lastName = 'Huseynov';
  resume.contact.email = 'elvin@example.az';
  return resume;
};

describe('hydrate: the wizard gate', () => {
  beforeEach(() => {
    loadState.mockReset();
    useResumeStore.setState({ hydrated: false, wizardCompleted: false });
  });

  it('shows the wizard on a first visit', async () => {
    loadState.mockResolvedValue(null);
    await useResumeStore.getState().hydrate();
    expect(useResumeStore.getState().wizardCompleted).toBe(false);
  });

  it('honours a stored completion flag even when a required field is now empty', async () => {
    // Exactly the reported bug, one refresh later: the user cleared their name,
    // it was persisted that way, and the app must still open the editor.
    const resume = withIdentity();
    resume.basics.firstName = '';
    loadState.mockResolvedValue({ resume, uiLocale: 'az', wizardCompleted: true });
    await useResumeStore.getState().hydrate();
    expect(useResumeStore.getState().wizardCompleted).toBe(true);
  });

  it('infers completion for records written before the flag existed', async () => {
    loadState.mockResolvedValue({ resume: withIdentity(), uiLocale: 'az' });
    await useResumeStore.getState().hydrate();
    expect(useResumeStore.getState().wizardCompleted).toBe(true);
  });

  it('still shows the wizard for a pre-flag record that never got an identity', async () => {
    loadState.mockResolvedValue({ resume: createEmptyResume('az'), uiLocale: 'az' });
    await useResumeStore.getState().hydrate();
    expect(useResumeStore.getState().wizardCompleted).toBe(false);
  });
});
