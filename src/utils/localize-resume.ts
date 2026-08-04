import type { DictionaryBundle, DictionaryEntry, DictionaryGroup } from '../types/dictionary';
import type { EducationItem, Locale, Resume } from '../types/resume';
import { resolveDictionaryValue, resolveLabel } from './dictionary';

/**
 * Re-label a resume's dictionary-backed values into a target locale.
 *
 * Stored items carry BOTH a dictionary `code` and the label that was typed when
 * they were created (§13.1: suggestions with free-text fallback). The label is a
 * snapshot, so on its own it would stay frozen in whatever language it was
 * entered — this module derives the label from the code instead, at render time,
 * for both the live preview and the exported PDF (`resume.locale`).
 *
 * Free-text entries have no code and are returned untouched: user prose is never
 * translated (spec §10.1).
 */

/** The dictionary group that backs an education item's institution name. */
function institutionGroup(type: EducationItem['type']): DictionaryGroup | undefined {
  if (type === 'college') return 'colleges';
  if (type === 'university') return 'universities';
  return undefined;
}

/**
 * Which dictionaries this resume actually references — the rest stay unloaded.
 *
 * A group is needed as soon as a field it backs holds ANYTHING, not just when a
 * code is present: `resolveLabel` looks an uncoded value up as a label so that a CV
 * written before these fields had code columns still re-localizes (see that
 * function), and it can only do that with the dictionary in hand. Gating on the
 * code alone is what made those values look permanently frozen.
 *
 * The cost is bounded and was measured: the dictionary chunks are all precached by
 * the service worker anyway, so this changes when a chunk is PARSED, not whether it
 * is downloaded.
 */
export function referencedDictionaryGroups(resume: Resume): DictionaryGroup[] {
  const groups = new Set<DictionaryGroup>();
  const text = (value: string | undefined): boolean => Boolean(value && value.trim());

  // Nationality holds either a code or free text in one field, so it can only be
  // told apart by looking it up.
  if (text(resume.generalInfo.nationality)) groups.add('nationality');
  if (resume.skills.some((s) => s.code || text(s.name))) groups.add('skills');
  if (resume.languages.some((l) => l.code || text(l.name))) groups.add('languages');
  if ((resume.interests ?? []).some((i) => i.code || text(i.name))) groups.add('interests');
  if (resume.experience.some((e) => e.positionCode || text(e.position))) groups.add('positions');
  if (
    resume.basics.locationCode ||
    text(resume.basics.location) ||
    resume.experience.some((e) => e.locationCode || text(e.location))
  ) {
    groups.add('cities');
  }
  for (const item of resume.education) {
    const group = item.code || text(item.institution) ? institutionGroup(item.type) : undefined;
    if (group) groups.add(group);
    if (item.facultyCode || text(item.faculty)) groups.add('faculties');
    if (item.specializationCode || text(item.specialization)) groups.add('specialities');
  }
  return [...groups];
}

/** Replace one key, preserving object identity when the value is unchanged. */
function relabel<T, K extends keyof T>(item: T, key: K, value: T[K]): T {
  return item[key] === value ? item : { ...item, [key]: value };
}

/** `map` that returns the original array when every element came back identical. */
function mapStable<T>(items: T[], fn: (item: T) => T): T[] {
  let changed = false;
  const next = items.map((item) => {
    const mapped = fn(item);
    if (mapped !== item) changed = true;
    return mapped;
  });
  return changed ? next : items;
}

/**
 * Resume with every dictionary-backed label resolved into `locale`. Returns the
 * SAME object when nothing changed, so memoized consumers don't re-render.
 */
export function localizeResume(resume: Resume, locale: Locale, dicts: DictionaryBundle): Resume {
  const entries = (group: DictionaryGroup | undefined): DictionaryEntry[] =>
    (group && dicts[group]) || [];

  const generalInfo = relabel(
    resume.generalInfo,
    'nationality',
    resolveDictionaryValue(entries('nationality'), resume.generalInfo.nationality, locale),
  );

  const skills = mapStable(resume.skills, (s) =>
    relabel(s, 'name', resolveLabel(entries('skills'), s.code, s.name, locale)),
  );

  const languages = mapStable(resume.languages, (l) =>
    relabel(l, 'name', resolveLabel(entries('languages'), l.code, l.name, locale)),
  );

  const basics = relabel(
    resume.basics,
    'location',
    resolveLabel(entries('cities'), resume.basics.locationCode, resume.basics.location ?? '', locale) ||
      undefined,
  );

  const experience = mapStable(resume.experience, (e) => {
    const withPosition = relabel(
      e,
      'position',
      resolveLabel(entries('positions'), e.positionCode, e.position, locale),
    );
    return relabel(
      withPosition,
      'location',
      resolveLabel(entries('cities'), e.locationCode, e.location ?? '', locale) || undefined,
    );
  });

  /**
   * An education item carries THREE independently dictionary-backed labels, each
   * with its own code. `relabel` returns the same object when a value is
   * unchanged, so chaining keeps the identity guarantee `mapStable` relies on.
   * The `?? ''` only feeds the fallback: an absent field has no code, so it comes
   * straight back out and stays absent.
   */
  const education = mapStable(resume.education, (e) => {
    const withInstitution = relabel(
      e,
      'institution',
      resolveLabel(entries(institutionGroup(e.type)), e.code, e.institution, locale),
    );
    const withFaculty = relabel(
      withInstitution,
      'faculty',
      resolveLabel(entries('faculties'), e.facultyCode, e.faculty ?? '', locale) || undefined,
    );
    return relabel(
      withFaculty,
      'specialization',
      resolveLabel(entries('specialities'), e.specializationCode, e.specialization ?? '', locale) ||
        undefined,
    );
  });

  const interests = resume.interests
    ? mapStable(resume.interests, (i) =>
        relabel(i, 'name', resolveLabel(entries('interests'), i.code, i.name, locale)),
      )
    : resume.interests;

  const unchanged =
    basics === resume.basics &&
    generalInfo === resume.generalInfo &&
    skills === resume.skills &&
    languages === resume.languages &&
    experience === resume.experience &&
    education === resume.education &&
    interests === resume.interests;

  return unchanged
    ? resume
    : { ...resume, basics, generalInfo, skills, languages, experience, education, interests };
}
