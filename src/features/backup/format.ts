import type {
  Certification,
  ContactItem,
  ContactType,
  EducationItem,
  ExperienceItem,
  HideableField,
  HistorySection,
  Interest,
  LanguageItem,
  ProjectItem,
  Resume,
  Skill,
} from '../../types/resume';
import { DEFAULT_LOCALE, isLocale } from '../../app/i18n/locales';
import { DEFAULT_TEMPLATE_ID } from '../../utils/empty-resume';
import { HIDEABLE_FIELDS } from '../../utils/field-visibility';
import { HISTORY_SECTIONS } from '../../utils/sort-history';
import { createId } from '../../utils/id';
import { hasTemplate } from '../../templates/_core/registry';
import {
  ALL_CONTACT_TYPES,
  DEGREE_LEVELS,
  EDUCATION_TYPES,
  EMPLOYMENT_TYPES,
  GENDERS,
  LANGUAGE_LEVELS,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  normalizeLicenseCategories,
} from '../editor/enums';

/**
 * The resume as a FILE — the one way data leaves and re-enters the app.
 *
 * The app holds one resume in one browser (BR-1), which is fine until the
 * browser is not the same one: a new laptop, a wiped profile, a phone. There is
 * no account to restore from and deliberately no backend to ask (§26), so the
 * only portable copy the user can own is a file on their own disk. This module
 * is both halves of that: `serializeBackup` writes it, `parseBackup` reads it
 * back.
 *
 * **JSON, not XML.** The stored model is already a plain JSON document — the
 * IndexedDB record is a structured clone of exactly this object graph — so the
 * writer is `JSON.stringify` and the reader is `JSON.parse`, both built in. XML
 * would need a serializer AND a parser: either two new dependencies (§27
 * forbids) or hand-rolled ones, and a hand-rolled XML reader is where entity
 * expansion and encoding bugs live. It would also have to escape or CDATA-wrap a
 * ~30 KB base64 avatar and declare its own encoding, where JSON is UTF-8 by
 * definition and carries all twenty languages' scripts with no declaration at
 * all. §2's long-term goal already named the format; this only implements it.
 *
 * **The envelope is not decoration.** A bare `Resume` in a `.json` file is
 * indistinguishable from any other JSON on the user's disk, and unversioned: the
 * importer could only guess. `format` lets a wrong file be REFUSED with a
 * sentence that says why, and `version` is what lets a future model change
 * migrate instead of misread.
 *
 * **What it deliberately does NOT carry:** the UI language and which editor
 * sections were expanded. Both are properties of a browser rather than of a CV,
 * and a restore that silently switched the interface language out from under
 * someone reading it in French would be a surprise, not a restoration.
 */

/** Identifies a file as ours. Written on export, required on import. */
export const BACKUP_FORMAT = 'onlinecv.resume';

/** Bumped only when the shape changes in a way an older reader cannot handle. */
export const BACKUP_VERSION = 1;

/** The file's extension and MIME type — used by the download and the picker. */
export const BACKUP_EXTENSION = 'json';
export const BACKUP_MIME = 'application/json';

/**
 * A file bigger than this is not one of ours: a full CV with a photo is ~40 KB,
 * and the avatar's own hard ceiling (FR-15) is the only thing that can make it
 * grow. The bound exists so a mis-picked 2 GB file is refused before it is read
 * into memory rather than after.
 */
export const MAX_BACKUP_BYTES = 16 * 1024 * 1024;

export interface ResumeBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** When the file was written, ISO. Informational — never used to order data. */
  exportedAt: string;
  resume: Resume;
}

/** Why a file could not be restored. Each maps to a `backup.error.*` message. */
export type BackupError = 'notJson' | 'notBackup' | 'tooNew';

export type BackupParseResult =
  | {
      ok: true;
      resume: Resume;
      /**
       * Field paths that could NOT be restored as written — an unreadable date,
       * an unknown contact channel, a template this build does not have. Machine
       * paths, for the console; the UI reports the count. Empty for every file
       * this app wrote itself.
       */
      dropped: string[];
    }
  | { ok: false; error: BackupError };

