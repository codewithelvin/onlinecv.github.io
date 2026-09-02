import { create } from 'zustand';
import type { HelpTopicId } from './topics';

/**
 * Whether the guide is open, and on which topic.
 *
 * A STORE OF ITS OWN, not a slice of `state/store.ts`, and the reason is that
 * store's other job: everything in it is written to IndexedDB a moment later. Two
 * things follow. Reopening the app must not reopen the guide on whatever page
 * someone happened to close it on — `openSections` is persisted because a
 * collapsed section is a preference, whereas an open help panel is a moment. And
 * `importResume`/`reset` rebuild that whole record, so a help field would have to
 * be threaded through both for no reason.
 *
 * It is a zustand store rather than a React context because the triggers are
 * scattered — the editor header, the wizard card, and a `?` on every section — and
 * a context would mean a provider wrapping the app for three booleans.
 */
interface HelpStore {
  open: boolean;
  /**
   * The topic being read, or `null` for "none chosen yet".
   *
   * `null` is not the same as the default topic, and the panel uses the
   * difference: on a phone it shows the TOPIC LIST, because there is no room for
   * a list beside an article. On desktop the list is always on screen, so `null`
   * simply falls back to the first topic.
   */
  topic: HelpTopicId | null;
  /** Open the guide, optionally straight onto one topic. */
  openHelp: (topic?: HelpTopicId) => void;
  /** Read a topic (from the list, or from another topic's link). */
  showTopic: (topic: HelpTopicId) => void;
  /** Back to the list — the phone's "up" navigation. */
  showTopicList: () => void;
  closeHelp: () => void;
}

export const useHelpStore = create<HelpStore>((set) => ({
  open: false,
  topic: null,
  openHelp: (topic) => set({ open: true, topic: topic ?? null }),
  showTopic: (topic) => set({ topic }),
  showTopicList: () => set({ topic: null }),
  /**
   * The topic is deliberately NOT cleared on close. Someone who closes the guide
   * to try what it said, then reopens it, wants the paragraph they were reading —
   * not the table of contents.
   */
  closeHelp: () => set({ open: false }),
}));
