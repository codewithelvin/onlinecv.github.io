import type { Locale } from '../types/resume';
import { LOCALES, SUPPORTED_LOCALES } from './i18n/locales';
import {
  SITE_ORIGIN,
  helpUrl,
  hreflangAlternates,
  localeSegment,
  ogImageUrl,
  ogLocale,
} from './seo-locales';
import { fillCounts } from '../features/help/counts';
import { parseInline } from '../features/help/inline';
import { HELP_SHOT_SIZE, helpShotUrl } from '../features/help/shots';
import { HELP_TOPICS } from '../features/help/topics';
import type { HelpBlock, HelpContent } from '../features/help/types';

/**
 * The static user guide, one page per language (spec §10.4 / §19.2 as amended).
 *
 * WHY A STATIC PAGE AND NOT JUST THE IN-APP PANEL. Two different readers.
 * The panel serves someone already in the editor; this serves someone who is not
 * — a person who searched "what does B2 mean on a CV", a link pasted into a chat,
 * a colleague sending the guide to a friend, and a crawler. Until now this site
 * had literally nothing worth indexing: the landing page is a pitch, and every CV
 * is private. The guide is the first real content it has, in twenty languages.
 *
 * WHY IT SHIPS NO APPLICATION JAVASCRIPT. Same reasoning as `not-found-page.ts`:
 * a page whose entire job is to be readable must not depend on a 1.8 MB bundle
 * booting first. Everything here is in the served HTML, so it renders with
 * scripting off, prints correctly, and is indexed as prose rather than as an empty
 * `<div id="root">`.
 *
 * WHY IT IS A SECOND RENDERER RATHER THAN `renderToStaticMarkup`. The panel's
 * output is Ant Design markup that depends on Ant Design's runtime CSS-in-JS;
 * reproducing that in a standalone file would mean extracting and inlining a
 * component library's stylesheet to draw eighteen articles. The block model
 * (`features/help/types.ts`) exists precisely so the same content can be rendered
 * twice, cheaply — and because both renderers switch exhaustively over
 * `HelpBlock`, adding a block kind fails to compile here as well as there.
 */

/** Chrome around the article, read from the app's own i18n bundles. */
export interface HelpPageStrings {
  /** Heading over the table of contents — `help.topics`. */
  topics: string;
  /**
   * The call to action back into the app.
   *
   * Deliberately `notFound.action` ("Create your CV") rather than a new key: it is
   * the same sentence aimed at the same reader — someone on a static page who
   * should be offered the app — and it is already translated into all twenty
   * languages with the register each bundle uses.
   */
  action: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** `**bold**` → `<strong>`, with everything else escaped. */
function inline(text: string): string {
  return parseInline(fillCounts(text))
    .map((run) => (run.bold ? `<strong>${escapeHtml(run.text)}</strong>` : escapeHtml(run.text)))
    .join('');
}

/** Plain text — for an `alt`, a `<title>` or a meta tag. */
function plain(text: string): string {
  return escapeHtml(
    parseInline(fillCounts(text))
      .map((run) => run.text)
      .join(''),
  );
}

/**
 * Brand `#1461c7`, not `#1877F2`, on anything bearing text — the brand blue is
 * ~4.2:1 against white and fails AA at body sizes. Same rule as `404.html`.
 */
const BRAND_TEXT = '#1461c7';

/**
 * One block. Exhaustive over `HelpBlock`; its twin is `features/help/blocks.tsx`.
 *
 * `never` at the end rather than a `default` branch: a `default` would happily
 * absorb a newly added kind and render nothing, which is the failure this whole
 * arrangement exists to prevent.
 */
function renderBlock(block: HelpBlock, locale: Locale, base: string): string {
  switch (block.kind) {
    case 'p':
      return `<p>${inline(block.text)}</p>`;
    case 'h':
      return `<h3>${inline(block.text)}</h3>`;
    case 'ul':
      return `<ul>${block.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`;
    case 'steps':
      return `<ol>${block.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ol>`;
    case 'dl':
      return `<dl>${block.items
        .map((i) => `<dt>${inline(i.term)}</dt><dd>${inline(i.def)}</dd>`)
        .join('')}</dl>`;
    case 'note':
      return `<p class="note">${inline(block.text)}</p>`;
    case 'warn':
      return `<p class="warn">${inline(block.text)}</p>`;
    case 'shot': {
      const size = HELP_SHOT_SIZE[block.id];
      /**
       * The caption is the `alt` and the visible `<figcaption>` is hidden from
       * assistive technology, not the other way round — otherwise a screen reader
       * announces the same sentence twice for every screenshot in the guide.
       * `width`/`height` reserve the box so the article does not reflow under the
       * reader as images arrive.
       */
      return `<figure><img src="${escapeHtml(
        helpShotUrl(base, locale, block.id),
      )}" alt="${plain(block.caption)}" width="${size.width}" height="${
        size.height
      }" loading="lazy" decoding="async" /><figcaption aria-hidden="true">${inline(
        block.caption,
      )}</figcaption></figure>`;
    }
    default: {
      const never: never = block;
      throw new Error(`help-page: unhandled block ${JSON.stringify(never)}`);
    }
  }
}

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

