import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DictionaryEntry, DictionaryGroup } from '../types/dictionary';
import type { Locale } from '../types/resume';
import { toLocale } from '../app/i18n/locales';
import { getCachedDictionary, loadDictionary } from '../data/dictionaries';
import { dictionaryLabel, resolveLabel } from '../utils/dictionary';
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
    () => entries.map((e) => ({ value: dictionaryLabel(e, locale), label: dictionaryLabel(e, locale) })),
    [entries, locale],
  );

  const codeOptions = useMemo<Option[]>(
    () => entries.map((e) => ({ value: e.code, label: dictionaryLabel(e, locale) })),
    [entries, locale],
  );

  const findByLabel = useMemo(() => {
    const byLabel = new Map(entries.map((e) => [dictionaryLabel(e, locale), e]));
    return (label: string) => byLabel.get(label);
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