/** The envelope for `resume`, ready to serialize. */
export function buildBackup(resume: Resume): ResumeBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    resume,
  };
}

/**
 * The file's contents.
 *
 * Indented, at a cost of about a fifth of a file whose bulk is one base64 string
 * anyway: this is the user's own data on the user's own disk, and the difference
 * between something they can open and read and something they cannot is worth
 * more than the bytes.
 */
export function serializeBackup(resume: Resume): string {
  return `${JSON.stringify(buildBackup(resume), null, 2)}\n`;
}

/* ── reading ─────────────────────────────────────────────────────────────── */

/**
 * Longest accepted value per KIND of field, in characters.
 *
 * These bound memory and the rendered page; they are deliberately NOT the yup
 * maxima from `features/editor/schemas`. Import is lenient about CONTENT and
 * strict about SHAPE: a value that breaks a validation rule is kept and shows up
 * as an inline error on the field that owns it, which the user can see and fix,
 * where trimming it to the rule's limit would silently rewrite their CV. What
 * these stop is the pathological case — a hand-edited file with a megabyte in
 * `headline` — not an honest one.
 */
const MAX_SHORT = 200;
const MAX_LINE = 400;
const MAX_TEXT = 2000;
/** Entries in one section, and bullets under one entry. */
const MAX_ITEMS = 100;
const MAX_HIGHLIGHTS = 50;
/**
 * The avatar as a base64 data URL. FR-15 hard-rejects a source image over
 * ~10 MB; base64 costs a third on top, and what the app actually stores is tens
 * of KB.
 */
const MAX_AVATAR_CHARS = 14 * 1024 * 1024;

type JsonObject = Record<string, unknown>;

/**
 * `value` as a plain object, or an empty one.
 *
 * Note what is never done with the result: it is never spread into an output.
 * Every object this module returns is built key by key from the model's own
 * field list, so a file carrying `__proto__`, `constructor` or any other key is
 * not so much sanitized as never read — which is also why an unknown field
 * cannot reach IndexedDB and reappear in a later export.
 */
