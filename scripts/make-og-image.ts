/**
 * Regenerate the social cards — the 1200×630 images a network shows when a page
 * of onlinecv.az is shared. ONE PER LANGUAGE, written to `public/og/<locale>.jpg`.
 *
 *   npx vite-node scripts/make-og-image.ts               # all 20
 *   npx vite-node scripts/make-og-image.ts -- ja ar      # just these
 *
 * WHY IT EXISTS. `og:image` used to point at `pwa/logo512.png`, the square PWA
 * icon. Every network that renders a large card wants 1.91:1 and letterboxes or
 * centre-crops anything else, so a 512×512 icon came out as a small square badge
 * or a cropped fragment of one.
 *
 * WHY ONE PER LANGUAGE. A card is almost entirely WORDS. Each locale has had its
 * own indexable page with its own translated `<title>` and description since the
 * locale pages were introduced, but every one of them advertised the same
 * Azerbaijani picture: a Japanese link posted on X, a German one in a Slack
 * channel, both previewed with an Azerbaijani headline over an Azerbaijani sample
 * CV. The image was the last thing on those pages still speaking one language.
 *
 * Everything on a card is READ FROM THE APP — the i18n bundles, the template
 * registry, the locale registry, and a real `classic` render of the sample CV in
 * that language — so no card can end up advertising copy the app does not have or
 * a number that has moved on.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getTemplate, listTemplates } from '../src/templates/_core/registry';
import { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES } from '../src/app/i18n/locales';
import { cvFontFamily, primaryFont } from '../src/templates/_core/fonts';
import { makeDateFormatter } from '../src/utils/date';
import { i18n } from '../src/app/i18n';
import type { Locale } from '../src/types/resume';
import { applyFieldVisibility } from '../src/utils/field-visibility';
import { localizeResume, referencedDictionaryGroups } from '../src/utils/localize-resume';
import { loadDictionaries } from '../src/data/dictionaries';
import { fullResume } from '../src/test/fixtures/full-resume';
import { capture, type CaptureJob } from './capture';

const ROOT = resolve(import.meta.dirname, '..');
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
/** A4 in points, as `A4Frame` lays it out. */
const SHEET_WIDTH = 595;
const SHEET_HEIGHT = 842;

/** Width of the text column, and the tilted sheet's overhang past the right edge. */
const TEXT_COLUMN = 660;

/**
 * Brand blue, and the DARKER value on purpose. `#1877F2` fails AA against white
 * small text at about 4.2:1; `#1461c7` is the value the app uses wherever the
 * brand colour has words on it, and a social card is nothing but words on it.
 */
const BRAND = '#1461c7';
const BRAND_DEEP = '#0d3f86';

const INTER_WEIGHTS: Array<[string, number]> = [
  ['Regular', 400],
  ['Medium', 500],
  ['SemiBold', 600],
  ['Bold', 700],
];

/**
 * Where each script face's two weights live, and in which format.
 *
 * Keyed by the family names in `CV_FONT_STACK`. Korean takes the woff2 pair and
 * the two Han faces take their `.otf`s, matching what `index.css` loads for the
 * live preview — see there for why Noto CJK has no woff2 to take instead.
 *
 * Unlike `index.css` these are declared with no `unicode-range`, so a CJK card's
 * Latin runs are drawn by the CJK face rather than by Inter. That is deliberate:
 * it is what `services/pdf.ts` does (react-pdf knows nothing of ranges), so the
 * sheet on the card matches the PDF a visitor would actually download.
 */
const SCRIPT_FACES: Record<string, { dir: string; ext: string; format: string }> = {
  NotoSansGeorgian: { dir: 'ttf', ext: 'ttf', format: 'truetype' },
  NotoSansArabic: { dir: 'ttf', ext: 'ttf', format: 'truetype' },
  NotoSansHebrew: { dir: 'ttf', ext: 'ttf', format: 'truetype' },
  NanumGothic: { dir: 'woff2', ext: 'woff2', format: 'woff2' },
  NotoSansJP: { dir: 'ttf', ext: 'otf', format: 'opentype' },
  NotoSansSC: { dir: 'ttf', ext: 'otf', format: 'opentype' },
};

function face(family: string, weight: number, dir: string, file: string, format: string): string {
  const url = pathToFileURL(join(ROOT, 'public/fonts', dir, file)).href;
  return `@font-face{font-family:${family};font-style:normal;font-weight:${weight};src:url("${url}") format("${format}");}`;
}

/**
 * Inter plus, when the language needs one, the face that draws its script.
 *
 * Only the ONE extra family is declared rather than all six: a card is rendered
 * from a `file://` URL with no `unicode-range` to hold anything back, and the two
 * Han faces are 4.5–8.2 MB per weight, so declaring the lot would have every card
 * read tens of megabytes it cannot use.
 */
