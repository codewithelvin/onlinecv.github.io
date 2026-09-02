import type { Plugin } from 'vite';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALES } from './src/app/i18n/locales';
import {
  INDEXNOW_KEY,
  SITE_ORIGIN,
  helpUrl,
  hreflangAlternates,
  localeSegment,
  localeUrl,
  ogImageUrl,
  ogLocale,
} from './src/app/seo-locales';
import { renderNotFoundPage, type NotFoundStrings } from './src/app/not-found-page';
import { renderHelpPage, type HelpPageStrings } from './src/app/help-page';
import { HELP_CONTENT } from './src/features/help/content/all';
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
 * canonical, its own `og:locale` and social card, and the full `hreflang` set
 * (every locale plus `x-default`) that tells a search engine these are
 * translations of one page rather than duplicates. The root `index.html` gets the
 * alternates too, and points its canonical at the default locale so `/` and
 * `/az/` do not compete.
 *
 * Titles come from the app's own `src/app/i18n/*.json`, read here rather than
 * duplicated, so a copy change lands in the served HTML as well as the UI.
 */

interface SeoStrings {
  title: string;
  description: string;
  /** `og:image:alt`/`twitter:image:alt` — what the card says, for a reader who cannot see it. */
  imageAlt: string;
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
const BUNDLES: Record<
  Locale,
  {
    seo?: Partial<SeoStrings>;
    notFound?: Partial<NotFoundStrings>;
    help?: Partial<{ topics: string }>;
  }
> = {
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
  const { title, description, imageAlt } = BUNDLES[locale].seo ?? {};
  if (!title || !description || !imageAlt) {
    // Loud, because the alternative is silently shipping a page titled
    // "undefined" to whichever language was forgotten.
    throw new Error(`locale-pages: ${locale}.json is missing an seo.* key`);
  }
  return { title, description, imageAlt };
}

/**
 * The `notFound` block for one locale, from the same bundles.
 *
 * Throws for the same reason `seoStrings` does, and it matters more here: the
 * error page is embedded once for all 20 languages, so a missing key would not
 * cost one language its page — it would print `undefined` into the shared file
 * that every miss on the site is answered with.
 */
function notFoundStrings(locale: Locale): NotFoundStrings {
  const { title, body, retired, action } = BUNDLES[locale].notFound ?? {};
  if (!title || !body || !retired || !action) {
    throw new Error(`locale-pages: ${locale}.json is missing a notFound.* key`);
  }
  return { title, body, retired, action };
}

/**
 * The chrome around a guide page, from the same bundles.
 *
 * `notFound.action` is reused as the call to action back into the app rather than
 * a new key being invented for it: it is the same sentence ("Create your CV")
 * aimed at the same reader — someone on a static page who should be offered the
 * app — already translated twenty times in each bundle's own register.
 */
function helpPageStrings(locale: Locale): HelpPageStrings {
  const { topics } = BUNDLES[locale].help ?? {};
  const { action } = BUNDLES[locale].notFound ?? {};
  if (!topics || !action) {
    throw new Error(`locale-pages: ${locale}.json is missing a help.topics/notFound.action key`);
  }
  return { topics, action };
}

/** Every locale's `notFound` copy, which is what `404.html` embeds. */
function notFoundCopy(): Record<Locale, NotFoundStrings> {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, notFoundStrings(locale)]),
  ) as Record<Locale, NotFoundStrings>;
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
  const { title, description, imageAlt } = seoStrings(locale);
  const meta = LOCALES[locale];
  const card = ogImageUrl(locale);
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

  /**
   * The SOCIAL CARD and the language it is in — asserted, unlike the text tags
   * below, and that difference is deliberate.
   *
   * A card is one image per language (`scripts/make-og-image.ts`), and if one of
   * these four replacements silently missed, the page would keep the value from
   * `index.html`: every language would advertise the Azerbaijani card, in
   * Azerbaijani, under its own correctly translated title. That is exactly the
   * defect the per-language cards were made to fix, and it is invisible in the
   * built output unless someone opens a link preview in a language they read.
   * So a pattern that stops matching fails the build instead.
   */
  replace(
    /<meta\s+property="og:locale"[\s\S]*?\/>/,
    `<meta property="og:locale" content="${ogLocale(locale)}" />`,
    'og:locale',
  );
  replace(
    /<meta\s+property="og:image"[\s\S]*?\/>/,
    `<meta property="og:image" content="${escapeAttr(card)}" />`,
    'og:image',
  );
  replace(
    /<meta\s+property="og:image:alt"[\s\S]*?\/>/,
    `<meta property="og:image:alt" content="${escapeAttr(imageAlt)}" />`,
    'og:image:alt',
  );
  replace(
    /<meta\s+name="twitter:image"[\s\S]*?\/>/,
    `<meta name="twitter:image" content="${escapeAttr(card)}" />`,
    'twitter:image',
  );
  replace(
    /<meta\s+name="twitter:image:alt"[\s\S]*?\/>/,
    `<meta name="twitter:image:alt" content="${escapeAttr(imageAlt)}" />`,
    'twitter:image:alt',
  );

  /**
   * Open Graph / Twitter mirror the title and description.
   *
   * ASSERTED like everything above, and the comment that used to sit here — "a
   * missing one is not fatal" — was wrong twice over. It WAS fatal: the two
   * description tags are written across several lines in `index.html` (Prettier
   * wraps them, because their copy is long), the anchors below matched a single
   * literal space after `<meta`, and so `og:description` and
   * `twitter:description` silently kept the Azerbaijani copy on all 20 locale
   * pages from the day the pages were added. A share preview in any language
   * showed a correct title over an Azerbaijani sentence, and no gate could see
   * it. Hence `\s+` in every anchor, and hence no unasserted replacement is left
   * in this function.
   */
  replace(
    /<meta\s+property="og:title"[\s\S]*?\/>/,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    'og:title',
  );
  replace(
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    'og:description',
  );
  replace(
    /<meta\s+property="og:url"[\s\S]*?\/>/,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    'og:url',
  );
  replace(
    /<meta\s+name="twitter:title"[\s\S]*?\/>/,
    `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    'twitter:title',
  );
  replace(
    /<meta\s+name="twitter:description"[\s\S]*?\/>/,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
    'twitter:description',
  );

  return out;
}

/**
 * One `<url>` entry, with the full alternate set for whichever family of pages it
 * belongs to.
 *
 * `urlFor` is passed through to `hreflangAlternates` rather than defaulted,
 * because a guide page's alternates must point at the other GUIDES. An
 * `hreflang` set that sends a French reader of the English guide to the French
 * home page has answered a question nobody asked.
 */
function sitemapEntry(
  locale: Locale,
  urlFor: (locale: Locale) => string,
  priority: string,
): string {
  return (
    `  <url>\n    <loc>${urlFor(locale)}</loc>\n` +
    hreflangAlternates(urlFor)
      .map(
        ({ hreflang, href }) =>
          `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`,
      )
      .join('\n') +
    `\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  );
}