function object(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Strictly `true`. A truthy `1` or `"yes"` is not a boolean anyone stored. */
function boolean(value: unknown): boolean {
  return value === true;
}

/**
 * Characters DELETED from every imported string.
 *
 * The C0/C1 control ranges print as nothing on screen and corrupt the PDF's text
 * layer, so an invisible `\u0001` in a name is a defect with no upside.
 * `\ufffc` is the specific one worth naming: react-pdf uses the
 * object-replacement character to mark an inline image, and the app patches its
 * font resolution for exactly that code point (see the contact-channel marks) —
 * one sitting in the user's own text would be drawn as a contact mark's
 * placeholder.
 *
 * Deleted rather than replaced with a space, and the difference is visible: a
 * control character has no width, so `El\u0001vin` is one word carrying a stray
 * byte, and substituting a space would turn a name into two. Tab, newline and
 * carriage return are deliberately NOT in this class — those are whitespace,
 * and each function below decides what to do with them.
 *
 * Bidi controls are deliberately LEFT ALONE. They are legitimate content in
 * Arabic and Hebrew text, and this app inserts them itself when it renders a
 * phone number; stripping them to guard against a display trick would mangle
 * real names in two of the twenty languages.
 */
// The rule exists to catch a control character written into a pattern by
// accident; here they ARE the subject, and every code point in the class is
// listed because it must never reach a CV or a PDF text layer.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffc]/g;

/** A single-line value: every run of whitespace becomes one space. */
function line(value: unknown, max = MAX_SHORT): string {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** A multi-line value: line breaks survive, control characters do not. */
function block(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').replace(CONTROL, '').trim().slice(0, max);
}

/**
 * An optional value: an empty one becomes absent.
 *
 * `''` and "no value" mean the same thing to every reader in the app (BR-5 omits
 * an empty field), and collapsing them is what makes the whole sanitizer
 * idempotent — the property the round-trip test rests on.
 */
function optional(value: string): string | undefined {
  return value || undefined;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

/**
 * An ISO date at the precision the field stores, or `''`.
 *
 * A month-precision field accepts a full date and drops the day — that part was
 * never displayed, so nothing the user could see changes. The reverse is
 * refused: turning `2020-06` into `2020-06-01` would print "01.06.2020" on a
 * work-experience row, inventing a day nobody typed. An empty required date is a
 * visible inline error the user can fix; an invented one is not.
 *
 * `Date.parse` is the second half of the check, because the pattern alone admits
 * `2020-13-45`. ISO date strings are validated strictly, so an impossible date
 * is `NaN` — including 30 February.
 */
function isoDate(value: unknown, precision: 'day' | 'month'): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const candidate = precision === 'month' && ISO_DAY.test(raw) ? raw.slice(0, 7) : raw;
  const pattern = precision === 'day' ? ISO_DAY : ISO_MONTH;
  if (!pattern.test(candidate) || Number.isNaN(Date.parse(candidate))) return '';
  return candidate;
}

/**
 * An `http(s)` address, or nothing.
 *
 * `credentialUrl` and a project's `url` are written straight into an `href` by
 * every template, and unlike a contact value they never pass through
 * `contactHref`, whose `webUrl` is what keeps other schemes out of the document.
 * The editor's own yup requires a `//`, so a `javascript:` URL cannot be TYPED —
 * but a file is not typed, and an imported one would become a clickable script
 * in the preview. Hence the same rule, applied here: already `http(s)`, or a
 * bare host that can be given one, or dropped.
 */
function webAddress(value: unknown): string | undefined {
  const raw = line(value, MAX_LINE);
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  return /^[\w.-]+\.[a-z]{2,}/i.test(raw) ? `https://${raw}` : undefined;
}

/**
 * The avatar, or nothing.
 *
 * The one field on this path that is not text: it goes into an `<img src>` in
 * the preview and into a react-pdf `Image` in the export. Only a base64 image
 * data URL is accepted — a remote `https://…` would make the CV depend on
 * someone else's server and announce every render to it, and any other scheme is
 * simply not something the app ever stored.
 */
function avatar(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > MAX_AVATAR_CHARS) return undefined;
  const raw = value.trim();
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/\s]+={0,2}$/i.test(raw)
    ? raw
    : undefined;
}

/**
 * Sanitized items for one list section, with ids that are present and unique.
 *
 * A duplicate id is not cosmetic: `updateItem` and `removeItem` match on it, so
 * two rows sharing one would be edited and deleted together.
 *
 * An object is always KEPT, even with every field empty — an entry the user
 * typed is theirs to fix rather than ours to discard, and the editor already
 * flags an incomplete one. Two things are dropped, both reported: anything that
 * is not an object (it cannot be an entry at all), and whatever `build` itself
 * returns `null` for.
 */
function items<T extends { id: string }>(
  value: unknown,
  path: string,
  dropped: string[],
  build: (raw: JsonObject, itemPath: string) => Omit<T, 'id'> | null,
): T[] {
  const raw = array(value);
  const seen = new Set<string>();
  const out: T[] = [];
  for (const [index, entry] of raw.entries()) {
    const itemPath = `${path}[${index}]`;
    if (out.length >= MAX_ITEMS || typeof entry !== 'object' || entry === null) {
      dropped.push(itemPath);
      continue;
    }
    if (Array.isArray(entry)) {
      dropped.push(itemPath);
      continue;
    }
    const source = entry as JsonObject;
    const built = build(source, itemPath);
    if (!built) {
      dropped.push(itemPath);
      continue;
    }
    const given = line(source.id, 100);
    const id = given && !seen.has(given) ? given : createId();
    seen.add(id);
    out.push({ ...built, id } as T);
  }
  return out;
}

