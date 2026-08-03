import type { Locale } from '../types/resume';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isLocale } from './i18n/locales';

/**
 * The locale ↔ URL contract (spec §19.2), and THE reason it exists.
 *
 * Switching language used to change nothing about the URL, so every language
 * lived at one address. A crawler cannot infer that: it fetches one page, reads
 * one `<html lang>` and one `<title>`, and indexes the site as monolingual —
 * whichever language the served HTML happened to be in. The other four are
 * invisible to search no matter how complete their translations are.
 *
 * So each locale gets a real, separately-fetchable URL (`/az/`, `/ru/`, …), each
 * served as a static file with its own `lang`, `title`, `description`, canonical
 * and a full set of `hreflang` alternates. This module is the single source those
 * files, the sitemap, and the running app all derive from — the build script and
 * the client cannot disagree about where a language lives.
 *
 * Deliberately free of `import.meta.env`: the build-time generator runs in Node
 * where that does not exist, so the base path is passed in instead.
 */

/**
 * The canonical origin. NOT the URL the app is currently served from — Pages
 * still serves it from a project sub-path until `onlinecv.az` DNS is switched
 * over (see `BASE` in `vite.config.ts`). Canonical and hreflang intentionally
 * point at the domain the site is meant to live on, which is also what the
 * existing `<link rel="canonical">` has always claimed.
 */
export const SITE_ORIGIN = 'https://onlinecv.az';

/** Path segment for a locale, relative to the app's base path: `az/`. */
export function localeSegment(locale: Locale): string {
  return `${locale}/`;
}

/** Absolute canonical URL for a locale's landing page. */
export function localeUrl(locale: Locale): string {
  return `${SITE_ORIGIN}/${localeSegment(locale)}`;
}

/**
 * The locale a URL path names, or `undefined` if it names none.
 *
 * Works under any base path by scanning the segments rather than assuming a
 * position, so it behaves the same on `onlinecv.az/ru/` and on the current
 * project sub-path `…/onlinecv.github.io/ru/`.
 */
export function localeFromPath(pathname: string): Locale | undefined {
  for (const segment of pathname.split('/')) {
    if (isLocale(segment)) return segment;
  }
  return undefined;
}

/**
 * The path to switch to for a locale, preserving the app's base path.
 *
 * Replaces an existing locale segment in place; otherwise appends one. Returns a
 * root-relative path, so it is safe to hand to `history.replaceState`.
 */
export function pathForLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  const at = segments.findIndex((segment) => isLocale(segment));
  if (at >= 0) segments[at] = locale;
  else segments.push(locale);
  return `/${segments.join('/')}/`;
}

/**
 * Every `hreflang` alternate, plus `x-default`.
 *
 * `x-default` is what a search engine serves to a visitor whose language matches
 * none of ours; it points at the default locale rather than at `/`, because `/`
 * and `/az/` would otherwise be two URLs claiming the same content.
 */
export function hreflangAlternates(): { hreflang: string; href: string }[] {
  return [
    ...SUPPORTED_LOCALES.map((locale) => ({ hreflang: locale, href: localeUrl(locale) })),
    { hreflang: 'x-default', href: localeUrl(DEFAULT_LOCALE) },
  ];
}

/**
 * The locale the app should start in.
 *
 * The URL wins over the stored preference, deliberately: a locale in the path is
 * an explicit request — someone followed a link, a search result or a bookmark
 * for that language — whereas the stored value is a preference from a previous
 * visit. A URL with no locale segment leaves the stored one alone, so a returning
 * visitor who chose English is not dragged back to Azerbaijani by opening the
 * bare domain.
 */
export function initialLocale(pathname: string, stored: Locale | undefined): Locale {
  return localeFromPath(pathname) ?? stored ?? DEFAULT_LOCALE;
}
