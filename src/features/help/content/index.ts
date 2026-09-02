import type { Locale } from '../../../types/resume';
import type { HelpContent } from '../types';

/**
 * Lazy, cached loading of the user guide, one language at a time (spec §10.4).
 *
 * WHY THE GUIDE IS NOT IN `src/app/i18n/*.json`. Those twenty bundles are EAGER —
 * every one of them is in the entry chunk, because the app must be able to switch
 * language without a fetch, and all twenty together are about 250 KB raw. The
 * guide is several times the size of a bundle on its own, so putting it there
 * would multiply the cost of the first paint for every visitor, in exchange for
 * text most of them will never open. Instead it is code-split exactly like the
 * dictionaries (`data/dictionaries.ts`): nothing is downloaded until someone opens
 * the guide, and then only their own language.
 *
 * Being a lazy CHUNK rather than a static asset also means it is precached by the
 * service worker like any other chunk (`globPatterns` covers `js`), so the guide
 * works offline. Only the screenshots are fetched on demand — see the
 * `runtimeCaching` rule in `vite.config.ts`.
 *
 * The static `/az/help` pages do NOT use this module; a build step cannot await a
 * dynamic import in a Rollup hook, so `./all` gives it the same content through
 * static imports. That file must never be imported by app code, which
 * `help-content.test.ts` enforces by source-grep — importing it would drag all
 * twenty languages back into the entry chunk and silently undo this whole module.
 */

const loaders: Record<Locale, () => Promise<{ default: unknown }>> = {
  az: () => import('./az.json'),
  ar: () => import('./ar.json'),
  de: () => import('./de.json'),
  el: () => import('./el.json'),
  en: () => import('./en.json'),
  es: () => import('./es.json'),
  fr: () => import('./fr.json'),
  he: () => import('./he.json'),
  hu: () => import('./hu.json'),
  it: () => import('./it.json'),
  ja: () => import('./ja.json'),
  ka: () => import('./ka.json'),
  kk: () => import('./kk.json'),
  ko: () => import('./ko.json'),
  pl: () => import('./pl.json'),
  pt: () => import('./pt.json'),
  ru: () => import('./ru.json'),
  tr: () => import('./tr.json'),
  uz: () => import('./uz.json'),
  zh: () => import('./zh.json'),
};

const cache = new Map<Locale, HelpContent>();

/**
 * Load (and cache) the guide in one language.
 *
 * The cast is the same one `loadDictionary` makes and for the same reason: a JSON
 * import is typed structurally, so a discriminated union like `HelpBlock` widens
 * to `{ kind: string; … }` no matter how correct the file is. What actually
 * guarantees the shape is `help-content.test.ts`, which validates all twenty files
 * against the union — a build-time fact checked at build time, rather than a
 * runtime parse of data that shipped with the app.
 */
export async function loadHelpContent(locale: Locale): Promise<HelpContent> {
  const cached = cache.get(locale);
  if (cached) return cached;
  const mod = await loaders[locale]();
  const content = mod.default as HelpContent;
  cache.set(locale, content);
  return content;
}

/** The already-loaded guide for a language, if the panel has been opened before. */
export function getCachedHelpContent(locale: Locale): HelpContent | undefined {
  return cache.get(locale);
}
