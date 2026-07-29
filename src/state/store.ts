import { create } from 'zustand';
import type {
  Basics,
  Contact,
  ContactItem,
  GeneralInfo,
  Locale,
  Resume,
  ResumeListSection,
  TemplateId,
} from '../types/resume';
import { createEmptyResume } from '../utils/empty-resume';
import { DEFAULT_LOCALE, applyLocale } from '../app/i18n';
import { clearState, loadState, saveState } from '../services/persistence';

/** Item type held by a given list section. */
type ItemOf<K extends ResumeListSection> = NonNullable<Resume[K]>[number];

/** Immutably replace a list section, keeping `Resume`'s type. */
function withList<K extends ResumeListSection>(resume: Resume, section: K, items: ItemOf<K>[]): Resume {
  return { ...resume, [section]: items } as Resume;
}

/** Bump the modified timestamp on every mutation. */
function touch(resume: Resume): Resume {
  return { ...resume, updatedAt: new Date().toISOString() };
}

function readList<K extends ResumeListSection>(resume: Resume, section: K): ItemOf<K>[] {
  return (resume[section] ?? []) as ItemOf<K>[];
}

export interface ResumeStore {
  resume: Resume;
  uiLocale: Locale;
  /** True once hydration from IndexedDB has completed (or failed). */
  hydrated: boolean;
  /** True when persistence failed and the app is running memory-only (§17). */
  persistenceError: boolean;

  hydrate: () => Promise<void>;
  setUiLocale: (locale: Locale) => void;
  setResumeLocale: (locale: Locale) => void;
  setTemplate: (templateId: TemplateId) => void;

  updateBasics: (patch: Partial<Basics>) => void;
  updateGeneralInfo: (patch: Partial<GeneralInfo>) => void;
  updateContactEmail: (email: Contact['email']) => void;
  updateSummary: (summary: string) => void;
  setAvatar: (dataUrl: string | undefined) => void;

  addContactItem: (item: ContactItem) => void;
  updateContactItem: (id: string, patch: Partial<ContactItem>) => void;
  removeContactItem: (id: string) => void;

  addItem: <K extends ResumeListSection>(section: K, item: ItemOf<K>) => void;
  updateItem: <K extends ResumeListSection>(section: K, id: string, item: ItemOf<K>) => void;
  removeItem: (section: ResumeListSection, id: string) => void;
  reorderItem: (section: ResumeListSection, from: number, to: number) => void;

  resetResume: () => Promise<void>;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  resume: createEmptyResume(),
  uiLocale: 'az',
  hydrated: false,
  persistenceError: false,

  /**
   * First run starts in Azerbaijani — the primary market — regardless of the
   * browser's preferred languages; the user can switch from the header and that
   * choice is what gets persisted.
   */
  hydrate: async () => {
    let next: { resume: Resume; uiLocale: Locale };
    try {
      const persisted = await loadState();
      if (persisted) {
        next = { resume: persisted.resume, uiLocale: persisted.uiLocale };
      } else {
        next = { resume: createEmptyResume(DEFAULT_LOCALE), uiLocale: DEFAULT_LOCALE };
      }
    } catch {
      next = { resume: createEmptyResume(DEFAULT_LOCALE), uiLocale: DEFAULT_LOCALE };
      set({ persistenceError: true });
    }
    applyLocale(next.uiLocale);
    set({ resume: next.resume, uiLocale: next.uiLocale, hydrated: true });
  },

  setUiLocale: (locale) => {
    applyLocale(locale);
    set({ uiLocale: locale });
  },

  setResumeLocale: (locale) => set((s) => ({ resume: touch({ ...s.resume, locale }) })),

  setTemplate: (templateId) => set((s) => ({ resume: touch({ ...s.resume, templateId }) })),

  updateBasics: (patch) =>
    set((s) => ({ resume: touch({ ...s.resume, basics: { ...s.resume.basics, ...patch } }) })),

  updateGeneralInfo: (patch) =>
    set((s) => ({
      resume: touch({ ...s.resume, generalInfo: { ...s.resume.generalInfo, ...patch } }),
    })),

  updateContactEmail: (email) =>
    set((s) => ({ resume: touch({ ...s.resume, contact: { ...s.resume.contact, email } }) })),

  updateSummary: (summary) => set((s) => ({ resume: touch({ ...s.resume, summary }) })),

  setAvatar: (dataUrl) =>
    set((s) => ({ resume: touch({ ...s.resume, media: { avatar: dataUrl } }) })),

  addContactItem: (item) =>
    set((s) => ({
      resume: touch({
        ...s.resume,
        contact: { ...s.resume.contact, items: [...s.resume.contact.items, item] },
      }),
    })),

  updateContactItem: (id, patch) =>
    set((s) => ({
      resume: touch({
        ...s.resume,
        contact: {
          ...s.resume.contact,
          items: s.resume.contact.items.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        },
      }),
    })),

  removeContactItem: (id) =>
    set((s) => ({
      resume: touch({
        ...s.resume,
        contact: {
          ...s.resume.contact,
          items: s.resume.contact.items.filter((c) => c.id !== id),
        },
      }),
    })),

  addItem: (section, item) =>
    set((s) => ({ resume: touch(withList(s.resume, section, [...readList(s.resume, section), item])) })),

  updateItem: (section, id, item) =>
    set((s) => ({
      resume: touch(
        withList(
          s.resume,
          section,
          readList(s.resume, section).map((existing) =>
            (existing as { id: string }).id === id ? item : existing,
          ),
        ),
      ),
    })),

  removeItem: (section, id) =>
    set((s) => ({
      resume: touch(
        withList(
          s.resume,
          section,
          readList(s.resume, section).filter((existing) => (existing as { id: string }).id !== id),
        ),
      ),
    })),

  reorderItem: (section, from, to) =>
    set((s) => {
      const list = [...readList(s.resume, section)];
      if (from < 0 || from >= list.length || to < 0 || to >= list.length) return s;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return { resume: touch(withList(s.resume, section, list)) };
    }),

  resetResume: async () => {
    const uiLocale = get().uiLocale;
    const resume = createEmptyResume(uiLocale);
    set({ resume });
    try {
      await clearState();
    } catch {
      set({ persistenceError: true });
    }
  },
}));

/**
 * Wire debounced persistence (§6 layer 3). The store subscribes to its own
 * resume/locale changes and writes them to IndexedDB, skipping the initial
 * hydration write and going memory-only on failure.
 */
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useResumeStore.subscribe((state, prev) => {
  if (!state.hydrated) return;
  if (state.resume === prev.resume && state.uiLocale === prev.uiLocale) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveState({ resume: state.resume, uiLocale: state.uiLocale }).catch(() => {
      useResumeStore.setState({ persistenceError: true });
    });
  }, 400);
});
