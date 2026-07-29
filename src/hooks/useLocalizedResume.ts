import { useEffect, useMemo, useState } from 'react';
import type { DictionaryBundle, DictionaryGroup } from '../types/dictionary';
import type { Locale, Resume } from '../types/resume';
import { getCachedDictionaries, loadDictionaries } from '../data/dictionaries';
import { localizeResume, referencedDictionaryGroups } from '../utils/localize-resume';

/**
 * A copy of `resume` whose dictionary-backed labels (skills, languages,
 * interests, nationality, institutions) read in `locale` — what makes the
 * preview follow the CV-language switch. Only the dictionaries the resume
 * actually references are fetched.
 */
export function useLocalizedResume(resume: Resume, locale: Locale): Resume {
  const groups = useMemo(() => referencedDictionaryGroups(resume), [resume]);
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

  return useMemo(() => localizeResume(resume, locale, dicts), [resume, locale, dicts]);
}
