import { create } from 'zustand';
import { rememberTourSeen } from './tour-storage';

/**
 * Where the editor tour is: nowhere, at the invitation, or running.
 *
 * A STORE OF ITS OWN, exactly like `help-store` and for the same two reasons.
 * `state/store.ts` is written to IndexedDB a moment later, and a half-finished
 * tour is a moment rather than a preference — reopening the app must not resume it
 * at step 9. And `importResume`/`reset` rebuild that whole record, so a tour field
 * would have to be threaded through both for nothing.
 *
 * Zustand rather than a context because the triggers are scattered: the mount
 * point offers it, the guide panel replays it, and the install prompt needs to
 * know whether the tour currently owns the screen.
 */

export type TourPhase =
  /** Nothing on screen — either not offered yet, or already dealt with. */
  | 'hidden'
  /** The welcome modal is asking. */
  | 'welcome'
  /** Joyride is walking the editor. */
  | 'running';

interface TourStore {
  phase: TourPhase;
  /** Offer the tour (the first-visit invitation). */
  offer: () => void;
  /** Start walking — from the invitation, or straight from the guide's replay. */
  start: () => void;
  /**
   * The tour is over, however it ended: finished, skipped, or declined at the
   * invitation. Remembering it here rather than in each caller is what makes
   * "never show this again" a single fact with a single writer.
   */
  end: () => void;
}

export const useTourStore = create<TourStore>((set) => ({
  phase: 'hidden',
  offer: () => set({ phase: 'welcome' }),
  start: () => set({ phase: 'running' }),
  end: () => {
    rememberTourSeen();
    set({ phase: 'hidden' });
  },
}));

/** Whether the tour currently owns the screen — see `PwaInstallPrompt`. */
export function isTourOnScreen(phase: TourPhase): boolean {
  return phase !== 'hidden';
}
