import type { Locale } from '../types/resume';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALES } from './i18n/locales';
import { localeSegment } from './seo-locales';

/**
 * The `404.html` GitHub Pages serves for every address that is not a real file,
 * and the two decisions that shape it.
 *
 * WHY IT EXISTS. The old onlinecv.az had a backend, so it published thousands of
 * URLs this rebuild deliberately does not have — `/en/university/adiud`,
 * `/candidate/elvin`, the graduate directories. Search engines still hold them
 * and still send people to them. The origin has always answered those correctly
 * with a **404**; what it answered them *with* was GitHub's own
 * "Page not found · GitHub Pages" screen — no way back to the app, no language,
 * and no explanation that the page was retired rather than broken. Pages serves a
 * repo's own `404.html` **with the 404 status intact**, so this replaces the
 * screen without touching the status code, which is the part search engines act
 * on.
 *
 * WHY IT IS NOT THE APP SHELL. The usual static-host trick is to make `404.html`
 * a copy of `index.html` so the SPA boots and routes client-side. That is wrong
 * here for a reason specific to this app: it has exactly ONE route, so there is
 * nothing to route to — booting the app would silently hand someone who asked for
 * a university page the CV editor instead, with no indication their link was
 * dead. So this is a real error page: its own markup, inline CSS, and no
 * `/assets/*.js` at all. Being self-contained also means it renders identically at
 * any path depth and cannot itself 404 on a missing asset.
 *
 * WHY THE LOCALE IS RESOLVED IN THE BROWSER. Pages serves ONE file for every
 * miss, so the language cannot be baked in per URL the way the locale landing
 * pages are. The markup therefore ships the DEFAULT locale — a crawler and a
 * JavaScript-less client get complete, valid content — and a small inline script
 * swaps in one of the other 19 from the path (`/en/university/adiud` is an English
 * visitor) or from `navigator.languages`. Every translation is embedded, which is
 * affordable precisely because there are only four short strings per locale.
 *
 * THE PRECEDENCE DELIBERATELY DIFFERS FROM `initialLocale`. The app resolves
 * path → stored preference → default, and never consults the browser's languages.
 * The middle term is not available here: the stored locale lives in the IndexedDB
 * resume record, and reading it would mean teaching a static page the database
 * schema for a guess it needs before first paint. `navigator.languages` takes that
 * slot instead, which also suits who actually lands here — someone following a
 * years-old search result, i.e. usually a first visit with nothing stored. A path
 * locale still wins over both, exactly as it does in the app.
 */

export interface NotFoundStrings {
  /** Headline: "Page not found". */
  title: string;
  /** One line: the address does not exist. */
  body: string;
  /** Why it does not exist — the retired backend pages, the common case here. */
  retired: string;
  /** Call to action back into the app. */
  action: string;
}

