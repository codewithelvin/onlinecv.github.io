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
  | 'colleges';

export interface DictionaryEntry {
  /** Stable id referenced from resume entries (e.g. `education[].code`). */
  code: string;
  group: DictionaryGroup;
  az: string;
  en: string;
  ru: string;
}
