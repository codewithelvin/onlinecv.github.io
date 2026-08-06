import type { Plugin } from 'vite';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALES } from './src/app/i18n/locales';
import { SITE_ORIGIN, hreflangAlternates, localeSegment, localeUrl } from './src/app/seo-locales';
import type { Locale } from './src/types/resume';
import az from './src/app/i18n/az.json';
import ru from './src/app/i18n/ru.json';
import en from './src/app/i18n/en.json';
import ka from './src/app/i18n/ka.json';
import ar from './src/app/i18n/ar.json';
import es from './src/app/i18n/es.json';
import he from './src/app/i18n/he.json';
import ko from './src/app/i18n/ko.json';
import zh from './src/app/i18n/zh.json';
import fr from './src/app/i18n/fr.json';
import de from './src/app/i18n/de.json';
import it from './src/app/i18n/it.json';
import tr from './src/app/i18n/tr.json';
import pt from './src/app/i18n/pt.json';
import pl from './src/app/i18n/pl.json';
import hu from './src/app/i18n/hu.json';
import el from './src/app/i18n/el.json';
import kk from './src/app/i18n/kk.json';
import uz from './src/app/i18n/uz.json';
import ja from './src/app/i18n/ja.json';

/**
 * Emit one static landing page per UI language, so each language has a URL a
 * crawler can actually fetch and index (spec §19.2).
 *
 * WHY THIS IS A BUILD STEP AND NOT RUNTIME. The app is a single-route SPA on
 * static hosting: switching language rewrites the DOM, not the response. A
 * crawler fetches HTML and does not click the language switcher, so whatever the
 * one served file says is the only language the site appears to have. Five
 * genuinely translated languages were invisible to search because of it.
 *
 * Each emitted file is the SAME app — same script, same chunks — with only its
 * head rewritten: `lang`/`dir`, localized `<title>` and description, its own
 * canonical, and the full `hreflang` set (every locale plus `x-default`) that
 * tells a search engine these are translations of one page rather than duplicates.
 * The root `index.html` gets the alternates too, and points its canonical at the
 * default locale so `/` and `/az/` do not compete.
 *
 * Titles come from the app's own `src/app/i18n/*.json`, read here rather than
 * duplicated, so a copy change lands in the served HTML as well as the UI.
 */

interface SeoStrings {
  title: string;
  description: string;
}

/**
 * The head copy comes from the app's OWN translation bundles, not from a second
 * list kept in sync by hand — a copy change lands in the served HTML and in the
 * UI at once.
 *
 * A total `Record<Locale, …>`, which is the point: widening the `Locale` union
 * fails to compile until the new bundle is added here, the same forcing function
 * `LOCALES` and `i18n/index.ts` already rely on. Static imports rather than
 * reading the files, so no `@types/node` is needed (§27 keeps the dependency list
 * closed) and a malformed bundle is a build error rather than a runtime one.
 */
const BUNDLES: Record<Locale, { seo?: Partial<SeoStrings> }> = {
  az,
  ru,
  en,
  ka,
  ar,
  es,
  he,
  ko,
  zh,
  fr,
  de,
  it,
  tr,
  pt,
  pl,
  hu,
  el,
  kk,
  uz,
  ja,
};

function seoStrings(locale: Locale): SeoStrings {
  const { title, description } = BUNDLES[locale].seo ?? {};
  if (!title || !description) {
    // Loud, because the alternative is silently shipping a page titled
    // "undefined" to whichever language was forgotten.
    throw new Error(`locale-pages: ${locale}.json is missing seo.title or seo.description`);
  }
  return { title, description };
}

const escapeAttr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** `<link rel="alternate" hreflang=…>` for every locale, plus `x-default`. */
function alternatesBlock(): string {
  return hreflangAlternates()
    .map(
      ({ hreflang, href }) =>
        `    <link rel="alternate" hreflang="${hreflang}" href="${escapeAttr(href)}" />`,
    )
    .join('\n');
}

/**
 * Rewrite the built `index.html` for one locale.
 *
 * String surgery on the emitted HTML, deliberately: the alternative is five
 * near-identical `index.html` files in the repo, which drift the moment anyone
 * edits a meta tag. Every replacement is asserted to have matched, so a change to
 * `index.html` that breaks an anchor fails the build instead of quietly shipping
 * a page with the wrong metadata.
 */
function renderLocalePage(html: string, locale: Locale, canonical: string): string {
  const { title, description } = seoStrings(locale);
  const meta = LOCALES[locale];
  let out = html;

  const replace = (pattern: RegExp, replacement: string, what: string): void => {
    if (!pattern.test(out)) {
      throw new Error(`locale-pages: could not find ${what} in index.html — update the plugin`);
    }
    out = out.replace(pattern, replacement);
  };

  replace(
    /<html lang="[^"]*"(?: dir="[^"]*")?>/,
    `<html lang="${locale}" dir="${meta.dir}">`,
    '<html lang>',
  );
  replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(title)}</title>`, '<title>');
  replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${escapeAttr(description)}" />`,
    'meta description',
  );
  replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />\n${alternatesBlock()}`,
    'canonical link',
  );
  // Open Graph / Twitter mirror the same copy; a missing one is not fatal.
  out = out
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${escapeAttr(title)}" />`,
    )
    .replace(
      /<meta property="og:description"[\s\S]*?\/>/,
      `<meta property="og:description" content="${escapeAttr(description)}" />`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    )
    .replace(
      /<meta name="twitter:description"[\s\S]*?\/>/,
      `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
    )
    .replace(/<meta property="og:locale" content="[^"]*" \/>/, '');

  return out;
}

/** `sitemap.xml` listing every locale page — generated so it cannot fall behind. */
function sitemap(): string {
  const urls = SUPPORTED_LOCALES.map(
    (locale) =>
      `  <url>\n    <loc>${localeUrl(locale)}</loc>\n` +
      hreflangAlternates()
        .map(
          ({ hreflang, href }) =>
            `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`,
        )
        .join('\n') +
      `\n    <changefreq>weekly</changefreq>\n    <priority>${
        locale === DEFAULT_LOCALE ? '1.0' : '0.9'
      }</priority>\n  </url>`,
  ).join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls +
    '\n</urlset>\n'
  );
}

export function localePages(): Plugin {
  return {
    name: 'onlinecv-locale-pages',
    // After the PWA plugin has produced its manifest/SW, so the pages it emits
    // are picked up by the precache glob.
    enforce: 'post',
    apply: 'build',
    generateBundle(_options, bundle) {
      const entry = bundle['index.html'];
      if (!entry || entry.type !== 'asset') {
        throw new Error('locale-pages: index.html was not in the bundle');
      }
      const html = String(entry.source);

      for (const locale of SUPPORTED_LOCALES) {
        this.emitFile({
          type: 'asset',
          fileName: `${localeSegment(locale)}index.html`,
          source: renderLocalePage(html, locale, localeUrl(locale)),
        });
      }

      /**
       * The root page keeps serving the default language, but now declares the
       * alternates and points its canonical at `/az/` — otherwise `/` and `/az/`
       * are two URLs with identical content competing with each other.
       */
      entry.source = renderLocalePage(html, DEFAULT_LOCALE, localeUrl(DEFAULT_LOCALE));

      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
      });
    },
  };
}
