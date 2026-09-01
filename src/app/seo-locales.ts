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
 * So each locale gets a real, separately-fetchable URL (`/az`, `/ru`, …), each
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

/**
 * Path segment for a locale, relative to the app's base path: `az`.
 *
 * NO TRAILING SLASH, deliberately, and that is the whole locale-URL shape in one
 * decision (user's call, 2026-08-31). `/az` is the canonical, indexable form;
 * `/az/` still resolves but self-canonicalizes to it. See `localeUrl`.
 */
export function localeSegment(locale: Locale): string {
  return locale;
}

/**
 * Absolute canonical URL for a locale's landing page — `https://onlinecv.az/az`,
 * with NO trailing slash.
 *
 * WHY SLASH-LESS, given a static host serves directories. GitHub Pages resolves
 * an extensionless request against `<name>.html` before it falls back to
 * `<name>/index.html`, so the build emits BOTH `az.html` and `az/index.html`
 * (`vite-plugin-locale-pages`). `/az` is therefore a real 200 rather than the
 * `301 → /az/` a bare directory would give, which is what a webmaster tool
 * reports as "non-indexable: redirect".
 *
 * The directory copy is kept because **GitHub Pages cannot author redirects** —
 * no `.htaccess`, no `_redirects` — so dropping it would turn every `/az/` URL
 * already published in a sitemap or an external link into a permanent 404 with
 * no remedy. Both forms serve, both carry THIS canonical, and only this one is
 * listed in `sitemap.xml` and the `hreflang` set.
 */
export function localeUrl(locale: Locale): string {
  return `${SITE_ORIGIN}/${localeSegment(locale)}`;
}

/**
 * The locale a path segment names, ignoring a `.html` extension.
 *
 * `/az` is what visitors and crawlers see, but the file behind it is `az.html`
 * and nothing stops someone linking that directly. Without the strip, such a
 * visit reads as "no locale in the path" and silently serves the stored or
 * default language on a page whose `<html lang>` says otherwise.
 */
function localeOfSegment(segment: string): Locale | undefined {
  const bare = segment.replace(/\.html$/, '');
  return isLocale(bare) ? bare : undefined;
}

/**
 * The locale a URL path names, or `undefined` if it names none.
 *
 * Works under any base path by scanning the segments rather than assuming a
 * position, so it behaves the same on `onlinecv.az/ru` and on the old project
 * sub-path `…/onlinecv.github.io/ru`. Accepts `/ru`, `/ru/` and `/ru.html`
 * alike — all three are real ways to reach the same emitted page.
 */
export function localeFromPath(pathname: string): Locale | undefined {
  for (const segment of pathname.split('/')) {
    const locale = localeOfSegment(segment);
    if (locale) return locale;
  }
  return undefined;
}

/**
 * The path to switch to for a locale, preserving the app's base path.
 *
 * Replaces an existing locale segment in place; otherwise appends one. Returns a
 * root-relative path with NO trailing slash, matching `localeUrl` — the address
 * bar after a language switch has to be the URL that is actually canonical, or a
 * shared link points at the redirecting form the canonical exists to retire.
 * Normalizes `/az/` and `/az.html` onto the bare form on the way through.
 */
export function pathForLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  const at = segments.findIndex((segment) => localeOfSegment(segment));
  if (at >= 0) segments[at] = locale;
  else segments.push(locale);
  return `/${segments.join('/')}`;
}

/**
 * Every address the app actually serves, as one RegExp — the service worker's
 * navigation allowlist (`navigateFallbackAllowlist` in `vite.config.ts`).
 *
 * WHY A SINGLE-ROUTE APP NEEDS THIS. Workbox's navigation fallback defaults to
 * answering EVERY navigation out of the precache. Here that is all cost and no
 * benefit: the real routes — `/`, `/az`, `/az/`, `/az.html`, `/index.html` — are
 * each precached as their own file and served from there, so the only requests
 * the fallback ever handled were addresses the site does not have. It turned them
 * into the app shell with a **200**, which is why every dead link inherited from
 * the old backend site (`/en/university/x`, `/candidate/y`) looked like a live
 * route in a browser while the origin was correctly answering 404 all along.
 * Restricting the fallback to this pattern lets those reach the network, and the
 * network answers with `404.html`.
 *
 * Built from `SUPPORTED_LOCALES`, so a new language is covered by adding it there
 * and nowhere else. `base` is passed in for the same reason the rest of this
 * module takes it: the generator runs in Node, where `import.meta.env` does not
 * exist.
 *
 * Anchored at both ends, because the whole point is that `/az` matches and
 * `/az/university/x` does not. Workbox tests the pattern against
 * `pathname + search`, hence the optional query: an inbound `/az?utm_source=…`
 * is a real route and has to keep working offline.
 */
export function appRoutePattern(base: string): RegExp {
  const prefix = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const names = ['index', ...SUPPORTED_LOCALES].join('|');
  return new RegExp(`^${prefix}(?:(?:${names})(?:\\.html)?/?)?(?:\\?.*)?$`);
}

/**
 * Every `hreflang` alternate, plus `x-default`.
 *
 * `x-default` is what a search engine serves to a visitor whose language matches
 * none of ours; it points at the default locale rather than at `/`, because `/`
 * and `/az` would otherwise be two URLs claiming the same content.
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
