import type {
  ContactItem,
  EducationItem,
  ExperienceItem,
  Resume,
} from '../../types/resume';

/**
 * Pure, side-effect-free helpers shared by templates. Defensive against absent
 * optional sections (§7.1 forward-compatibility) and enforce BR-5 (empty
 * sections omitted) / BR-6 (current → "Present").
 */

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
