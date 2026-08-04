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
export const DEGREE_LEVELS: DegreeLevel[] = ['bachelor', 'magister', 'doctorant', 'residency', 'phd'];
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
export const CONTACT_TYPES: ContactType[] = [
  'mobile',
  'landline',
  'email',
  'fax',
  'skype',
  'telegram',
  'linkedin',
  'facebook',
  'address',
  'website',
  'github',
  'whatsapp',
  'instagram',
  'x',
];

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