/** Bullet list under one entry — trimmed, empties removed, count bounded. */
function highlights(value: unknown): string[] | undefined {
  const out = array(value)
    .map((entry) => line(entry, MAX_TEXT))
    .filter(Boolean)
    .slice(0, MAX_HIGHLIGHTS);
  return out.length > 0 ? out : undefined;
}

/** Only the values this build knows, de-duplicated, or absent when none. */
function subset<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined {
  const out = array(value).flatMap((entry) => oneOf(entry, allowed) ?? []);
  return out.length > 0 ? [...new Set(out)] : undefined;
}

/**
 * A required date that was PRESENT and unreadable is worth reporting; an absent
 * one is not. Nothing is invented either way — the field comes back empty and
 * the editor flags it — so the only question is whether the user lost something
 * they had.
 */
function reportUnreadable(
  restored: string,
  source: unknown,
  path: string,
  dropped: string[],
): void {
  if (!restored && source) dropped.push(path);
}

function contactItems(value: unknown, dropped: string[]): ContactItem[] {
  return items<ContactItem>(value, 'contact.items', dropped, (raw) => {
    /**
     * A channel this build cannot name has nothing to render: no translated
     * label, no mark and no link, so AntD and the templates would both fall back
     * to printing the raw code. The item is dropped instead (and reported by
     * `items`) rather than coerced into some other channel, which would put the
     * value under a heading the user never chose.
     *
     * `ALL_CONTACT_TYPES` is the MODEL's list, not the picker's, so a channel
     * that has since been retired — skype — still loads.
     */
    const type = oneOf<ContactType>(raw.type, ALL_CONTACT_TYPES);
    return type ? { type, value: line(raw.value, MAX_LINE) } : null;
  });
}

function experience(value: unknown, dropped: string[]): ExperienceItem[] {
  return items<ExperienceItem>(value, 'experience', dropped, (raw, itemPath) => {
    const startDate = isoDate(raw.startDate, 'day');
    reportUnreadable(startDate, raw.startDate, `${itemPath}.startDate`, dropped);
    return {
      company: line(raw.company),
      position: line(raw.position),
      positionCode: optional(line(raw.positionCode)),
      employmentType: oneOf(raw.employmentType, EMPLOYMENT_TYPES),
      location: optional(line(raw.location)),
      locationCode: optional(line(raw.locationCode)),
      startDate,
      endDate: optional(isoDate(raw.endDate, 'day')),
      current: boolean(raw.current),
      description: optional(block(raw.description)),
      highlights: highlights(raw.highlights),
    };
  });
}

function education(value: unknown, dropped: string[]): EducationItem[] {
  return items<EducationItem>(value, 'education', dropped, (raw, itemPath) => {
    // Reported whether the source had a value or not, unlike a date: the model
    // requires a type, so this fallback INVENTS one. `university` is the value
    // whose form holds every field the other two do, so no data is lost with it.
    const type = oneOf(raw.type, EDUCATION_TYPES);
    if (!type) dropped.push(`${itemPath}.type`);
    const startDate = isoDate(raw.startDate, 'month');
    reportUnreadable(startDate, raw.startDate, `${itemPath}.startDate`, dropped);
    return {
      type: type ?? 'university',
      code: optional(line(raw.code)),
      institution: line(raw.institution),
      faculty: optional(line(raw.faculty)),
      facultyCode: optional(line(raw.facultyCode)),
      specialization: optional(line(raw.specialization)),
      specializationCode: optional(line(raw.specializationCode)),
      degree: oneOf(raw.degree, DEGREE_LEVELS),
      startDate,
      endDate: optional(isoDate(raw.endDate, 'month')),
      current: boolean(raw.current),
      comment: optional(line(raw.comment)),
    };
  });
}

/**
 * A skill level, 1–100.
 *
 * ⚠️ An unusable one falls back to the LOWEST value, never a middle guess, and
 * the same rule governs an unreadable language level below. Both fields are a
 * claim the user makes about themselves that a recruiter reads as their word: an
 * invented "50%" or "B2" overstates someone silently and on their behalf, where
 * an under-claim is wrong in the direction they will notice the first time they
 * look at their own CV.
 *
 * Rounding and the upper clamp are NOT reported: they normalize a number that
 * was already a level, where the fallback invents one that never existed. Over-
 * reporting would turn the count the user sees into noise.
 */