/**
 * `sitemap.xml` — every locale landing page and every locale GUIDE page,
 * generated so it cannot fall behind.
 *
 * The guide pages are listed at a lower priority than the landing pages, not
 * because they matter less but because they are what a search engine should reach
 * for a specific question rather than for the site as a whole.
 */
function sitemap(): string {
  const urls = [
    ...SUPPORTED_LOCALES.map((locale) =>
      sitemapEntry(locale, localeUrl, locale === DEFAULT_LOCALE ? '1.0' : '0.9'),
    ),
    ...SUPPORTED_LOCALES.map((locale) =>
      sitemapEntry(locale, helpUrl, locale === DEFAULT_LOCALE ? '0.8' : '0.7'),
    ),
  ].join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls +
    '\n</urlset>\n'
  );
}

/**
 * Serve the guide pages on the DEV server, where nothing else emits them.
 *
 * `localePages` is `apply: 'build'` — it works inside `generateBundle`, which no
 * dev server runs — so every page it produces (the locale pages, `404.html`,
 * `sitemap.xml`, and the 21 guide pages) simply does not exist under `npm run
 * dev`. For most of them that is invisible. For the guide it is a trap with a
 * misleading symptom: Vite's SPA fallback answers `/az/help` with `index.html`,
 * so the URL returns **200 and renders the CV editor**. It does not look like a
 * missing page; it looks like the guide is broken, and `#projects` scrolls
 * nothing because the page it names is not the page you got.
 *
 * That matters more here than for the other generated files because the guide is
 * the one whose CONTENT gets edited: proof-reading twenty languages of prose
 * should not need a full production build between reads.
 *
 * Deliberately a separate plugin rather than dropping `apply: 'build'` from
 * `localePages`: this one has exactly one job, runs only in `serve`, and cannot
 * change anything about what ships.
 */
export function helpPagesDevServer(): Plugin {
  let base = '/';
  return {
    name: 'onlinecv-help-pages-dev',
    apply: 'serve',
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // `req.url` narrowed by hand: `@types/node` is deliberately not a
        // dependency (§27), so `IncomingMessage` here carries none of its fields.
        const { url } = req as { url?: string };
        const path = (url ?? '').split('?')[0].replace(/\.html$/, '');
        // `/az/help`, and `/help` for the default locale — the same two forms the
        // build emits, so a link that works in dev works in production.
        const match = /^\/(?:([a-z]{2})\/)?help\/?$/.exec(path);
        const segment = match?.[1];
        if (!match || (segment !== undefined && !SUPPORTED_LOCALES.includes(segment as Locale))) {
          next();
          return;
        }
        const locale = (segment ?? DEFAULT_LOCALE) as Locale;
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end(renderHelpPage(locale, HELP_CONTENT[locale], helpPageStrings(locale), base));
      });
    },
  };
}

