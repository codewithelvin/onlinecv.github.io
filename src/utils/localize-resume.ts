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

/** Which dictionaries this resume actually references — the rest stay unloaded. */
export function referencedDictionaryGroups(resume: Resume): DictionaryGroup[] {
  const groups = new Set<DictionaryGroup>();
  // Nationality holds either a code or free text, so it can only be told apart
  // by looking it up.
  if (resume.generalInfo.nationality) groups.add('nationality');
  if (resume.skills.some((s) => s.code)) groups.add('skills');
  if (resume.languages.some((l) => l.code)) groups.add('languages');
  if ((resume.interests ?? []).some((i) => i.code)) groups.add('interests');
  for (const item of resume.education) {
    const group = item.code ? institutionGroup(item.type) : undefined;
    if (group) groups.add(group);
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

  const education = mapStable(resume.education, (e) =>
    relabel(
      e,
      'institution',
      resolveLabel(entries(institutionGroup(e.type)), e.code, e.institution, locale),
    ),
  );

  const interests = resume.interests
    ? mapStable(resume.interests, (i) =>
        relabel(i, 'name', resolveLabel(entries('interests'), i.code, i.name, locale)),
      )
    : resume.interests;

  const unchanged =
    generalInfo === resume.generalInfo &&
    skills === resume.skills &&
    languages === resume.languages &&
    education === resume.education &&
    interests === resume.interests;

  return unchanged ? resume : { ...resume, generalInfo, skills, languages, education, interests };
}