function skillLevel(value: unknown, itemPath: string, dropped: string[]): number {
  const numeric = typeof value === 'number' ? value : Number(line(value, 10));
  if (!Number.isFinite(numeric) || numeric < 1) {
    dropped.push(`${itemPath}.level`);
    return 1;
  }
  return Math.min(100, Math.round(numeric));
}

function skills(value: unknown, dropped: string[]): Skill[] {
  return items<Skill>(value, 'skills', dropped, (raw, itemPath) => ({
    code: optional(line(raw.code)),
    name: line(raw.name),
    level: skillLevel(raw.level, itemPath, dropped),
  }));
}

function languages(value: unknown, dropped: string[]): LanguageItem[] {
  return items<LanguageItem>(value, 'languages', dropped, (raw, itemPath) => {
    const level = oneOf(raw.level, LANGUAGE_LEVELS);
    // Invented, like the education type — so reported however the file read.
    if (!level) dropped.push(`${itemPath}.level`);
    return {
      code: optional(line(raw.code)),
      name: line(raw.name),
      level: level ?? 'A1',
    };
  });
}

function certifications(value: unknown, dropped: string[]): Certification[] {
  return items<Certification>(value, 'certifications', dropped, (raw, itemPath) => {
    const issueDate = isoDate(raw.issueDate, 'month');
    reportUnreadable(issueDate, raw.issueDate, `${itemPath}.issueDate`, dropped);
    const credentialUrl = webAddress(raw.credentialUrl);
    reportUnreadable(credentialUrl ?? '', raw.credentialUrl, `${itemPath}.credentialUrl`, dropped);
    return {
      name: line(raw.name),
      organization: line(raw.organization),
      issueDate,
      expirationDate: optional(isoDate(raw.expirationDate, 'month')),
      credentialId: optional(line(raw.credentialId)),
      credentialUrl,
      comment: optional(line(raw.comment)),
    };
  });
}

function interests(value: unknown, dropped: string[]): Interest[] {
  return items<Interest>(value, 'interests', dropped, (raw) => ({
    code: optional(line(raw.code)),
    name: line(raw.name),
  }));
}

function projects(value: unknown, dropped: string[]): ProjectItem[] {
  return items<ProjectItem>(value, 'projects', dropped, (raw, itemPath) => {
    const url = webAddress(raw.url);
    reportUnreadable(url ?? '', raw.url, `${itemPath}.url`, dropped);
    return {
      name: line(raw.name),
      description: optional(block(raw.description)),
      url,
      highlights: highlights(raw.highlights),
    };
  });
}

/**
 * A `Resume` rebuilt from untrusted input, field by field.
 *
 * Exported for its own tests. Everything the model does not declare is gone by
 * construction, every enum is checked against this build's own list, and every
 * invention or discard appends to `dropped`, so the caller can say how much did
 * not survive instead of implying that all of it did.
 */
