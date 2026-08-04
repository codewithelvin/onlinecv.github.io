import type { HideableField, Resume } from '../types/resume';

/**
 * Per-field visibility for the personal details (`Resume.hiddenFields`).
 *
 * Which of these belong on a résumé is a local convention, not a layout
 * decision: a photo, a date of birth, a marital status and a military status are
 * expected in Azerbaijan and pointedly unwelcome in much of Europe and North
 * America. So the user decides, once, in the editor — and the same choice governs
 * the live preview and the exported PDF.
 *
 * Hiding is expressed by BLANKING the value in a projection rather than by a flag
 * the templates read. Every template already omits an empty field (BR-5), so
 * "hidden" and "not filled in" render identically and `TemplateProps` is
 * untouched (§7.1) — a template added later inherits the behaviour for free.
 *
 * `hiddenFields` is opt-OUT: absent means nothing is hidden, which is what every
 * record written before the feature existed carries.
 */

/**
 * Every field the user may hide, in the order the editor shows them. The order is
 * the panel's, so a UI that iterates this list stays in step with the form.
 */
export const HIDEABLE_FIELDS: readonly HideableField[] = [
  'avatar',
  'location',
  'gender',
  'maritalStatus',
  'nationality',
  'dateOfBirth',
  'militaryStatus',
  'driverLicense',
  'summary',
];

/** Is this field printed on the CV? Absent `hiddenFields` → yes (opt-out). */
export function isFieldVisible(resume: Resume, field: HideableField): boolean {
  return !resume.hiddenFields?.includes(field);
}

/** `hiddenFields` with `field` added or removed — the store's update, as data. */
export function withFieldVisibility(
  hiddenFields: HideableField[] | undefined,
  field: HideableField,
  visible: boolean,
): HideableField[] {
  const current = hiddenFields ?? [];
  if (visible) return current.filter((f) => f !== field);
  return current.includes(field) ? current : [...current, field];
}

/**
 * The resume as the CV should render it: every hidden field blanked out.
 *
 * Returns the SAME object when nothing is hidden, so the memoized preview and the
 * identity guarantees in `localizeResume` are preserved.
 *
 * Run this BEFORE `localizeResume`, and note that it clears a hidden value's
 * dictionary CODE alongside its label: the code is the stored truth and
 * `localizeResume` derives the label back from it, so a city hidden by label
 * alone would reappear the moment its code was resolved.
 */
export function applyFieldVisibility(resume: Resume): Resume {
  const hidden = resume.hiddenFields;
  if (!hidden || hidden.length === 0) return resume;
  const hide = (field: HideableField): boolean => hidden.includes(field);

  const media = hide('avatar') && resume.media.avatar ? { ...resume.media, avatar: undefined } : resume.media;

  const basics = hide('location') ? { ...resume.basics, location: undefined, locationCode: undefined } : resume.basics;

  // Rebuilt only when one of ITS fields is hidden, so hiding (say) the avatar
  // leaves `generalInfo` identical and the memoized consumers below see no change.
  const giPatch = {
    ...(hide('gender') ? { gender: undefined } : {}),
    ...(hide('maritalStatus') ? { maritalStatus: undefined } : {}),
    ...(hide('nationality') ? { nationality: '' } : {}),
    ...(hide('dateOfBirth') ? { dateOfBirth: '' } : {}),
    ...(hide('militaryStatus') ? { militaryStatus: undefined } : {}),
    ...(hide('driverLicense') ? { driverLicense: undefined } : {}),
  };
  const generalInfo =
    Object.keys(giPatch).length > 0 ? { ...resume.generalInfo, ...giPatch } : resume.generalInfo;

  const summary = hide('summary') ? '' : resume.summary;

  return { ...resume, media, basics, generalInfo, summary };
}
