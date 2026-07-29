import type { DictionaryEntry, DictionaryGroup } from '../types/dictionary';

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
