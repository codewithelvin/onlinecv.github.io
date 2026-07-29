import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DictionaryEntry, DictionaryGroup } from '../types/dictionary';
import type { Locale } from '../types/resume';
import { getCachedDictionary, loadDictionary } from '../data/dictionaries';
import type { Option } from '../components/form/fields';

/**
 * Load a dictionary group on demand (§13.1) and expose localized options for the
 * active UI locale, plus resolvers. `options` use the label as value (free-text
 * AutoComplete); `codeOptions` use the code as value (hard-constraint Select).
 */
export function useDictionary(group: DictionaryGroup): {
  entries: DictionaryEntry[];
  options: Option[];
  codeOptions: Option[];
  findByLabel: (label: string) => DictionaryEntry | undefined;
  findByCode: (code: string) => DictionaryEntry | undefined;
} {
  const { i18n } = useTranslation();
  const locale = (i18n.language as Locale) ?? 'az';
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
    () => entries.map((e) => ({ value: e[locale], label: e[locale] })),
    [entries, locale],
  );

  const codeOptions = useMemo<Option[]>(
    () => entries.map((e) => ({ value: e.code, label: e[locale] })),
    [entries, locale],
  );

  const findByLabel = useMemo(() => {
    const byLabel = new Map(entries.map((e) => [e[locale], e]));
    return (label: string) => byLabel.get(label);
  }, [entries, locale]);

  const findByCode = useMemo(() => {
    const byCode = new Map(entries.map((e) => [e.code, e]));
    return (code: string) => byCode.get(code);
  }, [entries]);

  return { entries, options, codeOptions, findByLabel, findByCode };
}
