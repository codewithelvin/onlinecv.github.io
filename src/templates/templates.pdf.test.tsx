/**
 * @vitest-environment node
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { Document, Font, Page, pdf } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import type { Resume, TemplateId } from '../types/resume';
import { createEmptyResume } from '../utils/empty-resume';
import { makeDateFormatter } from '../utils/date';
import { i18n } from '../app/i18n';
import { getTemplate, listTemplates } from './_core/registry';

/**
 * REAL PDF render of every template (spec §7.1: "CI smoke-renders each template
 * to PDF"). The sibling `templates.test.tsx` only renders the HTML — it cannot
 * catch anything that goes wrong inside `react-pdf-html` or react-pdf's layout,
 * which is where a template actually breaks.
 *
 * Runs in the `node` environment: the browser build of `@react-pdf/renderer`
 * expects fetch/Blob plumbing that jsdom only half provides.
 */

/** A4 portrait height in points, as react-pdf lays it out. */
const A4_HEIGHT = 841.89;
/** The modern template's sidebar is 34% of the 595.28pt page width. */
const SIDEBAR_WIDTH = 202.39;
/** Relative to the project root — vitest's working directory. No node:path, so
 *  this file needs no `@types/node`. */
const FONT_DIR = 'public/fonts/ttf';

function sampleResume(): Resume {
  const r = createEmptyResume('az');
  r.basics = { firstName: 'Elvin', lastName: 'Huseynov', headline: 'Frontend Developer' };
  r.contact = { email: 'elvin@example.az', items: [] };
  r.summary = 'Experienced developer.';
  r.skills = [{ id: 's1', name: 'TypeScript', level: 90 }];
  r.languages = [{ id: 'l1', code: 'english', name: 'English', level: 'C1' }];
  return r;
}

/** Enough entries to force the CV past one page. */
function longResume(): Resume {
  const r = sampleResume();
  r.experience = Array.from({ length: 24 }, (_, i) => ({
    id: `x${i}`,
    company: `Company ${i}`,
    position: `Position ${i}`,
    startDate: '2020-01-01',
    endDate: '2021-01-01',
    current: false,
    description: 'A reasonably long description line to consume vertical space.',
    highlights: ['First achievement bullet', 'Second achievement bullet'],
  }));
  return r;
}

/**
 * The exported document, as UNCOMPRESSED PDF source — the only render mode whose
 * content stream can be read back, which is what lets the sidebar's geometry be
 * asserted rather than eyeballed.
 */
async function renderPdfSource(templateId: TemplateId, resume: Resume): Promise<string> {
  const Template = (await getTemplate(templateId).load()).default;
  const html = renderToStaticMarkup(
    createElement(Template, {
      resume,
      t: i18n.getFixedT(resume.locale),
      formatDate: makeDateFormatter(resume.locale),
    }),
  );
  const document = createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: { fontFamily: 'Inter', fontSize: 10 } },
      // Mirrors `services/pdf.ts` — including the growing wrapper the modern
      // template's full-height sidebar depends on.
      createElement(Html, { resetStyles: true, style: { flexGrow: 1 }, children: html }),
    ),
  );
  return pdf(document).toString();
}

/** Filled rectangles in the content stream, as `[x, y, width, height]`. */
function rectangles(pdfSource: string): number[][] {
  return [...pdfSource.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re/g)].map((m) =>
    m.slice(1).map(Number),
  );
}

function pageCount(pdfSource: string): number {
  return (pdfSource.match(/\/Type \/Page[^s]/g) ?? []).length;
}

describe('pdf export', () => {
  beforeAll(() => {
    // The web build fetches these over HTTP; in Node they load straight off disk.
    Font.register({
      family: 'Inter',
      fonts: [
        { src: `${FONT_DIR}/Inter-Regular.ttf`, fontWeight: 400 },
        { src: `${FONT_DIR}/Inter-Medium.ttf`, fontWeight: 500 },
        { src: `${FONT_DIR}/Inter-SemiBold.ttf`, fontWeight: 600 },
        { src: `${FONT_DIR}/Inter-Bold.ttf`, fontWeight: 700 },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
  });

  for (const { manifest } of listTemplates()) {
    it(`renders "${manifest.id}" to a real PDF`, async () => {
      const source = await renderPdfSource(manifest.id, sampleResume());
      expect(source).toContain('%PDF-');
      expect(pageCount(source)).toBe(1);
    }, 30_000);
  }

  it('runs the modern accent sidebar to the bottom edge of the page', async () => {
    const source = await renderPdfSource('modern', sampleResume());
    const sidebar = rectangles(source).find(([, , width]) => Math.abs(width - SIDEBAR_WIDTH) < 1);
    expect(sidebar).toBeDefined();
    // Without the growing `Html` wrapper this is the sidebar's CONTENT height
    // (~387pt) and the accent column stops in the middle of the page.
    expect(sidebar?.[3]).toBeCloseTo(A4_HEIGHT, 0);
  }, 30_000);

  it('keeps paginating — and keeps the sidebar — when the CV runs long', async () => {
    const source = await renderPdfSource('modern', longResume());
    const pages = pageCount(source);
    expect(pages).toBeGreaterThan(1);
    const fullHeightSidebars = rectangles(source).filter(
      ([, , width, height]) =>
        Math.abs(width - SIDEBAR_WIDTH) < 1 && Math.abs(height - A4_HEIGHT) < 1,
    );
    expect(fullHeightSidebars).toHaveLength(pages);
  }, 60_000);
});