export function sanitizeResume(input: unknown, dropped: string[] = []): Resume {
  const raw = object(input);
  const basics = object(raw.basics);
  const generalInfo = object(raw.generalInfo);
  const contact = object(raw.contact);
  const media = object(raw.media);

  // A template the build does not carry would leave the picker with nothing
  // selected and the stored id pointing at a folder that does not exist —
  // `getTemplate` would silently render `classic` anyway, so the fallback is
  // made explicit and reported here instead.
  const templateId = line(raw.templateId, 100);
  if (templateId && !hasTemplate(templateId)) dropped.push('templateId');
  const locale = isLocale(raw.locale) ? raw.locale : DEFAULT_LOCALE;
  // Only when the file HELD a language this build does not ship. An absent one
  // lost the user nothing — same reason `templateId` above is silent when it is
  // missing rather than unknown, and unlike an entry's required enum, where the
  // entry exists and is now carrying a guess.
  if (raw.locale !== undefined && raw.locale !== locale) dropped.push('locale');
  const restoredAvatar = avatar(media.avatar);
  reportUnreadable(restoredAvatar ?? '', media.avatar, 'media.avatar', dropped);
  const dateOfBirth = isoDate(generalInfo.dateOfBirth, 'day');
  reportUnreadable(dateOfBirth, generalInfo.dateOfBirth, 'generalInfo.dateOfBirth', dropped);

  return {
    // Fixed, whatever the file says: one resume per browser, under one key
    // (BR-1). A file carrying another id would otherwise write a record the app
    // never reads back.
    id: 'default',
    // The import IS the modification, so the timestamp is now rather than
    // whenever the file happened to be written.
    updatedAt: new Date().toISOString(),
    locale,
    templateId: hasTemplate(templateId) ? templateId : DEFAULT_TEMPLATE_ID,
    // Opt-out flags, so an absent value must stay absent rather than become
    // `true` or `[]` — that is what `showAttribution` and `utils/field-visibility`
    // read, and what every record written before those features existed carries.
    attribution: typeof raw.attribution === 'boolean' ? raw.attribution : undefined,
    hiddenFields: subset<HideableField>(raw.hiddenFields, HIDEABLE_FIELDS),
    manualOrder: subset<HistorySection>(raw.manualOrder, HISTORY_SECTIONS),
    media: { avatar: restoredAvatar },
    basics: {
      firstName: line(basics.firstName),
      lastName: line(basics.lastName),
      headline: line(basics.headline),
      location: optional(line(basics.location)),
      locationCode: optional(line(basics.locationCode)),
    },
    generalInfo: {
      gender: oneOf(generalInfo.gender, GENDERS),
      maritalStatus: oneOf(generalInfo.maritalStatus, MARITAL_STATUSES),
      // Free text or a dictionary code — §13.1's rule, so there is no list to
      // check it against.
      nationality: line(generalInfo.nationality),
      dateOfBirth,
      militaryStatus: oneOf(generalInfo.militaryStatus, MILITARY_STATUSES),
      // The editor's own normalizer: trimmed, de-duplicated, count-bounded, and
      // case left alone (Russia issues `Tm`, not `TM`).
      driverLicense: normalizeLicenseCategories(
        array(generalInfo.driverLicense).map((entry) => line(entry, 50)),
      ),
    },
    contact: {
      email: line(contact.email, MAX_LINE),
      items: contactItems(contact.items, dropped),
    },
    summary: block(raw.summary),
    experience: experience(raw.experience, dropped),
    education: education(raw.education, dropped),
    skills: skills(raw.skills, dropped),
    languages: languages(raw.languages, dropped),
    certifications: certifications(raw.certifications, dropped),
    interests: interests(raw.interests, dropped),
    projects: projects(raw.projects, dropped),
  };
}

/**
 * Read a backup file's text back into a resume.
 *
 * Refuses before it restores: unparseable text, a file that is not one of ours,
 * or one written by a newer version whose shape this build cannot be trusted to
 * understand. Anything it does accept comes back sanitized — see
 * `sanitizeResume` — so a hand-edited or truncated file yields a usable CV and a
 * list of what could not be read, never a crash and never a half-applied import.
 */
export function parseBackup(text: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notJson' };
  }

  const envelope = object(parsed);
  if (envelope.format !== BACKUP_FORMAT) return { ok: false, error: 'notBackup' };
  // A missing version is treated as this one: `format` already identified the
  // file, and refusing it would mean refusing our own data over a metadata field.
  const version = typeof envelope.version === 'number' ? envelope.version : BACKUP_VERSION;
  if (version > BACKUP_VERSION) return { ok: false, error: 'tooNew' };
  if (typeof envelope.resume !== 'object' || envelope.resume === null) {
    return { ok: false, error: 'notBackup' };
  }

  const dropped: string[] = [];
  return { ok: true, resume: sanitizeResume(envelope.resume, dropped), dropped };
}
