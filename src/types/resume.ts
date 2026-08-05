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
 *
 * Two-letter ISO 639-1 throughout, so `zh` is Mandarin in SIMPLIFIED characters
 * (`zh-Hans-CN`): one written standard per code, chosen because it is the one the
 * app's Chinese dictionary rows and universities are written in. Traditional
 * (`zh-TW`/`zh-HK`) would be a second locale, not a variant of this one — the
 * labels differ, not just the glyphs.
 */
export type Locale =
  'az' | 'ru' | 'en' | 'ka' | 'ar' | 'es' | 'he' | 'ko' | 'zh' | 'fr' | 'de' | 'it' | 'tr';

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

/**
 * The official Azerbaijani driver-license categories, offered as SUGGESTIONS
 * only — see `GeneralInfo.driverLicense` for why they cannot be a constraint.
 */
export type LicenseCategory =
  'A1' | 'A' | 'B1' | 'B' | 'BE' | 'C1' | 'C' | 'CE' | 'D1' | 'D' | 'DE';

export type Gender = 'male' | 'female';

export type MaritalStatus = 'single' | 'married';

/** Education institution type (maps to a dictionary group). */
export type EducationType = 'school' | 'college' | 'university';

/** Employment type (`experiencetype` in the source). */
export type EmploymentType =
  'fullTime' | 'partTime' | 'selfEmployed' | 'freelance' | 'contract' | 'internship' | 'seasonal';

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
  /** City — suggestions from the `cities` dictionary, free text accepted. */
  location?: string;
  /** `cities` dictionary code when the typed city resolved to a listed one. */
  locationCode?: string;
}

export interface GeneralInfo {
  /**
   * Optional in the MODEL, required in the wizard's yup schema: nothing is
   * preselected, so an unfinished resume genuinely has no value here and the
   * templates skip the row (they already guard on falsy).
   */
  gender?: Gender;
  /** Optional to ENTER as well (see `hiddenFields`) — no yup rule requires it. */
  maritalStatus?: MaritalStatus;
  /** Nationality dictionary code or free text; `''` when not given. */
  nationality: string;
  /** `YYYY-MM-DD`. Age is derived for display, never stored. */
  dateOfBirth: string;
  militaryStatus?: MilitaryStatus;
  /**
   * Licence categories held. Multi-select; the source stored a single varchar.
   *
   * `string[]`, NOT `LicenseCategory[]`: the categories are **not the same in
   * every country**, so the shipped list (`LICENSE_CATEGORIES`, the Azerbaijani
   * set) can only be a suggestion — §13.1's rule, and the same reason
   * `nationality` is a string. The EU/UNECE model also has `AM`, `A2`, `C1E`,
   * `D1E`; Russia issues `M`, `Tm`, `Tb`; Israel has `D2`/`D3` plus numeric
   * classes; most Arab countries do not use letter categories at all. Note the
   * axis is the country that ISSUED the licence, never the UI language — an
   * Azerbaijani writing a Spanish CV still holds Azerbaijani categories, which
   * is why this is free text rather than a per-locale list.
   *
   * Values reach the CV verbatim, so normalize through
   * `normalizeLicenseCategories` before storing.
   */
  driverLicense?: string[];
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
  /** `positions` dictionary code when the typed title resolved to a listed one. */
  positionCode?: string;
  employmentType?: EmploymentType;
  location?: string;
  /** `cities` dictionary code when the typed city resolved to a listed one. */
  locationCode?: string;
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
  /**
   * `faculties` dictionary code when the typed faculty resolved to a listed one.
   * Kept separate from `code` (the institution) because an item carries three
   * independent dictionary-backed values; the code is the stored truth and
   * `faculty` is the label snapshot re-derived at render time (§13.1).
   */
  facultyCode?: string;
  specialization?: string;
  /** `specialities` dictionary code when picked; optional (free text otherwise). */
  specializationCode?: string;
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

/**
 * A personal-details field the user can keep OFF the rendered CV while still
 * holding the value in the editor (`Resume.hiddenFields`).
 *
 * Name, surname and CV title are deliberately absent: a CV without them is not a
 * CV, and every template's header is built from them. Everything else in the
 * "Əsas məlumatlar" panel is here — what belongs on a résumé differs by market
 * (many employers outside the region expect no photo, no marital status and no
 * date of birth), so the choice is the user's rather than the template's.
 */
export type HideableField =
  | 'avatar'
  | 'location'
  | 'gender'
  | 'maritalStatus'
  | 'nationality'
  | 'dateOfBirth'
  | 'militaryStatus'
  | 'driverLicense'
  | 'summary';

export interface Resume {
  /** Single-resume fixed key. */
  id: 'default';
  /** ISO timestamp. */
  updatedAt: string;
  /** Language of the EXPORTED CV's section headings (≠ UI locale). */
  locale: Locale;
  templateId: TemplateId;
  /**
   * Show the dimmed "Made with www.onlinecv.az" footer on the CV (preview AND
   * exported PDF). Opt-OUT: it defaults to on, and records persisted before the
   * flag existed carry no value, so every reader must treat `undefined` as on —
   * use `showAttribution()` rather than the raw field.
   */
  attribution?: boolean;
  /**
   * Personal-details fields kept out of the rendered CV (preview AND exported
   * PDF) while their values stay in the editor. Opt-OUT, like `attribution`:
   * absent or empty means everything is shown, so records persisted before the
   * feature existed render exactly as they did — read it through
   * `utils/field-visibility` rather than the raw field.
   */
  hiddenFields?: HideableField[];
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
  'experience' | 'education' | 'skills' | 'languages' | 'certifications' | 'interests' | 'projects';
