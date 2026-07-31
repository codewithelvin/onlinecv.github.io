import { describe, expect, it } from 'vitest';
import type { DictionaryEntry, DictionaryGroup } from '../types/dictionary';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../app/i18n/locales';
import skills from './skills.json';
import languages from './languages.json';
import interests from './interests.json';
import nationality from './nationality.json';
import universities from './universities.json';
import colleges from './colleges.json';

/**
 * The dictionary datasets are hand-maintained JSON, edited by scripts and by
 * hand, and a bad row fails at RENDER time in a language the editor may not
 * read. These are the invariants `utils/dictionary` relies on.
 *
 * Imported statically rather than through `loadDictionary`, so a broken file is
 * a failing test rather than a rejected dynamic import. The cast is the same one
 * `dictionaries.ts` makes — TypeScript widens a JSON string literal to `string`,
 * so `group` does not narrow to `DictionaryGroup` on its own. That the value is
 * genuinely one of the groups is the first assertion below.
 */
const DATASETS: Record<DictionaryGroup, DictionaryEntry[]> = {
  skills,
  languages,
  interests,
  nationality,
  universities,
  colleges,
} as unknown as Record<DictionaryGroup, DictionaryEntry[]>;

/**
 * Groups whose labels a Georgian user actually reads in a select or on the CV,
 * and which are therefore fully translated. `universities`/`colleges` are lists
 * of Azerbaijani institutions: their names stay Azerbaijani in every locale
 * (only the foreign universities added for other markets carry a `ka`), because
 * a transliterated institution name is less useful than the real one.
 */
const FULLY_TRANSLATED: DictionaryGroup[] = ['skills', 'languages', 'interests', 'nationality'];

describe.each(Object.entries(DATASETS))('%s dataset', (group, rows) => {
  it('is a non-empty list of rows tagged with its own group', () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.group, `"${row.code}" is in the wrong file`).toBe(group);
  });

  it('has unique codes', () => {
    const codes = rows.map((row) => row.code);
    const duplicates = codes.filter((code, i) => codes.indexOf(code) !== i);
    expect(duplicates).toEqual([]);
  });

  /**
   * `dictionaryLabel()` falls back to the default locale, so the default column
   * is the one that must never be blank — an empty string there renders as a
   * blank option the user cannot tell from any other blank option.
   */
  it('labels every row in the default locale, and never blank in any locale', () => {
    for (const row of rows) {
      expect(row[DEFAULT_LOCALE]?.trim(), `"${row.code}" has no ${DEFAULT_LOCALE} label`).toBeTruthy();
      for (const locale of SUPPORTED_LOCALES) {
        const label = row[locale];
        // Absent is fine (it falls back); present-but-empty is not.
        if (label !== undefined) expect(label.trim(), `"${row.code}".${locale} is blank`).toBeTruthy();
      }
    }
  });
});

describe('dictionary translation coverage', () => {
  it.each(FULLY_TRANSLATED)('translates every %s row into every supported locale', (group) => {
    for (const locale of SUPPORTED_LOCALES) {
      const missing = DATASETS[group].filter((row) => !row[locale]).map((row) => row.code);
      expect(missing, `${group} is missing ${locale} for ${missing.length} rows`).toEqual([]);
    }
  });

  /**
   * `LanguageItem.code` is the one field in the model with NO free-text fallback
   * (§13.1) — a language that is not in this dataset cannot be claimed on a CV at
   * all. So every language the app itself speaks has to be in it: shipping a
   * Georgian UI while Georgian was missing from the 17 rows meant a Georgian user
   * could not list their own mother tongue.
   */
  it('lets a speaker of every supported UI language claim it on their CV', () => {
    const ownLanguage: Record<string, string> = {
      az: 'azerbaijan',
      ru: 'russian',
      en: 'english',
      ka: 'georgian',
    };
    for (const locale of SUPPORTED_LOCALES) {
      const code = ownLanguage[locale];
      expect(code, `no language code mapped for the "${locale}" UI`).toBeTruthy();
      expect(
        languages.some((row) => row.code === code),
        `the languages dictionary has no "${code}" row`,
      ).toBe(true);
    }
  });
});
