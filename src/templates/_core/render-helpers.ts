import type { ContactItem, EducationItem, ExperienceItem, Resume } from '../../types/resume';
import { calcAge, localizeDigits } from '../../utils/date';

/**
 * Pure, side-effect-free helpers shared by templates. Defensive against absent
 * optional sections (§7.1 forward-compatibility) and enforce BR-5 (empty
 * sections omitted) / BR-6 (current → "Present").
 */

/**
 * Marks a block that must never be split across pages. Spread onto a `<div>`;
 * `services/pdf.ts` turns the attribute into react-pdf's `wrap={false}`, and the
 * browser ignores it, having no pages to break.
 *
 * Templates use it for "section heading + its first entry", which is what stops
 * a heading from being stranded at the foot of a page with its content overleaf.
 * `wrap={false}` is deliberate: it is the ONE pagination rule react-pdf applies
 * unconditionally (`shouldSplit && !canWrap` → move the whole block down).
 * `minPresenceAhead` looked like the natural fit and could not be made to work
 * here — react-pdf refuses to move a first child ("breaking won't improve
 * presence"), and putting the hint on the entries instead let the first entry
 * jump away from a heading that had already claimed its place.
 */
export const KEEP_TOGETHER = { 'data-keep-together': true } as const;

/**
 * Scripts that write the family name FIRST and run it straight into the given
 * name: 李明, 김민준, 山田太郎 — never 明 李.
 *
 * Derived from the NAME rather than from `resume.locale`, for the same reason
 * `NO_SPACE_BEFORE_UNIT` below is derived from the unit: the convention belongs to
 * the name, not to the document. So 李明 comes out right on an Azerbaijani CV, and
 * "John Smith" stays "John Smith" on a Chinese one — which keying this off the CV
 * language would have got backwards in both directions.
 */
const FAMILY_NAME_FIRST =
  /^[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]+$/u;

/**
 * Full display name, in the order the name's own script writes it.
 *
 * ⚠️ A CJK name is NOT "first last". Chinese, Korean and Japanese all put the
 * family name first and use no separator, and a Chinese reader cannot recover the
 * right reading from "明李" — 李 is one of the commonest surnames in the world, so
 * the reversed form does not read as an unusual ordering, it reads as a different
 * (nonexistent) name. Same class of defect as the `min(3)` that used to reject
 * every Korean surname, and fixed in the same place: core, where every template
 * present and future picks it up without knowing about it.
 *
 * Both parts must be CJK before the order flips. A mixed name ("Li 明") is
 * someone deliberately writing one part in Latin, and the Latin order is then the
 * one they meant.
 */
export function fullName(resume: Resume): string {
  const { lead, trail, cjk } = orderedName(resume.basics.firstName, resume.basics.lastName);
  return (cjk ? `${lead}${trail}` : `${lead} ${trail}`).trim();
}

/**
 * The monogram drawn where there is no avatar — family name first for a CJK name,
 * exactly as `fullName` orders it.
 *
 * Takes the two names rather than a `Resume` because it has TWO callers in different
 * layers: the modern template's sidebar and the editor's `AvatarField`. Having them
 * both come here is the point — the editor was showing 明李 beside a preview that
 * said 李明, which is precisely the drift that happens when a rule this small is
 * reimplemented inline.
 */
export function nameInitials(firstName: string, lastName: string): string {
  const { lead, trail } = orderedName(firstName, lastName);
  return `${lead[0] ?? ''}${trail[0] ?? ''}`.toUpperCase();
}

/**
 * The two name parts in DISPLAY order — `lead` is whichever is written first — plus
 * whether this is a family-name-first name, which is also what decides the
 * separator (CJK names run together, everything else takes a space).
 *
 * Both parts must be CJK before the order flips: a mixed name ("明 Li") is someone
 * deliberately writing one part in Latin, and the Latin order is then the one they
 * meant.
 */
function orderedName(
  firstName: string,
  lastName: string,
): { lead: string; trail: string; cjk: boolean } {
  const given = firstName.trim();
  const family = lastName.trim();
  const cjk =
    given !== '' &&
    family !== '' &&
    FAMILY_NAME_FIRST.test(given) &&
    FAMILY_NAME_FIRST.test(family);
  return cjk ? { lead: family, trail: given, cjk } : { lead: given, trail: family, cjk };
}

/** Whether an optional list section has any items. */
export function hasItems<T>(items: T[] | undefined): items is T[] {
  return Array.isArray(items) && items.length > 0;
}

