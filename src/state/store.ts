import { create } from 'zustand';
import type {
  Basics,
  Contact,
  ContactItem,
  GeneralInfo,
  HideableField,
  Locale,
  Resume,
  ResumeListSection,
  TemplateId,
} from '../types/resume';
import { createEmptyResume, looksUnstarted } from '../utils/empty-resume';
import { withFieldVisibility } from '../utils/field-visibility';
import { DEFAULT_LOCALE, applyLocale, syncLocaleUrl } from '../app/i18n';
import { initialLocale } from '../app/seo-locales';
import { clearState, loadState, saveState } from '../services/persistence';

/** Item type held by a given list section. */
type ItemOf<K extends ResumeListSection> = NonNullable<Resume[K]>[number];

/** Immutably replace a list section, keeping `Resume`'s type. */
function withList<K extends ResumeListSection>(
  resume: Resume,
  section: K,
  items: ItemOf<K>[],
): Resume {
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
  /**
   * Expanded editor sections, persisted so a refresh doesn't re-open everything
   * the user had collapsed. `null` = never touched → the editor's default set.
   */
  openSections: string[] | null;
  /**
   * True once the user has finished the first-run wizard (FR-13). This — NOT the
   * current contents of `resume` — is what gates the wizard, so emptying a
   * required field in the editor is a validation error and never a navigation.
   */
  wizardCompleted: boolean;
  /** True once hydration from IndexedDB has completed (or failed). */
  hydrated: boolean;
  /** True when persistence failed and the app is running memory-only (§17). */
  persistenceError: boolean;

  hydrate: () => Promise<void>;
  /** Leave the first-run wizard for good (BR-8 reset is the only way back). */
  completeWizard: () => void;
  setUiLocale: (locale: Locale) => void;
  setOpenSections: (keys: string[]) => void;
  setResumeLocale: (locale: Locale) => void;
  setTemplate: (templateId: TemplateId) => void;
  /** Show/hide the "Made with www.onlinecv.az" credit on the CV. */
  setAttribution: (attribution: boolean) => void;
  /**
   * Print a personal-details field on the CV, or keep it in the editor only. The
   * value itself is never touched — see `utils/field-visibility`.
   */
  setFieldVisible: (field: HideableField, visible: boolean) => void;

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
  uiLocale: DEFAULT_LOCALE,
  openSections: null,
  wizardCompleted: false,
  hydrated: false,
  persistenceError: false,

  /**
   * First run follows the URL's locale if it names one (`/ru/` — a search result
   * or a shared link), and otherwise starts in Azerbaijani, the primary market,
   * regardless of the browser's preferred languages. The user can switch from the
   * header and that choice is what gets persisted.
   */
  hydrate: async () => {
    type Hydrated = Pick<ResumeStore, 'resume' | 'uiLocale' | 'openSections' | 'wizardCompleted'>;
    const path = typeof window === 'undefined' ? '' : window.location.pathname;
    const fresh: Hydrated = {
      resume: createEmptyResume(DEFAULT_LOCALE),
      uiLocale: initialLocale(path, undefined),
      openSections: null,
      wizardCompleted: false,
    };
    let next: Hydrated;
    try {
      const persisted = await loadState();
      next = persisted
        ? {
            resume: persisted.resume,
            // The URL's locale outranks the stored one — see `initialLocale`.
            uiLocale: initialLocale(path, persisted.uiLocale),
            openSections: persisted.openSections ?? null,
            // Records written before the flag existed: infer it, so an existing
            // CV lands in the editor and a half-filled one still gets the wizard.
            wizardCompleted: persisted.wizardCompleted ?? !looksUnstarted(persisted.resume),
          }
        : fresh;
    } catch {
      next = fresh;
      set({ persistenceError: true });
    }
    applyLocale(next.uiLocale);
    set({ ...next, hydrated: true });
  },

  completeWizard: () => set({ wizardCompleted: true }),

  setUiLocale: (locale) => {
    applyLocale(locale);
    // Keep the address bar honest: each language has its own indexable URL
    // (§19.2), so the one on screen has to be the one in the bar — otherwise a
    // shared link hands the recipient a different language.
    syncLocaleUrl(locale);
    set({ uiLocale: locale });
  },

  setOpenSections: (keys) => set({ openSections: keys }),

  setResumeLocale: (locale) => set((s) => ({ resume: touch({ ...s.resume, locale }) })),

  setTemplate: (templateId) => set((s) => ({ resume: touch({ ...s.resume, templateId }) })),

  setAttribution: (attribution) => set((s) => ({ resume: touch({ ...s.resume, attribution }) })),

  setFieldVisible: (field, visible) =>
    set((s) => ({
      resume: touch({
        ...s.resume,
        hiddenFields: withFieldVisibility(s.resume.hiddenFields, field, visible),
      }),
    })),

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
    set((s) => ({
      resume: touch(withList(s.resume, section, [...readList(s.resume, section), item])),
    })),

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
    set({ resume, openSections: null, wizardCompleted: false });
    try {
      await clearState();
    } catch {
      set({ persistenceError: true });
    }
  },
}));

/**
 * Wire debounced persistence (§6 layer 3). The store subscribes to its own
 * resume/locale/view-state changes and writes them to IndexedDB, skipping the
 * initial hydration write and going memory-only on failure.
 */
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useResumeStore.subscribe((state, prev) => {
  if (!state.hydrated) return;
  if (
    state.resume === prev.resume &&
    state.uiLocale === prev.uiLocale &&
    state.openSections === prev.openSections &&
    state.wizardCompleted === prev.wizardCompleted
  ) {
    return;
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveState({
      resume: state.resume,
      uiLocale: state.uiLocale,
      openSections: state.openSections,
      wizardCompleted: state.wizardCompleted,
    }).catch(() => {
      useResumeStore.setState({ persistenceError: true });
    });
  }, 400);
});
