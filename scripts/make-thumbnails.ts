/**
 * Regenerate `src/templates/<id>/thumbnail.jpg` from the templates themselves.
 *
 *   npx vite-node scripts/make-thumbnails.ts               # every template
 *   npx vite-node scripts/make-thumbnails.ts -- banner minimal
 *
 * WHY A SCRIPT. A thumbnail is the only part of a template folder that is not
 * derived from its code, so it is the only part that can silently stop matching
 * it — a card promising a layout the template no longer has. Generating it from
 * the same component the preview and the export use means "the picture is out of
 * date" stops being something that can happen quietly.
 *
 * HOW IT MATCHES THE PREVIEW. It rebuilds `A4Frame`'s geometry exactly: the sheet
 * is 595×842 (A4 in POINTS, so 1 CSS px === 1 PDF pt, which is what makes the
 * preview break lines where the PDF does), the manifest's `pageMargin` becomes a
 * margin on the text area, `pageBleed` is painted as the sheet's first child, and
 * the font stack is ordered by the CV's language. The capture then takes the top
 * 468pt of that sheet at 1.452× to land on the 864×680 the picker's cards use.
 *
 * Run it from the repo root with the app's own `vite-node`, so the TSX templates
 * and the `import.meta.glob` registry resolve exactly as they do in the app.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { listTemplates } from '../src/templates/_core/registry';
import { LOCALES } from '../src/app/i18n/locales';
import { cvFontFamily } from '../src/templates/_core/fonts';
import { bleedSide } from '../src/templates/_core/direction';
import { makeDateFormatter } from '../src/utils/date';
import { i18n } from '../src/app/i18n';
/**
 * The repo's one fully-populated CV. Documented as test-only because no APP code
 * may import it; this is tooling, and using the same profile the layout tests use
 * means a thumbnail shows a page that is actually asserted to paginate.
 */
import { fullResume } from '../src/test/fixtures/full-resume';
import { capture, type CaptureJob } from './capture';

/** A4 portrait in points — `A4Frame`'s canvas, and react-pdf's page. */
const SHEET_WIDTH = 595;
const SHEET_HEIGHT = 842;
/** The picker's card image. Landscape: it shows the TOP of the sheet, not all of it. */
const THUMB_WIDTH = 864;
const THUMB_HEIGHT = 680;
const SCALE = THUMB_WIDTH / SHEET_WIDTH;

const ROOT = resolve(import.meta.dirname, '..');

/** Inter only: the sample CV is Azerbaijani, which Inter covers completely. */
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

function sheetHtml(templateId: string, body: string): string {
  const entry = listTemplates().find((x) => x.manifest.id === templateId);
  if (!entry) throw new Error(`No such template: ${templateId}`);
  const { manifest } = entry;
  const { locale } = fullResume();
  const bleed = manifest.pageBleed;
  const bleedLayer = bleed
    ? `<div style="position:absolute;top:0;bottom:0;${bleedSide(bleed, locale)}:0;width:${
        typeof bleed.width === 'number' ? `${bleed.width}px` : bleed.width
      };background:${bleed.color}"></div>`
    : '';
  const rtl = LOCALES[locale].dir === 'rtl';

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${fontFaces()}
html,body{margin:0;padding:0;background:#fff}
*{box-sizing:border-box}
</style></head>
<body>
<div style="width:${SHEET_WIDTH}px;min-height:${SHEET_HEIGHT}px;position:relative;background:#fff;display:flex;flex-direction:column">
${bleedLayer}
<div style="position:relative;flex:1 1 auto;display:flex;flex-direction:column;margin-top:${
    manifest.pageMargin?.top ?? 0
  }px;margin-bottom:${manifest.pageMargin?.bottom ?? 0}px;font-family:${cvFontFamily(locale)}${
    rtl ? ';text-align:right' : ''
  }">
${body}
</div>
</div>
</body></html>`;
}

async function main(): Promise<void> {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const templates = listTemplates().filter(
    (x) => wanted.length === 0 || wanted.includes(x.manifest.id),
  );
  if (templates.length === 0) throw new Error(`No such template(s): ${wanted.join(', ')}`);

  const resume = fullResume();
  const t = i18n.getFixedT(resume.locale);
  const formatDate = makeDateFormatter(resume.locale);

  const jobs: CaptureJob[] = [];
  for (const entry of templates) {
    const Template = (await entry.load()).default;
    const body = renderToStaticMarkup(createElement(Template, { resume, t, formatDate }));
    jobs.push({
      html: sheetHtml(entry.manifest.id, body),
      out: join(ROOT, 'src/templates', entry.manifest.id, 'thumbnail.jpg'),
      width: SHEET_WIDTH,
      height: Math.round(THUMB_HEIGHT / SCALE),
      scale: SCALE,
      format: 'jpeg',
      quality: 90,
    });
  }

  await capture(jobs);
}

await main();
