/**
 * Canonical resume data model (spec §13), flattened from the original OnlineCV
 * relational schema into a single embedded document. One resume per browser,
 * stored in IndexedDB under the fixed id `default`.
 */

/** A folder id under `src/templates/`, discovered at build time. Defaults to `classic`. */
export type TemplateId = string;

/**
 * UI + exported-CV language codes. Widening this union is step 1 of adding a
 * language: `LOCALES` in `app/i18n/locales.ts` is a total record over it, so the
 * compiler then lists everything that still needs the new entry.
 */
export type Locale = 'az' | 'ru' | 'en';

/**
 * A short label translated per locale. Only the default locale (`az`) is
 * required, so adding a language never breaks an existing template manifest —
 * untranslated names fall back. Read it with `utils/localized-text`.
 */
export type LocalizedText = Partial<Record<Locale, string>> & { az: string };

/** Academic degree (real dictionary values from the source schema). */
export type DegreeLevel = 'bachelor' | 'magister' | 'doctorant' | 'residency' | 'phd';

/** CEFR levels A1–C2 plus `native` (added beyond source — needs i18n key `dictionary.native`). */
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';

/** Military service status. */
export type MilitaryStatus = 'served' | 'unserved' | 'unfit';

/** Official Azerbaijani driver-license categories. */
export type LicenseCategory =
  | 'A1'
  | 'A'
  | 'B1'
  | 'B'
  | 'BE'
  | 'C1'
  | 'C'
  | 'CE'
  | 'D1'
  | 'D'
  | 'DE';

export type Gender = 'male' | 'female';

export type MaritalStatus = 'single' | 'married';

/** Education institution type (maps to a dictionary group). */
export type EducationType = 'school' | 'college' | 'university';

/** Employment type (`experiencetype` in the source). */
export type EmploymentType =
  | 'fullTime'
  | 'partTime'
  | 'selfEmployed'
  | 'freelance'
  | 'contract'
  | 'internship'
  | 'seasonal';

/**
 * Generic contact channel discriminator. Semantic names (not the source's MUI
 * icon keys); `x` = Twitter/X. `website|github|whatsapp|instagram|x` are added
 * beyond the source schema.
 */
export type ContactType =
  | 'mobile'
  | 'landline'
  | 'email'
  | 'fax'
  | 'skype'
  | 'telegram'
  | 'linkedin'
  | 'facebook'
  | 'address'
  | 'website'
  | 'github'
  | 'whatsapp'
  | 'instagram'
  | 'x';

/** Avatar media. No cover image (dropped per FR-11). */
export interface Media {
  /** Base64 data URL; square user-framed crop (~400px), JPEG-compressed to tens of KB. */
  avatar?: string;
}

export interface Basics {
  firstName: string;
  lastName: string;
  /** `cvtitle` — e.g. "Frontend Developer". */
  headline: string;
  /** City (free-text; not in source schema). */
  location?: string;
}

export interface GeneralInfo {
  gender: Gender;
  maritalStatus: MaritalStatus;
  /** Nationality dictionary code or free text. */
  nationality: string;
  /** `YYYY-MM-DD`. Age is derived for display, never stored. */
  dateOfBirth: string;
  militaryStatus?: MilitaryStatus;
  /** Multi-select; source stored a single varchar. */
  driverLicense?: LicenseCategory[];
}

export interface ContactItem {
  id: string;
  type: ContactType;
  value: string;
}

export interface Contact {
  /** Required primary email at resume level (`cvuseremail`). */
  email: string;
  items: ContactItem[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  employmentType?: EmploymentType;
  location?: string;
  /** `YYYY-MM-DD` (full date, displayed DD.MM.YYYY). */
  startDate: string;
  /** `YYYY-MM-DD`; empty when `current`. */
  endDate?: string;
  current: boolean;
  description?: string;
  /** Achievement bullets, each ≤ 200 chars (ATS-friendly). */
  highlights?: string[];
}

export interface EducationItem {
  id: string;
  type: EducationType;
  /** Universities/colleges dictionary code when picked; optional. */
  code?: string;
  institution: string;
  faculty?: string;
  specialization?: string;
  degree?: DegreeLevel;
  /** `YYYY-MM`. */
  startDate: string;
  /** `YYYY-MM`; empty when `current`. */
  endDate?: string;
  /** "currently studying" → renders "Present". */
  current: boolean;
  comment?: string;
}

export interface Skill {
  id: string;
  /** Skills dictionary code when picked; optional. */
  code?: string;
  name: string;
  /** Required integer 1–100; drives the % bar (visual templates) / text (ATS). */
  level: number;
}

export interface LanguageItem {
  id: string;
  /** Languages dictionary code — HARD constraint, one of the 17 (no free-text). */
  code: string;
  /** Resolved name (fallback text). */
  name: string;
  level: LanguageLevel;
}

export interface Certification {
  id: string;
  name: string;
  organization: string;
  /** `YYYY-MM`. */
  issueDate: string;
  /** `YYYY-MM`; empty = no expiry. */
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  comment?: string;
}

export interface Interest {
  id: string;
  /** Interests dictionary code when picked; optional. */
  code?: string;
  name: string;
}

/** Spec addition — no source table; optional section. */
export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  url?: string;
  /** Each bullet ≤ 200 chars. */
  highlights?: string[];
}

export interface Resume {
  /** Single-resume fixed key. */
  id: 'default';
  /** ISO timestamp. */
  updatedAt: string;
  /** Language of the EXPORTED CV's section headings (≠ UI locale). */
  locale: Locale;
  templateId: TemplateId;
  media: Media;
  basics: Basics;
  generalInfo: GeneralInfo;
  contact: Contact;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: Skill[];
  languages: LanguageItem[];
  certifications?: Certification[];
  interests?: Interest[];
  projects?: ProjectItem[];
}

/** Keys of `Resume` whose value is an array of items carrying an `id`. */
export type ResumeListSection =
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'certifications'
  | 'interests'
  | 'projects';