function fontFaces(locale: Locale): string {
  const faces = INTER_WEIGHTS.map(([name, weight]) =>
    face('Inter', weight, 'woff2', `Inter-${name}.woff2`, 'woff2'),
  );
  const family = primaryFont(locale);
  const spec = family ? SCRIPT_FACES[family] : undefined;
  if (family && spec) {
    faces.push(
      face(family, 400, spec.dir, `${family}-Regular.${spec.ext}`, spec.format),
      face(family, 700, spec.dir, `${family}-Bold.${spec.ext}`, spec.format),
    );
  }
  return faces.join('\n');
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The sample CV, rendered in one language exactly as the app would render it.
 *
 * The two projections in the order `useLocalizedResume` and `services/pdf.ts`
 * both apply them: hidden personal details blanked, then dictionary-backed values
 * (skills, languages, institutions, cities) re-labelled into the CV's language.
 * Free text stays as it was typed — the app never translates a user's prose, so
 * neither does the card.
 */
async function sheetMarkup(locale: Locale): Promise<string> {
  const stored = { ...fullResume(), locale };
  const visible = applyFieldVisibility(stored);
  const dicts = await loadDictionaries(referencedDictionaryGroups(visible));
  const resume = localizeResume(visible, locale, dicts);

  const entry = getTemplate('classic');
  const Template = (await entry.load()).default;
  const body = renderToStaticMarkup(
    createElement(Template, {
      resume,
      t: i18n.getFixedT(locale),
      formatDate: makeDateFormatter(locale),
    }),
  );

  /**
   * `A4Frame`'s geometry, and its direction handling with it: `textAlign: right`
   * for a right-to-left CV but NEVER `direction: rtl`, because the templates
   * mirror their own rows and a second mirroring from CSS lands back in
   * left-to-right. Hence `dir="ltr"` on the sheet even inside an RTL card.
   */
  const rtl = LOCALES[locale].dir === 'rtl';
  return `<div dir="ltr" style="width:${SHEET_WIDTH}px;height:${SHEET_HEIGHT}px;background:#fff;overflow:hidden;display:flex;flex-direction:column;font-family:${cvFontFamily(
    locale,
  )}${rtl ? ';text-align:right' : ''}">
  <div style="flex:1 1 auto;display:flex;flex-direction:column;margin-top:${
    entry.manifest.pageMargin?.top ?? 0
  }px">${body}</div>
</div>`;
}

function chip(label: string): string {
  return `<span style="display:inline-block;padding:7px 15px;margin-inline-end:8px;margin-bottom:8px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);font-size:19px;font-weight:500;color:#eaf2ff">${escapeHtml(
    label,
  )}</span>`;
}

/**
 * Roughly how wide a headline is, in Latin characters.
 *
 * A CJK or Hangul glyph occupies a full em where a Latin letter averages about
 * half of one, so counting characters would call the 8-character Chinese headline
 * five times shorter than the 43-character German one when the drawn difference
 * is under threefold. Counting ems keeps the size steps below meaningful in every
 * script, which is the whole reason they are not just a character count.
 */
function visualLength(text: string): number {
  /** Jamo, CJK radicals through the ideographs, Hangul syllables, the fullwidth forms. */
  const wide = /[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7A3\uF900-\uFAFF\uFF01-\uFF60\uFFE0-\uFFE6]/;
  let ems = 0;
  for (const char of text) ems += wide.test(char) ? 2 : 1;
  return ems;
}

/**
 * Headline size, stepped down for the languages that say it in more words.
 *
 * The headlines this reads span 8 characters (Chinese) to 43 (German), and at a
 * fixed 57px the long ones wrapped to three lines and pushed the chips off the
 * card. Three steps rather than a continuous fit: the column is a known width and
 * the copy only changes when someone edits a bundle, so the cheap version is
 * enough — but it has to exist, because "it fits in Azerbaijani" is not a fact
 * about the other nineteen.
 */
function headlineSize(headline: string): number {
  const width = visualLength(headline);
  if (width <= 30) return 57;
  if (width <= 46) return 50;
  return 44;
}

async function cardHtml(locale: Locale): Promise<string> {
  const t = i18n.getFixedT(locale);
  const rtl = LOCALES[locale].dir === 'rtl';
  const logo = pathToFileURL(join(ROOT, 'public/logo.svg')).href;

  /**
   * The headline is the `<title>` minus the brand, which every bundle writes as
   * `OnlineCV — …`: the card already carries the wordmark above it, so repeating
   * it would spend the largest type on the one word that is not translated.
   * `pop()` on a string with no dash returns the whole title, so a bundle that
   * ever drops the convention degrades to a longer headline rather than to none.
   */
  const title = String(t('seo.title'));
  const headline = title.split('—').pop()?.trim() ?? title;
  const chips = [
    String(t('seo.card.languages', { n: SUPPORTED_LOCALES.length })),
    String(t('seo.card.templates', { n: listTemplates().length })),
    String(t('templatePicker.atsSafe')),
    String(t('seo.card.noSignup')),
  ];

  /**
   * The tilted sheet sits on the side the language ENDS on — right in Latin,
   * left in Arabic and Hebrew — so the text column always starts at the edge a
   * reader's eye starts from. The rotation has to be flipped by hand: CSS
   * transforms know nothing about writing direction.
   */
  const sheetInset = rtl ? 'left:-56px' : 'right:-56px';
  const sheetTilt = rtl ? 'rotate(7deg)' : 'rotate(-7deg)';
  const sheetOrigin = rtl ? 'top right' : 'top left';

  /**
   * Korean is the ONE language here that must not break between syllables, and
   * the browser's default does exactly that: the headline came out as
   * `무료 온라인 이력서 만들` / `기`, a word split across two lines. `keep-all`
   * restricts it to the spaces Korean actually writes between words.
   *
   * Deliberately not applied to Japanese or Chinese, which are the reason the
   * default exists: they are written with no spaces at all, so forbidding a break
   * inside a run forbids wrapping altogether and the line leaves the card.
   */
  const wordBreak = locale === 'ko' ? 'word-break:keep-all;' : '';

  return `<!doctype html>
<html lang="${locale}" dir="${LOCALES[locale].dir}"><head><meta charset="utf-8"><style>
${fontFaces(locale)}
html,body{margin:0;padding:0}
*{box-sizing:border-box}
body{width:${OG_WIDTH}px;height:${OG_HEIGHT}px;overflow:hidden;
  /* Inter leads even in a CJK card, so the wordmark and the domain are Inter and
     the script face answers only for its own glyphs, by per-character fallback. */
  font-family:Inter, ${cvFontFamily(locale)};
  background:linear-gradient(135deg,${BRAND} 0%,${BRAND_DEEP} 100%);}
</style></head>
<body>
  <div style="position:relative;width:100%;height:100%;display:flex;align-items:center">
    <!-- text column -->
    <div style="width:${TEXT_COLUMN}px;padding-inline-start:64px;color:#fff;overflow:hidden;${wordBreak}">
      <div style="display:flex;align-items:center;margin-bottom:26px">
        <img src="${logo}" alt="" style="height:44px;width:auto;background:#fff;border-radius:9px;padding:5px 9px" />
        <span style="margin-inline-start:14px;font-size:27px;font-weight:700;letter-spacing:.4px">OnlineCV</span>
      </div>
      <div style="font-size:${headlineSize(
        headline,
      )}px;line-height:1.1;font-weight:700;letter-spacing:-.5px">${escapeHtml(headline)}</div>
      <div style="margin-top:20px;font-size:22px;line-height:1.45;color:#d6e4fb;max-width:560px">${escapeHtml(
        String(t('seo.description')),
      )}</div>
      <div style="margin-top:26px">
        ${chips.map(chip).join('')}
      </div>
      <div style="margin-top:26px;font-size:23px;font-weight:600;color:#ffffff">onlinecv.az</div>
    </div>

    <!--
      A real classic-template render, scaled and tilted so the card shows the
      PRODUCT rather than a logo. CSS transforms are fine here: this markup is only
      ever drawn by a browser, never by react-pdf, so none of the template
      CSS-subset rules apply to the card around it.
    -->
    <div style="position:absolute;${sheetInset};top:64px;width:520px;height:600px">
      <div style="transform:scale(.78) ${sheetTilt};transform-origin:${sheetOrigin};
                  box-shadow:0 26px 70px rgba(0,0,0,.42);border-radius:4px;overflow:hidden;width:${SHEET_WIDTH}px">
        ${await sheetMarkup(locale)}
      </div>
    </div>
  </div>
</body></html>`;
}

async function main(): Promise<void> {
  const wanted = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
  const locales = SUPPORTED_LOCALES.filter((l) => wanted.length === 0 || wanted.includes(l));
  if (locales.length === 0) throw new Error(`No such locale(s): ${wanted.join(', ')}`);

  const dir = join(ROOT, 'public/og');
  mkdirSync(dir, { recursive: true });

  const jobs: CaptureJob[] = [];
  for (const locale of locales) {
    jobs.push({
      html: await cardHtml(locale),
      out: join(dir, `${locale}.jpg`),
      width: OG_WIDTH,
      height: OG_HEIGHT,
      format: 'jpeg',
      quality: 88,
    });
  }

  await capture(jobs);

  /**
   * `public/og-image.jpg` is the single card these replaced, and it is kept as a
   * copy of the default locale's rather than deleted: it is the URL every page's
   * `og:image` pointed at from 2026-08-06 until the cards became per-language, so
   * it is what an already-cached link preview may still re-fetch. Nothing in the
   * app references it.
   */
  if (locales.includes(DEFAULT_LOCALE)) {
    const legacy = join(ROOT, 'public/og-image.jpg');
    copyFileSync(join(dir, `${DEFAULT_LOCALE}.jpg`), legacy);
    console.log(`✓ ${legacy} (copy of ${DEFAULT_LOCALE}, for the retired single-card URL)`);
  }
}

await main();