/** What the inline script needs per locale: the copy plus its writing direction. */
interface NotFoundEntry extends NotFoundStrings {
  dir: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Brand `#1461c7`, not `#1877F2`, on anything bearing text.
 *
 * The brand blue is ~4.2:1 against white, which fails AA for text at this size;
 * the darker tone is the app-wide rule for text-bearing surfaces (CLAUDE.md).
 * `#1877F2` stays where it is only decoration — the `theme-color` meta.
 */
const BRAND_TEXT = '#1461c7';

/**
 * Inter from the app's own woff2 pair, and deliberately NO East Asian face.
 *
 * The three CJK faces are 4.1–16.1 MB each and are kept out of the precache for
 * that reason; pulling one onto an error page would cost more than the whole app.
 * Korean, Chinese and Japanese fall through to the system font here, which every
 * platform that reads those scripts has.
 */
function styles(base: string): string {
  return `
      @font-face {
        font-family: "Inter";
        src: url("${base}fonts/woff2/Inter-Regular.woff2") format("woff2");
        font-weight: 400;
        font-display: swap;
      }
      @font-face {
        font-family: "Inter";
        src: url("${base}fonts/woff2/Inter-SemiBold.woff2") format("woff2");
        font-weight: 600;
        font-display: swap;
      }

      html,
      body {
        height: 100%;
      }
      body {
        margin: 0;
        background: #f5f5f5;
        color: rgba(0, 0, 0, 0.88);
        font-family: Inter, "Segoe UI", Roboto, "Noto Sans", -apple-system, sans-serif;
        -webkit-font-smoothing: antialiased;
        /* Centred rather than start-aligned, so the page needs no mirroring for
           Arabic and Hebrew beyond the \`dir\` the script sets. */
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
      }

      main {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        padding: 40px 32px;
        max-width: 520px;
        width: 100%;
        text-align: center;
        box-sizing: border-box;
      }

      .brand {
        display: inline-block;
        line-height: 0;
      }
      .brand img {
        width: 102px;
        height: 56px;
      }

      .code {
        margin: 24px 0 0;
        font-size: 56px;
        font-weight: 600;
        line-height: 1;
        color: ${BRAND_TEXT};
        letter-spacing: 0.02em;
      }

      h1 {
        margin: 12px 0 0;
        font-size: 22px;
        font-weight: 600;
        line-height: 1.35;
      }

      p.body {
        margin: 12px 0 0;
        font-size: 15px;
        line-height: 1.6;
      }

      code {
        display: inline-block;
        margin-top: 16px;
        max-width: 100%;
        overflow-wrap: break-word;
        padding: 4px 8px;
        border-radius: 6px;
        background: #f5f5f5;
        color: rgba(0, 0, 0, 0.65);
        font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
        font-size: 13px;
        /* The path is user-supplied; keep it neutral and always left-to-right so
           a crafted RTL character cannot reorder what it appears to say. */
        direction: ltr;
        unicode-bidi: isolate;
      }

      p.retired {
        margin: 20px 0 0;
        font-size: 13px;
        line-height: 1.6;
        color: rgba(0, 0, 0, 0.55);
      }

      a.cta {
        display: inline-block;
        margin-top: 28px;
        padding: 10px 24px;
        border-radius: 8px;
        background: ${BRAND_TEXT};
        color: #fff;
        font-size: 15px;
        font-weight: 600;
        text-decoration: none;
        /* Touch target (§10.3): 44px tall including padding. */
        min-height: 24px;
        transition: background 200ms ease-out;
      }
      a.cta:hover,
      a.cta:focus-visible {
        background: #0f4fa3;
      }

      @media (prefers-reduced-motion: reduce) {
        a.cta {
          transition: none;
        }
      }

      @media (max-width: 575px) {
        main {
          padding: 32px 20px;
        }
        .code {
          font-size: 44px;
        }
        h1 {
          font-size: 19px;
        }
      }`;
}

/**
 * Resolve the locale in the browser and fill the page in.
 *
 * Hand-written ES5-flavoured JavaScript, not compiled output: it is inlined into
 * a static file that no bundler touches, so it has to run as-is in whatever
 * opened the link.
 *
 * The path rule mirrors `localeFromPath` — scan every segment, ignore a `.html`
 * suffix — rather than assuming position, so it holds under any base path and
 * treats `/en`, `/en/`, `/en.html` and `/en/university/adiud` alike.
 */
function script(base: string, entries: Record<string, NotFoundEntry>): string {
  // `<` escaped so no translation can ever close the script tag early.
  const data = JSON.stringify(entries).replace(/</g, '\\u003c');
  return `
      (function () {
        var COPY = ${data};
        var BASE = ${JSON.stringify(base)};
        var path = location.pathname;
        var found = '';

        var segments = path.split('/');
        for (var i = 0; i < segments.length && !found; i++) {
          var segment = segments[i].replace(/\\.html$/, '');
          if (COPY[segment]) found = segment;
        }

        if (!found) {
          var prefs = navigator.languages || [navigator.language || ''];
          for (var j = 0; j < prefs.length && !found; j++) {
            var tag = String(prefs[j]).toLowerCase().split('-')[0];
            if (COPY[tag]) found = tag;
          }
        }

        var locale = found || ${JSON.stringify(DEFAULT_LOCALE)};
        var copy = COPY[locale];
        var text = function (id, value) {
          document.getElementById(id).textContent = value;
        };

        document.documentElement.lang = locale;
        document.documentElement.dir = copy.dir;
        document.title = copy.title + ' \\u2014 OnlineCV';
        text('nf-title', copy.title);
        text('nf-body', copy.body);
        text('nf-retired', copy.retired);
        text('nf-action', copy.action);
        document.getElementById('nf-action').href = BASE + locale;
        document.getElementById('nf-brand').href = BASE + locale;

        /* The address that failed, shown so the visitor can see WHAT was wrong.
           textContent, never innerHTML: this string comes from the URL bar. */
        text('nf-path', path);
      })();`;
}

/**
 * Render `404.html`.
 *
 * `copy` is a total `Record<Locale, …>` on purpose: adding a locale fails to
 * compile until its `notFound` strings exist, the same forcing function `LOCALES`
 * and the locale landing pages rely on. `base` is passed in rather than read from
 * `import.meta.env` so the build-time caller (which runs in Node) can supply it.
 */
export function renderNotFoundPage(copy: Record<Locale, NotFoundStrings>, base: string): string {
  const entries: Record<string, NotFoundEntry> = {};
  for (const locale of SUPPORTED_LOCALES) {
    entries[localeSegment(locale)] = { ...copy[locale], dir: LOCALES[locale].dir };
  }

  const fallback = copy[DEFAULT_LOCALE];
  const meta = LOCALES[DEFAULT_LOCALE];

  return `<!doctype html>
<html lang="${DEFAULT_LOCALE}" dir="${meta.dir}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#1877F2" />
    <!--
      Belt and braces. The 404 STATUS is what keeps this page out of an index, and
      Pages sends it for every miss; this only makes the intent explicit for any
      crawler that reaches the file some other way. \`follow\` so the link back into
      the app is still worth something.
    -->
    <meta name="robots" content="noindex, follow" />
    <link rel="icon" href="${base}favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="${base}apple-touch-icon.png" />
    <title>${escapeHtml(fallback.title)} — OnlineCV</title>
    <style>${styles(base)}
    </style>
  </head>
  <body>
    <main>
      <a class="brand" id="nf-brand" href="${base}${localeSegment(DEFAULT_LOCALE)}">
        <img src="${base}logo.svg" alt="OnlineCV" width="102" height="56" />
      </a>
      <p class="code">404</p>
      <h1 id="nf-title">${escapeHtml(fallback.title)}</h1>
      <p class="body" id="nf-body">${escapeHtml(fallback.body)}</p>
      <code id="nf-path"></code>
      <p class="retired" id="nf-retired">${escapeHtml(fallback.retired)}</p>
      <a class="cta" id="nf-action" href="${base}${localeSegment(DEFAULT_LOCALE)}">${escapeHtml(
        fallback.action,
      )}</a>
    </main>
    <script>${script(base, entries)}
    </script>
  </body>
</html>
`;
}
