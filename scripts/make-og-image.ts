/**
 * Regenerate `public/og-image.jpg` — the 1200×630 card social networks show when
 * onlinecv.az is shared.
 *
 *   npx vite-node scripts/make-og-image.ts
 *
 * WHY IT EXISTS. `og:image` used to point at `pwa/logo512.png`, the square PWA
 * icon. Every network that renders a large card wants 1.91:1 and letterboxes or
 * centre-crops anything else, so a 512×512 icon came out as a small square badge
 * or a cropped fragment of one. That was the last placeholder in the head.
 *
 * The counts and the sheet on the right are READ FROM THE APP — the template
 * registry, the locale registry and the real `classic` render — so the card
 * cannot quietly end up advertising the wrong number of languages, and the CV it
 * shows is genuinely what the product outputs.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getTemplate, listTemplates } from '../src/templates/_core/registry';
import { SUPPORTED_LOCALES } from '../src/app/i18n/locales';
import { cvFontFamily } from '../src/templates/_core/fonts';
import { makeDateFormatter } from '../src/utils/date';
import { i18n } from '../src/app/i18n';
import { fullResume } from '../src/test/fixtures/full-resume';
import { capture } from './capture';

const ROOT = resolve(import.meta.dirname, '..');
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
/** A4 in points, as `A4Frame` lays it out. */
const SHEET_WIDTH = 595;
const SHEET_HEIGHT = 842;

/**
 * Brand blue, and the DARKER value on purpose. `#1877F2` fails AA against white
 * small text at about 4.2:1; `#1461c7` is the value the app uses wherever the
 * brand colour has words on it, and a social card is nothing but words on it.
 */
const BRAND = '#1461c7';
const BRAND_DEEP = '#0d3f86';

function fontFaces(): string {
  const weights: Array<[string, number]> = [
    ['Regular', 400],
    ['Medium', 500],
    ['SemiBold', 600],
    ['Bold', 700],
  ];
  return weights
    .map(([name, weight]) => {
      const url = pathToFileURL(join(ROOT, 'public/fonts/woff2', `Inter-${name}.woff2`)).href;
      return `@font-face{font-family:Inter;font-style:normal;font-weight:${weight};src:url("${url}") format("woff2");}`;
    })
    .join('\n');
}

async function sheetMarkup(): Promise<string> {
  const resume = fullResume();
  const entry = getTemplate('classic');
  const Template = (await entry.load()).default;
  const body = renderToStaticMarkup(
    createElement(Template, {
      resume,
      t: i18n.getFixedT(resume.locale),
      formatDate: makeDateFormatter(resume.locale),
    }),
  );
  return `<div style="width:${SHEET_WIDTH}px;height:${SHEET_HEIGHT}px;background:#fff;overflow:hidden;display:flex;flex-direction:column;font-family:${cvFontFamily(
    resume.locale,
  )}">
  <div style="flex:1 1 auto;display:flex;flex-direction:column;margin-top:${
    entry.manifest.pageMargin?.top ?? 0
  }px">${body}</div>
</div>`;
}

function chip(label: string): string {
  return `<span style="display:inline-block;padding:7px 15px;margin:0 8px 8px 0;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);font-size:19px;font-weight:500;color:#eaf2ff">${label}</span>`;
}

async function main(): Promise<void> {
  const locales = SUPPORTED_LOCALES.length;
  const templates = listTemplates().length;
  const logo = pathToFileURL(join(ROOT, 'public/logo.svg')).href;
  // Read rather than restated, so the card and the <head> cannot disagree.
  const { seo } = JSON.parse(readFileSync(join(ROOT, 'src/app/i18n/az.json'), 'utf8')) as {
    seo: { title: string; description: string };
  };
  const headline = seo.title.split('—').pop()?.trim() ?? seo.title;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
${fontFaces()}
html,body{margin:0;padding:0}
*{box-sizing:border-box}
body{width:${OG_WIDTH}px;height:${OG_HEIGHT}px;overflow:hidden;font-family:Inter,sans-serif;
  background:linear-gradient(135deg,${BRAND} 0%,${BRAND_DEEP} 100%);}
</style></head>
<body>
  <div style="position:relative;width:100%;height:100%;display:flex;align-items:center">
    <!-- text column -->
    <div style="width:660px;padding:0 0 0 64px;color:#fff">
      <div style="display:flex;align-items:center;margin-bottom:26px">
        <img src="${logo}" alt="" style="height:44px;width:auto;background:#fff;border-radius:9px;padding:5px 9px" />
        <span style="margin-left:14px;font-size:27px;font-weight:700;letter-spacing:.4px">OnlineCV</span>
      </div>
      <div style="font-size:57px;line-height:1.1;font-weight:700;letter-spacing:-.5px">${headline}</div>
      <div style="margin-top:20px;font-size:22px;line-height:1.45;color:#d6e4fb;max-width:560px">${seo.description}</div>
      <div style="margin-top:26px">
        ${chip(`${locales} dil`)}${chip(`${templates} şablon`)}${chip('ATS-uyğun')}${chip('Qeydiyyatsız')}
      </div>
      <div style="margin-top:26px;font-size:23px;font-weight:600;color:#ffffff">onlinecv.az</div>
    </div>

    <!--
      A real classic-template render, scaled and tilted so the card shows the
      PRODUCT rather than a logo. CSS transforms are fine here: this markup is only
      ever drawn by a browser, never by react-pdf, so none of the template
      CSS-subset rules apply to the card around it.
    -->
    <div style="position:absolute;right:-56px;top:64px;width:520px;height:600px">
      <div style="transform:scale(.78) rotate(-7deg);transform-origin:top left;
                  box-shadow:0 26px 70px rgba(0,0,0,.42);border-radius:4px;overflow:hidden;width:${SHEET_WIDTH}px">
        ${await sheetMarkup()}
      </div>
    </div>
  </div>
</body></html>`;

  await capture([
    {
      html,
      out: join(ROOT, 'public/og-image.jpg'),
      width: OG_WIDTH,
      height: OG_HEIGHT,
      format: 'jpeg',
      quality: 88,
    },
  ]);
}

await main();
