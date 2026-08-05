import { describe, expect, it } from 'vitest';
import type { DictionaryEntry, DictionaryGroup } from '../types/dictionary';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../app/i18n/locales';
import skills from './skills.json';
import languages from './languages.json';
import interests from './interests.json';
import nationality from './nationality.json';
import universities from './universities.json';
import colleges from './colleges.json';
import faculties from './faculties.json';
import specialities from './specialities.json';
import positions from './positions.json';
import cities from './cities.json';

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
  faculties,
  specialities,
  positions,
  cities,
} as unknown as Record<DictionaryGroup, DictionaryEntry[]>;

/**
 * EVERY group is fully translated — there is no exemption left.
 *
 * `universities` and `colleges` used to be excluded on the grounds that a
 * transliterated Azerbaijani institution name is less useful than the real one.
 * That reasoning does not survive contact with the product: the institution is
 * printed on the CV and picked from a select, so in a Georgian or Arabic UI those
 * rows fell back to Azerbaijani and the user was reading a script they may not
 * know in the middle of their own CV. Institution names are now transliterated
 * (Georgian) and rendered in Arabic like any other proper noun, which is what
 * both languages do with foreign institutions anyway.
 *
 * Keeping the list total over `DictionaryGroup` is deliberate: adding a dataset
 * forces a decision here rather than silently shipping an untranslated one.
 */
const FULLY_TRANSLATED: DictionaryGroup[] = [
  'skills',
  'languages',
  'interests',
  'nationality',
  'universities',
  'colleges',
  'faculties',
  'specialities',
  'positions',
  'cities',
];

/**
 * The `max()` of the form field each dataset feeds (`features/editor/schemas`).
 * Total over `DictionaryGroup` on purpose: a new dataset has to state which field
 * it fills, because that is the number its longest translation must respect.
 *
 * `languages` is the hard-constraint Select (§13.1) — its label is never typed
 * into a length-checked field, so the cap here is a display sanity bound.
 */
const FIELD_MAX: Record<DictionaryGroup, number> = {
  skills: 100, // skillSchema.name
  languages: 100, // resolved from the code, never validated as text
  interests: 50, // interestSchema.name
  nationality: 100, // generalInfoSchema.nationality (unbounded; kept sane)
  universities: 150, // educationSchema.institution
  colleges: 150, // educationSchema.institution
  faculties: 100, // educationSchema.faculty
  specialities: 100, // educationSchema.specialization
  positions: 50, // experienceSchema.position
  cities: 100, // basics.location and experienceSchema.location
};

/**
 * Pre-existing duplicate-label pairs in `skills`: legacy synonym codes that came
 * over from the production dictionary and render identically in several locales.
 * Allowlisted rather than merged, because a stored resume may reference either
 * code and merging would orphan one of them.
 */
const LEGACY_SYNONYMS = new Set([
  'risk_manage+riskManagement',
  'conflict_solving+conflictResolution',
  'organizing+organizationSkills',
]);

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
      expect(
        row[DEFAULT_LOCALE]?.trim(),
        `"${row.code}" has no ${DEFAULT_LOCALE} label`,
      ).toBeTruthy();
      for (const locale of SUPPORTED_LOCALES) {
        const label = row[locale];
        // Absent is fine (it falls back); present-but-empty is not.
        if (label !== undefined)
          expect(label.trim(), `"${row.code}".${locale} is blank`).toBeTruthy();
      }
    }
  });

  /**
   * A dropdown must never offer a value the form would then refuse to save. This
   * caught a real one: seven `colleges` rows are longer than 100 characters in
   * Russian, and `educationSchema.institution` capped at 100 — so picking those
   * colleges in a Russian UI failed validation on a value the app itself supplied.
   * The cap moved to 150; this is what keeps the two in step.
   */
  it('offers no label longer than the field it feeds', () => {
    const max = FIELD_MAX[group as DictionaryGroup];
    for (const row of rows) {
      for (const locale of SUPPORTED_LOCALES) {
        const label = row[locale];
        if (label === undefined) continue;
        expect(
          label.length,
          `"${row.code}".${locale} is ${label.length} chars`,
        ).toBeLessThanOrEqual(max);
      }
    }
  });

  /**
   * Two rows with the same label are indistinguishable in the dropdown, and
   * `findByLabel` can only return one of them — so the other's code is
   * unreachable and its value silently stops re-localizing.
   */
  it('has no two rows sharing a label within one locale', () => {
    const collisions: string[] = [];
    for (const locale of SUPPORTED_LOCALES) {
      const seen = new Map<string, string>();
      for (const row of rows) {
        const label = row[locale];
        if (label === undefined) continue;
        const first = seen.get(label);
        if (first && !LEGACY_SYNONYMS.has(`${first}+${row.code}`)) {
          collisions.push(`${locale}: "${label}" is both ${first} and ${row.code}`);
        }
        if (!first) seen.set(label, row.code);
      }
    }
    expect(collisions).toEqual([]);
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
      ar: 'arab',
      // The row predates the locale, and its code is the original dictionary's
      // `hispanic` rather than `spanish` — a stored CV may already reference it.
      es: 'hispanic',
      he: 'hebrew',
      ko: 'korean',
      zh: 'chinese',
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
