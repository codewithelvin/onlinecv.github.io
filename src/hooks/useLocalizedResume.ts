import { useEffect, useMemo, useState } from 'react';
import type { DictionaryBundle, DictionaryGroup } from '../types/dictionary';
import type { Locale, Resume } from '../types/resume';
import { getCachedDictionaries, loadDictionaries } from '../data/dictionaries';
import { localizeResume, referencedDictionaryGroups } from '../utils/localize-resume';
import { applyFieldVisibility } from '../utils/field-visibility';
import { sortResumeHistory } from '../utils/sort-history';

/**
 * The resume as the CV renders it: personal details the user turned off are
 * blanked (`applyFieldVisibility`), the dated sections read newest first
 * (`sortResumeHistory`), and dictionary-backed labels (skills, languages,
 * interests, nationality, institutions) read in `locale` — what makes the
 * preview follow the CV-language switch. Only the dictionaries the resume
 * actually references are fetched, and a hidden field references none.
 *
 * `services/pdf.ts` composes the same three projections in the same order, so
 * the preview and the export cannot disagree about what is on the page.
 */
export function useLocalizedResume(resume: Resume, locale: Locale): Resume {
  const visible = useMemo(() => sortResumeHistory(applyFieldVisibility(resume)), [resume]);
  const groups = useMemo(() => referencedDictionaryGroups(visible), [visible]);
  // Effects can't depend on a fresh array, so the group SET is the dependency.
  const groupKey = groups.join(',');
  const [dicts, setDicts] = useState<DictionaryBundle>(() => getCachedDictionaries(groups));

  useEffect(() => {
    const needed = groupKey ? (groupKey.split(',') as DictionaryGroup[]) : [];
    if (needed.length === 0) return;
    let active = true;
    void loadDictionaries(needed).then((loaded) => {
      // Merge, don't replace: a later resume edit may need fewer groups than are
      // already loaded, and dropping them would flip labels back.
      if (active) setDicts((prev) => ({ ...prev, ...loaded }));
    });
    return () => {
      active = false;
    };
  }, [groupKey]);

  return useMemo(() => localizeResume(visible, locale, dicts), [visible, locale, dicts]);
}
