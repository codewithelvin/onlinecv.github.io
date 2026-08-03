import type { DictionaryBundle, DictionaryEntry, DictionaryGroup } from '../types/dictionary';

/**
 * Lazy, cached dictionary loading (spec §13.1). Datasets are code-split so they
 * stay out of the initial bundle; each group is fetched on first use and the
 * PWA precaches the resulting chunk for offline use.
 */

const loaders: Record<DictionaryGroup, () => Promise<{ default: unknown }>> = {
  skills: () => import('./skills.json'),
  languages: () => import('./languages.json'),
  interests: () => import('./interests.json'),
  nationality: () => import('./nationality.json'),
  universities: () => import('./universities.json'),
  colleges: () => import('./colleges.json'),
  faculties: () => import('./faculties.json'),
  specialities: () => import('./specialities.json'),
  positions: () => import('./positions.json'),
  cities: () => import('./cities.json'),
};

const cache = new Map<DictionaryGroup, DictionaryEntry[]>();

/** Load (and cache) a dictionary group. The JSON shape matches `DictionaryEntry`. */
export async function loadDictionary(group: DictionaryGroup): Promise<DictionaryEntry[]> {
  const cached = cache.get(group);
  if (cached) return cached;
  const mod = await loaders[group]();
  const data = mod.default as DictionaryEntry[];
  cache.set(group, data);
  return data;
}

/** Synchronously read an already-loaded dictionary (empty until `loadDictionary` resolves). */
export function getCachedDictionary(group: DictionaryGroup): DictionaryEntry[] {
  return cache.get(group) ?? [];
}

/** Load several groups at once, keyed by group (used to re-localize a resume). */
export async function loadDictionaries(groups: DictionaryGroup[]): Promise<DictionaryBundle> {
  const pairs = await Promise.all(
    groups.map(async (group) => [group, await loadDictionary(group)] as const),
  );
  return Object.fromEntries(pairs) as DictionaryBundle;
}

/** The already-cached subset of `groups`, for a first render with no await. */
export function getCachedDictionaries(groups: DictionaryGroup[]): DictionaryBundle {
  const bundle: DictionaryBundle = {};
  for (const group of groups) {
    const cached = cache.get(group);
    if (cached) bundle[group] = cached;
  }
  return bundle;
}
