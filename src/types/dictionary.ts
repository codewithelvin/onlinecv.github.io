import type { Locale } from './resume';

/**
 * Predefined dictionary types (spec §13.1). Datasets ship as static JSON under
 * `src/data/` in a unified flat shape and power AutoComplete/Select inputs as
 * suggestions (free-text fallback), except `languages` which is a hard constraint.
 */

export type DictionaryGroup =
  | 'skills'
  | 'languages'
  | 'interests'
  | 'nationality'
  | 'universities'
  | 'colleges'
  | 'faculties'
  | 'specialities'
  | 'positions'
  | 'cities';

/**
 * One dictionary row: a stable `code` plus one label column per locale.
 *
 * The label columns are OPTIONAL on purpose — a locale added later (Georgian,
 * Turkish, …) starts with no dictionary translations, and the datasets are
 * hundreds of rows. Read labels through `dictionaryLabel()`, which falls back to
 * `DEFAULT_LOCALE` and finally to the code.
 */
export interface DictionaryEntry extends Partial<Record<Locale, string>> {
  /** Stable id referenced from resume entries (e.g. `education[].code`). */
  code: string;
  group: DictionaryGroup;
}

/** Loaded dictionaries by group; groups that were never needed are absent. */
export type DictionaryBundle = Partial<Record<DictionaryGroup, DictionaryEntry[]>>;