/** All contact channels as a flat list, primary email first (BR: email required). */
export function contactChannels(resume: Resume): ContactItem[] {
  const email = resume.contact.email.trim();
  const primary: ContactItem[] = email
    ? [{ id: 'primary-email', type: 'email', value: email }]
    : [];
  return [...primary, ...resume.contact.items.filter((c) => c.value.trim().length > 0)];
}

/**
 * How a contact channel is PRINTED on the CV.
 *
 * Profile links are stored as full URLs, and printed raw they are both ugly and
 * long enough to blow out a one-line contact header
 * (`https://www.linkedin.com/in/elvinihuseynov/`). Dropping the scheme, the
 * `www.` and the trailing slash leaves `linkedin.com/in/elvinihuseynov`, which
 * still parses as a link for an ATS and reads like the printed CVs people
 * expect. Non-URL channels (phones, e-mail, address) are untouched.
 */
export function contactDisplay(item: ContactItem): string {
  const value = item.value.trim();
  if (!/^https?:\/\//i.test(value)) return value;
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
}

/**
 * Scripts that set a counter word TIGHT against its number: `39세`, not `39 세`.
 *
 * Derived from the unit string itself rather than declared per locale, for the
 * same reason `utils/arabic`'s tables are derived — the rule is a property of the
 * word being appended, so a future Japanese or Chinese locale gets it for free and
 * `LocaleMeta` needs no new field. Korean is the case that raised it: `common.years`
 * is `세`, and the hard-coded space read as a typo on the finished CV.
 */
const NO_SPACE_BEFORE_UNIT =
  /^[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

/** Join a value and its unit the way the unit's own script writes it. */
export function withUnit(value: string, unit: string): string {
  return NO_SPACE_BEFORE_UNIT.test(unit) ? `${value}${unit}` : `${value} ${unit}`;
}

/**
 * The "general info" rows, in ONE fixed order for every template.
 *
 * This is CV data, not template design: which of these a reader sees must not
 * depend on which layout they picked. Built here so a template can only decide
 * how to draw the rows, never which ones exist — and so a new template gets the
 * full set for free.
 */
export function generalInfoPairs(
  resume: Resume,
  t: (key: string) => string,
  formatDate: (iso: string, fmt?: string) => string,
  fullDateFormat: string,
): Array<[string, string]> {
  const gi = resume.generalInfo;
  const pairs: Array<[string, string]> = [];
  if (gi.dateOfBirth) {
    const age = calcAge(gi.dateOfBirth);
    // The age is the one NUMBER on the CV that dayjs never formats, so it needs
    // the locale's own digits applied by hand (`٣٤` on an Arabic CV, matching
    // the date beside it).
    const years = age !== null ? localizeDigits(String(age), resume.locale) : '';
    pairs.push([
      t('cvLabels.dateOfBirth'),
      `${formatDate(gi.dateOfBirth, fullDateFormat)}${
        years ? ` (${withUnit(years, t('common.years'))})` : ''
      }`,
    ]);
  }
  if (gi.gender) pairs.push([t('cvLabels.gender'), t(`dictionary.${gi.gender}`)]);
  if (gi.maritalStatus)
    pairs.push([t('cvLabels.maritalStatus'), t(`dictionary.${gi.maritalStatus}`)]);
  if (gi.nationality) pairs.push([t('cvLabels.nationality'), gi.nationality]);
  if (gi.militaryStatus) pairs.push([t('cvLabels.military'), t(`dictionary.${gi.militaryStatus}`)]);
  if (gi.driverLicense && gi.driverLicense.length > 0) {
    pairs.push([t('cvLabels.driverLicense'), gi.driverLicense.join(', ')]);
  }
  return pairs;
}

/**
 * A formatted date range using the provided formatter. `current` renders the
 * localized "Present" for the end (BR-6). `fmt` is the dayjs format string.
 */
export function dateRange(
  item: Pick<ExperienceItem | EducationItem, 'startDate' | 'endDate' | 'current'>,
  format: (iso: string, fmt?: string) => string,
  fmt: string,
  presentLabel: string,
): string {
  const start = item.startDate ? format(item.startDate, fmt) : '';
  const end = item.current ? presentLabel : item.endDate ? format(item.endDate, fmt) : '';
  if (start && end) return `${start} — ${end}`;
  return start || end;
}

/** Non-empty, trimmed highlight bullets. */
export function highlights(items: string[] | undefined): string[] {
  return (items ?? []).map((h) => h.trim()).filter(Boolean);
}
