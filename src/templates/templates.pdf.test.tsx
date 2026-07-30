/**
 * @vitest-environment node
 */
import { Children, createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import * as ReactPdf from '@react-pdf/renderer';
import { Font, pdf } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import type { Resume, TemplateId } from '../types/resume';
import { createEmptyResume } from '../utils/empty-resume';
import { buildResumeDocument } from '../services/pdf';
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

/** One entry carrying achievement bullets — the only thing that draws markers. */
function bulletedResume(): Resume {
  const r = sampleResume();
  r.experience = [
    {
      id: 'x1',
      company: 'Cybernet',
      position: 'Lead Frontend Developer',
      startDate: '2022-01-10',
      current: true,
      description: 'Team lead.',
      highlights: ['Built the design system', 'Cut the bundle in half'],
    },
  ];
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
 * asserted rather than eyeballed. Built by `buildResumeDocument`, the same
 * function the Download button uses, so this cannot test a lookalike.
 */
async function renderPdfSource(
  templateId: TemplateId,
  resume: Resume,
  attribution = false,
): Promise<string> {
  const entry = getTemplate(templateId);
  const Template = (await entry.load()).default;
  const document = buildResumeDocument(ReactPdf, Html, {
    html: renderToStaticMarkup(
      createElement(Template, {
        resume,
        t: i18n.getFixedT(resume.locale),
        formatDate: makeDateFormatter(resume.locale),
      }),
    ),
    attribution,
    pageMargin: entry.manifest.pageMargin,
  });
  return pdf(document).toString();
}

/**
 * Filled rectangles in the content stream, as `[x, y, width, height]`.
 * Coordinates can be NEGATIVE — the accent column starts above the page margin
 * to bleed off the top edge — so the sign is part of the pattern.
 */
function rectangles(pdfSource: string): number[][] {
  return [...pdfSource.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re/g)].map((m) =>
    m.slice(1).map(Number),
  );
}

function pageCount(pdfSource: string): number {
  return (pdfSource.match(/\/Type \/Page[^s]/g) ?? []).length;
}

/** A 2D affine matrix as PDF writes it: `a b c d e f`. */
type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const SIX_NUMBERS = String.raw`(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)`;

function concat(inner: Matrix, outer: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = inner;
  const [a2, b2, c2, d2, e2, f2] = outer;
  return [
    a1 * a2 + b1 * c2,
    a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2,
    c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2,
    e1 * b2 + f1 * d2 + f2,
  ];
}

interface TextDraw {
  x: number;
  y: number;
  size: number;
  /** How many glyphs the run paints — a lone marker draws exactly one. */
  glyphs: number;
}

/**
 * Every text-painting operation in the content stream, at its ABSOLUTE position
 * on the page.
 *
 * react-pdf nests its boxes as `q … cm … Q`, so a run's real coordinates only
 * exist as the product of the whole enclosing chain; replaying the graphics
 * stack here is what turns the stream into something that can be asserted on.
 */
function textDraws(pdfSource: string): TextDraw[] {
  const draws: TextDraw[] = [];
  const stack: Matrix[] = [];
  let ctm: Matrix = IDENTITY;
  let textMatrix: Matrix = IDENTITY;
  let size = 0;

  for (const raw of pdfSource.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === 'q') {
      stack.push(ctm);
      continue;
    }
    if (line === 'Q') {
      ctm = stack.pop() ?? IDENTITY;
      continue;
    }
    const cm = line.match(new RegExp(`^${SIX_NUMBERS} cm$`));
    if (cm) ctm = concat(cm.slice(1).map(Number) as Matrix, ctm);
    const tm = line.match(new RegExp(`^${SIX_NUMBERS} Tm$`));
    if (tm) textMatrix = tm.slice(1).map(Number) as Matrix;
    const tf = line.match(/^\/F\d+ ([\d.]+) Tf$/);
    if (tf) size = Number(tf[1]);
    if (line.endsWith('TJ')) {
      const placed = concat(textMatrix, ctm);
      const glyphs = (line.match(/<[0-9a-f]+>/g) ?? []).reduce(
        (total, hex) => total + (hex.length - 2) / 4,
        0,
      );
      draws.push({ x: placed[4], y: placed[5], size, glyphs });
    }
  }
  return draws;
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

  /**
   * The margin has to be on the PAGE. A template that pads its own root instead
   * indents page 1 and leaves every later page's content hard against the paper
   * edge — reported from a real two-page export.
   */
  it('puts each template\'s vertical margin on the page itself', () => {
    for (const { manifest } of listTemplates()) {
      expect(manifest.pageMargin, `${manifest.id} declares no page margin`).toBeDefined();
      const document = buildResumeDocument(ReactPdf, Html, {
        html: '<div>x</div>',
        attribution: false,
        pageMargin: manifest.pageMargin,
      });
      const [page] = Children.toArray(document.props.children) as ReactElement<{
        style: { paddingTop: number; paddingBottom: number };
      }>[];
      expect(page.props.style.paddingTop).toBe(manifest.pageMargin?.top);
      expect(page.props.style.paddingBottom).toBe(manifest.pageMargin?.bottom);
    }
  });

  it('runs the modern accent sidebar to the bottom edge of the page', async () => {
    const source = await renderPdfSource('modern', sampleResume());
    const sidebar = rectangles(source).find(([, , width]) => Math.abs(width - SIDEBAR_WIDTH) < 1);
    expect(sidebar).toBeDefined();
    // Without the growing `Html` wrapper this is the sidebar's CONTENT height
    // (~387pt) and the accent column stops in the middle of the page.
    expect(sidebar?.[3]).toBeCloseTo(A4_HEIGHT, 0);
  }, 30_000);

  /**
   * The credit line is `position: absolute` + `fixed` for a reason: an in-flow
   * footer would take height away from the growing `Html` wrapper, and the
   * modern template's accent sidebar would stop short of the bottom edge again
   * (the bug fixed on 2026-07-29). Out of flow, the sidebar must be untouched —
   * while the footer still adds drawing operations to the page.
   */
  it('draws the site credit without shrinking the full-height sidebar', async () => {
    const [without, withCredit] = await Promise.all([
      renderPdfSource('modern', sampleResume()),
      renderPdfSource('modern', sampleResume(), true),
    ]);
    const sidebar = rectangles(withCredit).find(([, , width]) => Math.abs(width - SIDEBAR_WIDTH) < 1);
    expect(sidebar?.[3]).toBeCloseTo(A4_HEIGHT, 0);
    expect(pageCount(withCredit)).toBe(pageCount(without));
    // The footer is real content, not a no-op element.
    expect(withCredit.length).toBeGreaterThan(without.length);
  }, 60_000);

  /**
   * Achievement bullets: the marker sits BESIDE its text, never on top of it.
   *
   * The reported bug — "list points and text print one on another" — came from
   * `<ul>`/`<li>`: with `resetStyles` on, react-pdf-html hides the marker box
   * with `display: none`, Yoga collapses it to zero size at the row's origin,
   * and react-pdf's paint pass draws the "•" there anyway, i.e. underneath the
   * first characters. Measured then: marker and text both at x=56.0, y=630.3.
   * `templates/_core/bullets` replaces the list with two explicit boxes; this
   * asserts the geometry that guarantees, per template.
   */
  for (const { manifest } of listTemplates()) {
    it(`separates bullet markers from their text in "${manifest.id}"`, async () => {
      const source = await renderPdfSource(manifest.id, bulletedResume());
      const draws = textDraws(source);

      const markers = draws.filter((d) => d.glyphs === 1);
      expect(markers.length, 'no bullet marker painted at all').toBeGreaterThanOrEqual(2);

      for (const marker of markers) {
        const collision = draws.find(
          (d) => d !== marker && Math.abs(d.x - marker.x) < 0.5 && Math.abs(d.y - marker.y) < 0.5,
        );
        expect(
          collision,
          `a ${collision?.glyphs}-glyph run is painted on top of the marker at ` +
            `(${marker.x.toFixed(1)}, ${marker.y.toFixed(1)})`,
        ).toBeUndefined();
      }

      // And the text really does start to the right of its marker, on the same line.
      for (const marker of markers) {
        const text = draws.find((d) => Math.abs(d.y - marker.y) < 0.5 && d.x > marker.x);
        expect(text, 'a marker with no text beside it').toBeDefined();
      }
    }, 30_000);
  }

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