export function localePages(): Plugin {
  /**
   * Taken from the resolved config rather than accepted as an argument, so `BASE`
   * in `vite.config.ts` stays the ONE place the app's public path is stated. The
   * locale pages need no base (their URLs are absolute, from `SITE_ORIGIN`), but
   * `404.html` does: it links to the app and loads a font and a logo, and it is
   * served at arbitrary paths, so every URL on it has to be base-qualified.
   */
  let base = '/';

  return {
    name: 'onlinecv-locale-pages',
    // After the PWA plugin has produced its manifest/SW, so the pages it emits
    // are picked up by the precache glob.
    enforce: 'post',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    generateBundle(_options, bundle) {
      const entry = bundle['index.html'];
      if (!entry || entry.type !== 'asset') {
        throw new Error('locale-pages: index.html was not in the bundle');
      }
      const html = String(entry.source);

      /**
       * TWO files per locale, both the same page, both canonicalizing to `/az`.
       *
       * `az.html` is the one that matters: GitHub Pages resolves an extensionless
       * request against `<name>.html` before `<name>/index.html`, so this is what
       * makes `/az` answer **200** instead of the `301 → /az/` a bare directory
       * gives. That redirect is exactly what a webmaster tool flags as
       * "non-indexable: redirect" (user's call to go slash-less, 2026-08-31).
       *
       * `az/index.html` is kept as a compatibility copy, NOT as a second address:
       * **GitHub Pages cannot author redirects**, so deleting it would turn every
       * `/az/` URL already published in `sitemap.xml`, indexed, or linked from
       * outside into a permanent 404 that nothing on this host can repair. It
       * carries the same canonical as its twin, so search consolidates the pair
       * onto `/az` rather than treating them as duplicates, and only `/az` is
       * listed in the sitemap and the `hreflang` set.
       */
      for (const locale of SUPPORTED_LOCALES) {
        const page = renderLocalePage(html, locale, localeUrl(locale));
        this.emitFile({ type: 'asset', fileName: `${localeSegment(locale)}.html`, source: page });
        this.emitFile({
          type: 'asset',
          fileName: `${localeSegment(locale)}/index.html`,
          source: page,
        });
      }

      /**
       * The USER GUIDE, one static page per language (spec §10.4 / §19.2 as
       * amended) — `/az/help`, and `/help` for the default locale.
       *
       * ONE file per locale here, unlike the landing pages above: `/az/help/` has
       * never been published, so there is no already-indexed trailing-slash form
       * that Pages (which can author no redirects) would strand at a 404. Emitting
       * a directory twin would create a duplicate to consolidate rather than
       * rescue one.
       *
       * These are `.html`, so `globPatterns` precaches them — the guide works
       * offline as a page as well as in the panel. The extensionless URL that
       * actually gets requested is handled by the `helpPagePattern` rule in
       * `vite.config.ts`, because a precache entry for `az/help.html` cannot
       * answer a navigation to `/az/help`.
       */
      for (const locale of SUPPORTED_LOCALES) {
        this.emitFile({
          type: 'asset',
          fileName: `${localeSegment(locale)}/help.html`,
          source: renderHelpPage(locale, HELP_CONTENT[locale], helpPageStrings(locale), base),
        });
      }
      /**
       * `/help` at the root, in the default language and canonicalizing to
       * `/az/help`. It exists because it is the address people guess and type;
       * the canonical stops it competing with the locale copy, exactly as `/`
       * defers to `/az`.
       */
      this.emitFile({
        type: 'asset',
        fileName: 'help.html',
        source: renderHelpPage(
          DEFAULT_LOCALE,
          HELP_CONTENT[DEFAULT_LOCALE],
          helpPageStrings(DEFAULT_LOCALE),
          base,
        ),
      });

      /**
       * The root page keeps serving the default language, but now declares the
       * alternates and points its canonical at `/az` — otherwise `/` and `/az`
       * are two URLs with identical content competing with each other.
       */
      entry.source = renderLocalePage(html, DEFAULT_LOCALE, localeUrl(DEFAULT_LOCALE));

      /**
       * `404.html` — what GitHub Pages serves for every address that is not a
       * file, WITH the 404 status kept (that is the part search engines act on;
       * the file only replaces GitHub's own screen). One file for the whole site,
       * so it carries all 20 languages and picks one in the browser. See
       * `src/app/not-found-page.ts` for why it is a real error page and not a
       * copy of the app shell.
       *
       * ⚠️ It is only REACHABLE because `navigateFallbackAllowlist` in
       * `vite.config.ts` stops the service worker answering unknown paths out of
       * the precache. Without that, a returning visitor never sees this file.
       */
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: renderNotFoundPage(notFoundCopy(), base),
      });

      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() });

      /**
       * The IndexNow ownership key file. Name and body are the SAME constant, so
       * the file cannot be half-right — which is the only failure mode it has.
       *
       * No trailing newline, deliberately: the verifiers compare the body to the
       * key, and the tool that reported this file missing states the contract as
       * an exact pair ("with the key as its name / and the key as its content").
       * Rollup writes an emitted string as UTF-8 with no BOM, which is the other
       * half of what they ask for.
       */
      this.emitFile({ type: 'asset', fileName: `${INDEXNOW_KEY}.txt`, source: INDEXNOW_KEY });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
      });
    },
  };
}
