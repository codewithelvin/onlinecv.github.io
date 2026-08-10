import type { TFunction } from 'i18next';
import type {
  ContactType,
  DegreeLevel,
  EducationType,
  EmploymentType,
  Gender,
  LanguageLevel,
  LicenseCategory,
  MaritalStatus,
  MilitaryStatus,
} from '../../types/resume';
import type { Option } from '../../components/form/fields';

/** Fixed enum value lists (spec §13.1 fixed enums). */
export const GENDERS: Gender[] = ['male', 'female'];
export const MARITAL_STATUSES: MaritalStatus[] = ['single', 'married'];
export const MILITARY_STATUSES: MilitaryStatus[] = ['served', 'unserved', 'unfit'];
export const DEGREE_LEVELS: DegreeLevel[] = [
  'bachelor',
  'magister',
  'doctorant',
  'residency',
  'phd',
];
export const EDUCATION_TYPES: EducationType[] = ['school', 'college', 'university'];
export const EMPLOYMENT_TYPES: EmploymentType[] = [
  'fullTime',
  'partTime',
  'selfEmployed',
  'freelance',
  'contract',
  'internship',
  'seasonal',
];
export const LANGUAGE_LEVELS: LanguageLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'];
export const LICENSE_CATEGORIES: LicenseCategory[] = [
  'A1',
  'A',
  'B1',
  'B',
  'BE',
  'C1',
  'C',
  'CE',
  'D1',
  'D',
  'DE',
];
/**
 * Every channel the MODEL can hold, in the order the picker lists them.
 *
 * A `Record` keyed by `ContactType` rather than an array, so widening that union
 * makes `tsc` name the channel that is missing here — an array would simply be
 * one short, and the new channel would be unofferable with nothing to say so.
 * Object key order is insertion order, which is what `ALL_CONTACT_TYPES` reads.
 */
const CONTACT_TYPE_ORDER: Record<ContactType, true> = {
  mobile: true,
  landline: true,
  email: true,
  fax: true,
  skype: true,
  telegram: true,
  linkedin: true,
  facebook: true,
  address: true,
  website: true,
  github: true,
  whatsapp: true,
  instagram: true,
  x: true,
};

/** Every channel the model can hold, offered or not. */
export const ALL_CONTACT_TYPES = Object.keys(CONTACT_TYPE_ORDER) as ContactType[];

/**
 * Channels that still WORK but are no longer offered to someone adding a contact.
 *
 * ⚠️ Microsoft retired consumer Skype in May 2025, so proposing it to someone
 * writing a CV today is proposing a dead address. Deleting the channel outright
 * would have been worse: a resume saved before then may hold one, and silently
 * dropping a contact the user typed is not a fix. So `skype` keeps everything it
 * had — the `skype:` link in `contactHref`, its channel mark, its
 * `dictionary.skype` label, its place in `ContactType` — and only leaves the list
 * of things you can pick. An entry that already exists still renders, and
 * `contactTypeChoices` keeps it editable.
 */
export const RETIRED_CONTACT_TYPES: ContactType[] = ['skype'];

/**
 * The channels to OFFER, given the type the item being edited currently has.
 *
 * A retired channel reappears for exactly the item that already uses it, which is
 * what stops "no longer offered" from turning into "cannot be corrected": without
 * it the Select would hold a value that is not among its options, and AntD would
 * show the raw code `skype` where every other row shows a translated label.
 */
export function contactTypeChoices(current?: string): ContactType[] {
  return ALL_CONTACT_TYPES.filter(
    (type) => !RETIRED_CONTACT_TYPES.includes(type) || type === current,
  );
}

/** The channels offered for a NEW contact. */
export const CONTACT_TYPES: ContactType[] = contactTypeChoices();

/** Build localized `{ value, label }` options for a fixed enum under `dictionary.*`. */
export function dictOptions(values: readonly string[], t: TFunction): Option[] {
  return values.map((v) => ({ value: v, label: t(`dictionary.${v}`) }));
}

/** Driver-license options are the raw category codes (no translation). */
export function licenseOptions(): Option[] {
  return LICENSE_CATEGORIES.map((v) => ({ value: v, label: v }));
}

/** Longest accepted licence category — room for a word, not a sentence. */
const LICENSE_MAX_LENGTH = 20;
/** Most categories one person can hold; keeps the CV row a row. */
const LICENSE_MAX_COUNT = 15;

/**
 * Clean up licence categories typed by hand.
 *
 * The field accepts free text because the categories differ by issuing country
 * (see `GeneralInfo.driverLicense`), so `LICENSE_CATEGORIES` cannot filter the
 * input any more — but the values are printed on the CV verbatim, so they still
 * need trimming, de-duplication and a length bound.
 *
 * Case is deliberately left alone: upper-casing would be right for `b`→`B` and
 * WRONG for Russia's `Tm`/`Tb`, which are officially mixed case.
 */
export function normalizeLicenseCategories(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value.replace(/\s+/g, ' ').trim().slice(0, LICENSE_MAX_LENGTH);
    // Compare case-insensitively so "b" cannot be added next to "B".
    const key = clean.toUpperCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length === LICENSE_MAX_COUNT) break;
  }
  return out;
}