      *, *::before, *::after { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f5f5f5;
        color: rgba(0, 0, 0, 0.88);
        /* No CJK face is declared, exactly as on \`404.html\`: the three Han/Hangul
           files are 4.1–16.1 MB and are kept out of the precache for that reason,
           so a text page falls through to the system font every platform that
           reads those scripts already has. */
        font-family: Inter, "Segoe UI", Roboto, "Noto Sans", -apple-system, sans-serif;
        font-size: 16px;
        line-height: 1.65;
        -webkit-font-smoothing: antialiased;
      }

      .bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding: 12px 20px;
        background: #fff;
        border-bottom: 1px solid #f0f0f0;
        position: sticky;
        top: 0;
        z-index: 2;
      }
      .bar .brand { display: inline-flex; line-height: 0; }
      .bar img { width: 102px; height: 56px; }

      a.cta {
        display: inline-block;
        padding: 9px 20px;
        border-radius: 8px;
        background: ${BRAND_TEXT};
        color: #fff;
        font-weight: 600;
        text-decoration: none;
      }
      a.cta:hover, a.cta:focus-visible { background: #0f4fa3; }

      main {
        max-width: 780px;
        margin: 0 auto;
        padding: 28px 20px 64px;
      }
      /*
       * Every anchor target reserves room for the sticky bar above it.
       *
       * Without this, \`/az/help#projects\` works exactly as the standard says and
       * still looks broken: the browser scrolls the article to y=0, the sticky
       * bar is drawn over the top 81px of it, and the reader lands on the middle
       * of a paragraph with the heading they asked for hidden underneath. There
       * is nothing to click to recover — it reads as a dead link.
       *
       * 96px = the bar's measured 81px plus breathing room, and the bar is only
       * sticky at widths where it is guaranteed to be one row (see the media
       * query at the bottom: below 576px it stops sticking, precisely because
       * German, Greek and Hungarian wrap it to 136px there and no single offset
       * could then be right).
       */
      article[id] { scroll-margin-top: 96px; }
      article {
        background: #fff;
        border-radius: 12px;
        padding: 28px 28px 32px;
        margin-bottom: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      h1 { font-size: 30px; line-height: 1.25; margin: 0 0 8px; }
      h2 { font-size: 22px; line-height: 1.3; margin: 0 0 4px; }
      h3 { font-size: 16px; margin: 26px 0 8px; }
      .intro, .lead { color: rgba(0, 0, 0, 0.55); margin: 0 0 20px; }
      p { margin: 0 0 12px; }

      /* \`padding-inline-start\`, not \`padding-left\`: the marker has to sit on the
         right in Arabic and Hebrew, and a physical property would leave it
         stranded on the far side of the text. */
      ul, ol { margin: 0 0 12px; padding-inline-start: 22px; }
      li { margin-bottom: 4px; }

      dl { margin: 0 0 12px; }
      dt { font-weight: 600; margin-top: 12px; }
      dd { margin: 2px 0 0; margin-inline-start: 0; }

      .note, .warn {
        border-inline-start: 3px solid #91caff;
        background: #f0f7ff;
        padding: 10px 14px;
        border-radius: 0 8px 8px 0;
        margin: 14px 0;
      }
      .warn { border-inline-start-color: #ffd591; background: #fffbe6; }

      figure { margin: 20px 0; }
      figure img {
        display: block;
        max-width: 100%;
        height: auto;
        border: 1px solid #f0f0f0;
        border-radius: 8px;
        background: #fafafa;
      }
      figcaption { margin-top: 8px; font-size: 13px; color: rgba(0, 0, 0, 0.55); }

      nav.toc ol { padding-inline-start: 20px; }
      nav.toc a { color: ${BRAND_TEXT}; }
      nav.toc .lead { display: block; color: rgba(0, 0, 0, 0.45); font-size: 14px; margin: 0; }

      footer {
        max-width: 780px;
        margin: 0 auto;
        padding: 0 20px 48px;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.55);
      }
      footer ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px; }
      footer a { color: ${BRAND_TEXT}; }

      @media (max-width: 575px) {
        body { font-size: 15px; }
        article { padding: 20px 18px 24px; border-radius: 10px; }
        h1 { font-size: 24px; }
        h2 { font-size: 19px; }
        /*
         * The bar stops sticking on a phone, and that is what makes the anchors
         * reliable rather than approximately right.
         *
         * Measured across 20 locales × 4 widths: the bar is 81px everywhere
         * except German, Greek and Hungarian at 320px and Greek at 375px, where
         * the CTA no longer fits beside the logo and \`flex-wrap\` takes it to a
         * second row — 136px. So on a phone the offset would have to be either
         * 96px (wrong for those four) or 152px (70px of dead space above every
         * heading for the other seventy-six). Not sticking removes the choice,
         * and it also stops a fifth of a ~700px viewport being permanently spent
         * on a button, which is a poor trade on a page whose job is reading.
         */
        .bar { position: static; }
        article[id] { scroll-margin-top: 16px; }
      }`;
}

/**
 * `TechArticle` structured data.
 *
 * Not `FAQPage`, even though one topic is a list of questions: Google restricted
 * FAQ rich results to a short list of authoritative sites in 2023, so marking it
 * up buys nothing and misdescribes an eighteen-part manual. `TechArticle` is what
 * this actually is, and `inLanguage` is the part that matters here — twenty pages
 * of the same document differing only by language.
 *
 * Hand-written rather than built with `schema-dts` because this module is imported
 * by the Vite config's process (see `vite-plugin-locale-pages.ts`); the types
 * would be erased at runtime anyway, and the shape is four fields.
 */
function jsonLd(locale: Locale, content: HelpContent, url: string): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: fillCounts(content.title),
    description: fillCounts(content.intro),
    inLanguage: locale,
    url,
    image: ogImageUrl(locale),
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: 'OnlineCV', url: SITE_ORIGIN },
  };
  // `<` escaped so no translated string can close the script tag early — the same
  // precaution `not-found-page.ts` takes with its embedded copy table.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Render one language's guide page. */
export function renderHelpPage(
  locale: Locale,
  content: HelpContent,
  strings: HelpPageStrings,
  base: string,
): string {
  const meta = LOCALES[locale];
  const url = helpUrl(locale);
  const title = `${fillCounts(content.title)} — OnlineCV`;
  const description = fillCounts(content.intro);

  const alternates = hreflangAlternates(helpUrl)
    .map(
      ({ hreflang, href }) =>
        `    <link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}" />`,
    )
    .join('\n');

  const toc = HELP_TOPICS.map((id) => {
    const topic = content.topics[id];
    if (!topic) throw new Error(`help-page: ${locale} is missing the "${id}" topic`);
    return `<li><a href="#${id}">${plain(topic.title)}</a><span class="lead">${plain(
      topic.lead,
    )}</span></li>`;
  }).join('');

  const articles = HELP_TOPICS.map((id) => {
    const topic = content.topics[id];
    return `<article id="${id}">
      <h2>${plain(topic.title)}</h2>
      <p class="lead">${plain(topic.lead)}</p>
      ${topic.blocks.map((block) => renderBlock(block, locale, base)).join('\n      ')}
    </article>`;
  }).join('\n    ');

  /**
   * Links to the other nineteen guides, as real anchors.
   *
   * `hreflang` alone tells a crawler the translations exist; a link tells a
   * READER, and it is the only way someone who landed on the wrong language can
   * reach their own without editing the URL. It also gives the twenty pages a
   * genuine internal link graph, which is the cheapest SEO on the page.
   */
  const languages = SUPPORTED_LOCALES.map(
    (other) =>
      `<li><a lang="${other}" hreflang="${other}" href="${escapeHtml(
        `${base}${localeSegment(other)}/help`,
      )}">${escapeHtml(LOCALES[other].nativeName)}</a></li>`,
  ).join('');

  return `<!doctype html>
<html lang="${locale}" dir="${meta.dir}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#1877F2" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${plain(description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
${alternates}
    <link rel="icon" href="${base}favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="${base}apple-touch-icon.png" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="OnlineCV" />
    <meta property="og:locale" content="${ogLocale(locale)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${plain(description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${escapeHtml(ogImageUrl(locale))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${plain(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl(locale))}" />
    <script type="application/ld+json">${jsonLd(locale, content, url)}</script>
    <style>${styles(base)}
    </style>
  </head>
  <body>
    <header class="bar">
      <a class="brand" href="${base}${localeSegment(locale)}">
        <img src="${base}logo.svg" alt="OnlineCV" width="102" height="56" />
      </a>
      <a class="cta" href="${base}${localeSegment(locale)}">${escapeHtml(strings.action)}</a>
    </header>
    <main>
      <h1>${plain(content.title)}</h1>
      <p class="intro">${plain(content.intro)}</p>
      <nav class="toc" aria-label="${escapeHtml(strings.topics)}">
        <article>
          <h2>${escapeHtml(strings.topics)}</h2>
          <ol>${toc}</ol>
        </article>
      </nav>
    ${articles}
    </main>
    <footer>
      <ul>${languages}</ul>
    </footer>
  </body>
</html>
`;
}
