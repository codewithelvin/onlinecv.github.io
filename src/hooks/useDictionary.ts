import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DictionaryEntry, DictionaryGroup } from '../types/dictionary';
import type { Locale } from '../types/resume';
import { toLocale } from '../app/i18n/locales';
import { getCachedDictionary, loadDictionary } from '../data/dictionaries';
import { dictionaryLabel, resolveLabel } from '../utils/dictionary';
import { searchKey } from '../utils/search';
import type { Option } from '../components/form/fields';

/**
 * Load a dictionary group on demand (§13.1) and expose localized options for the
 * active UI locale, plus resolvers. `options` use the label as value (free-text
 * AutoComplete); `codeOptions` use the code as value (hard-constraint Select).
 *
 * `resolve` is how a section renders a STORED item: the code is the truth, the
 * label is derived, so switching the UI language re-labels existing entries.
 */
export function useDictionary(group: DictionaryGroup): {
  entries: DictionaryEntry[];
  locale: Locale;
  options: Option[];
  codeOptions: Option[];
  findByLabel: (label: string) => DictionaryEntry | undefined;
  findByCode: (code: string) => DictionaryEntry | undefined;
  resolve: (code: string | undefined, fallbackText: string) => string;
} {
  const { i18n } = useTranslation();
  const locale = toLocale(i18n.language);
  const [entries, setEntries] = useState<DictionaryEntry[]>(() => getCachedDictionary(group));

  useEffect(() => {
    let active = true;
    void loadDictionary(group).then((data) => {
      if (active) setEntries(data);
    });
    return () => {
      active = false;
    };
  }, [group]);

  const options = useMemo<Option[]>(
    () =>
      entries.map((e) => ({
        value: dictionaryLabel(e, locale),
        label: dictionaryLabel(e, locale),
      })),
    [entries, locale],
  );

  const codeOptions = useMemo<Option[]>(
    () => entries.map((e) => ({ value: e.code, label: dictionaryLabel(e, locale) })),
    [entries, locale],
  );

  /**
   * Exact label first, then the same case/diacritic folding the dropdowns search
   * with (`utils/search`).
   *
   * The fold is not a nicety: this is the function that decides whether an entry
   * gets a dictionary CODE, and the code is what re-labels it when the CV
   * language changes. Someone who types "azerbaycan" or "Baki Dovlet
   * Universiteti" from a keyboard without `ə`/`İ` — or who leaves a trailing
   * space — clearly means the row that the dropdown would have offered them, and
   * an exact-match-only lookup silently stored that as frozen free text instead.
   *
   * Exact wins so that two labels folding to one key (the legacy synonym pairs in
   * `skills`, which already collided here) still resolve to themselves; among
   * folded ties the first row in file order wins, so the result is stable.
   */
  const findByLabel = useMemo(() => {
    const exact = new Map<string, DictionaryEntry>();
    const folded = new Map<string, DictionaryEntry>();
    for (const entry of entries) {
      const label = dictionaryLabel(entry, locale);
      exact.set(label, entry);
      const key = searchKey(label);
      if (!folded.has(key)) folded.set(key, entry);
    }
    return (label: string) => {
      const text = label.trim();
      return exact.get(text) ?? folded.get(searchKey(text));
    };
  }, [entries, locale]);

  const findByCode = useMemo(() => {
    const byCode = new Map(entries.map((e) => [e.code, e]));
    return (code: string) => byCode.get(code);
  }, [entries]);

  const resolve = useMemo(
    () => (code: string | undefined, fallbackText: string) =>
      resolveLabel(entries, code, fallbackText, locale),
    [entries, locale],
  );

  return { entries, locale, options, codeOptions, findByLabel, findByCode, resolve };
}
