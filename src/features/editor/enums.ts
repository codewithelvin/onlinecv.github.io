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
