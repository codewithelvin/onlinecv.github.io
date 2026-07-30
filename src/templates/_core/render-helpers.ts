import type {
  ContactItem,
  EducationItem,
  ExperienceItem,
  Resume,
} from '../../types/resume';
import { calcAge } from '../../utils/date';

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

/** Full display name. */
export function fullName(resume: Resume): string {
  return `${resume.basics.firstName} ${resume.basics.lastName}`.trim();
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
    pairs.push([
      t('cvLabels.dateOfBirth'),
      `${formatDate(gi.dateOfBirth, fullDateFormat)}${age !== null ? ` (${age} ${t('common.years')})` : ''}`,
    ]);
  }
  if (gi.gender) pairs.push([t('cvLabels.gender'), t(`dictionary.${gi.gender}`)]);
  if (gi.maritalStatus) pairs.push([t('cvLabels.maritalStatus'), t(`dictionary.${gi.maritalStatus}`)]);
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
