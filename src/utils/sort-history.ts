import type {
  Certification,
  EducationItem,
  ExperienceItem,
  HistorySection,
  Resume,
  ResumeListSection,
} from '../types/resume';

/**
 * Reverse-chronological order for the DATED sections — work experience,
 * education and certificates.
 *
 * A résumé is read newest-first: the reader wants the current job, not the
 * first one. Nothing in the editor enforces the order in which entries are
 * TYPED, though, so someone filling in their history from the beginning used to
 * export a CV that ran oldest→newest. The order is therefore derived from the
 * dates the user already entered rather than asked for a second time.
 *
 * Expressed as a PROJECTION over the resume (§7.1's rule, same as
 * `applyFieldVisibility` and `localizeResume`): `TemplateProps` is untouched, so
 * every template — present and future — inherits the order without reading a
 * flag, and the live preview and the exported PDF cannot disagree about it.
 * Composed in exactly two places, `useLocalizedResume` and `services/pdf.ts`.
 *
 * The stored array is never reordered by this file. A user who arranges a
 * section by hand sets `Resume.manualOrder` (see `isAutoOrdered`), and the
 * projection then leaves that section exactly as stored — so switching back to
 * newest-first loses nothing, and a record written before this existed sorts
 * itself the moment it loads.
 */

/**
 * The dated sections, in the order the editor shows them.
 *
 * `satisfies readonly ResumeListSection[]` is the guard that matters: it is a
 * `tsc` error if one of these ever stops being a list section, which is the only
 * way the type and this array could drift apart.
 */
export const HISTORY_SECTIONS = [
  'experience',
  'education',
  'certifications',
] as const satisfies readonly ResumeListSection[];

/** Anything `sortByRecency` can place. */
export type HistoryItem = ExperienceItem | EducationItem | Certification;

/**
 * Sorts above every real date in a descending compare, which is what "still
 * going on" means in a history: a job held now outranks one that ended last
 * month, however recently that was.
 */
const ONGOING = '9999-99-99';

/**
 * A fixed-width `YYYY-MM-DD` key, so two dates can be compared as strings.
 *
 * The sections store different precisions — experience is `YYYY-MM-DD`,
 * education and certificates are `YYYY-MM` — and a bare lexical compare would
 * make `'2020-05'` sort below `'2020-05-01'` only by accident of length. Padding
 * the missing parts with `00` makes that explicit and keeps a month-precision
 * value just below the first day of its own month.
 *
 * Anything that is not an ISO date (`''`, a half-typed value, a legacy record)
 * yields `''`, which is lower than every real key and therefore lands at the END
 * of a descending sort. An entry nobody dated is exactly the one to show last.
 */
function dateKey(iso: string | undefined): string {
  const value = (iso ?? '').slice(0, 10);
  if (!/^\d{4}(?:-\d{2}){0,2}$/.test(value)) return '';
  if (value.length === 4) return `${value}-00-00`;
  if (value.length === 7) return `${value}-00`;
  return value;
}

/**
 * `[end, start]` — the pair a history is ordered by, both descending.
 *
 * END first, not start: a nine-year job that is still running has to outrank a
 * two-year one that started later and finished, and only the end date says so.
 * The start date is the tie-break, which is what separates two entries that
 * ended in the same month.
 */
function orderKey(item: HistoryItem): readonly [end: string, start: string] {
  if ('issueDate' in item) {
    // A certificate is a point in time, not a span, so it is placed by when it
    // was EARNED. `expirationDate` says how long it stays valid — a property of
    // the certificate, not a position in the holder's history.
    return [dateKey(item.issueDate), ''];
  }
  const start = dateKey(item.startDate);
  return [item.current ? ONGOING : dateKey(item.endDate) || start, start];
}

/**
 * Newest first. Ongoing entries lead, then by end date, then by start date.
 *
 * `Array.prototype.sort` is stable (required by the language since ES2019), and
 * that is load-bearing rather than incidental: entries the dates cannot separate
 * — two certificates earned the same month, two jobs with identical spans — keep
 * the order the user typed them in, which is the only remaining signal about
 * which they consider more important. Returning `0` is therefore the answer, not
 * a fallback.
 */
export function sortByRecency<T extends HistoryItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const [aEnd, aStart] = orderKey(a);
    const [bEnd, bStart] = orderKey(b);
    if (aEnd !== bEnd) return aEnd < bEnd ? 1 : -1;
    if (aStart !== bStart) return aStart < bStart ? 1 : -1;
    return 0;
  });
}

/** Is `section` one the dates order? (A `ResumeListSection` narrowing guard.) */
export function isHistorySection(section: ResumeListSection): section is HistorySection {
  return (HISTORY_SECTIONS as readonly ResumeListSection[]).includes(section);
}

/** Is this section still ordered from its dates? Absent flag → yes (opt-out). */
export function isAutoOrdered(resume: Resume, section: HistorySection): boolean {
  return !resume.manualOrder?.includes(section);
}

/** `manualOrder` with `section` added or removed — the store's update, as data. */
export function withManualOrder(
  manualOrder: HistorySection[] | undefined,
  section: HistorySection,
  manual: boolean,
): HistorySection[] {
  const current = manualOrder ?? [];
  if (!manual) return current.filter((s) => s !== section);
  return current.includes(section) ? current : [...current, section];
}

/** The same array back when the sort moves nothing — see `sortResumeHistory`. */
function inOrder<T extends HistoryItem>(items: T[], section: HistorySection, resume: Resume): T[] {
  if (items.length < 2 || !isAutoOrdered(resume, section)) return items;
  const sorted = sortByRecency(items);
  return sorted.every((item, i) => item === items[i]) ? items : sorted;
}

/**
 * The resume as the CV should read it: every auto-ordered dated section newest
 * first.
 *
 * Returns the SAME object when nothing moves — most CVs are typed in a sensible
 * order already — which keeps the memoized preview from re-rendering and
 * preserves the identity guarantees `localizeResume` relies on downstream.
 *
 * Order relative to the other two projections is free (this one reads only
 * dates, which neither of the others touches), but it must be the SAME order in
 * both composition points or a future projection that does overlap would behave
 * differently in the preview and the export.
 */
export function sortResumeHistory(resume: Resume): Resume {
  const experience = inOrder(resume.experience, 'experience', resume);
  const education = inOrder(resume.education, 'education', resume);
  const certifications =
    resume.certifications && inOrder(resume.certifications, 'certifications', resume);
  if (
    experience === resume.experience &&
    education === resume.education &&
    certifications === resume.certifications
  ) {
    return resume;
  }
  return { ...resume, experience, education, certifications };
}
