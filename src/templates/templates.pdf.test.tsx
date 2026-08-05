/**
 * @vitest-environment node
 */
import { Children, createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import * as ReactPdf from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import type { Resume, TemplateId } from '../types/resume';
import { createEmptyResume } from '../utils/empty-resume';
import { buildResumeDocument, registerResumeFonts } from '../services/pdf';
import { makeDateFormatter } from '../utils/date';
import { i18n } from '../app/i18n';
import { getTemplate, listTemplates } from './_core/registry';
import { cvFontStack } from './_core/fonts';

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
/** A4 portrait width in points. */
const A4_WIDTH = 595.28;
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

/**
 * A CV written in Georgian — a script Inter has no glyphs for at all, so this is
 * what proves the font stack rather than a single font is reaching the PDF.
 */
function georgianResume(): Resume {
  const r = createEmptyResume('ka');
  r.basics = {
    firstName: 'ნიკოლოზ',
    lastName: 'ბარათაშვილი',
    headline: 'ფრონტენდ დეველოპერი',
  };
  r.contact = { email: 'nikoloz@example.ge', items: [] };
  r.summary = 'გამოცდილი დეველოპერი, რომელიც მუშაობს ვებტექნოლოგიებზე.';
  r.skills = [{ id: 's1', name: 'TypeScript', level: 90 }];
  return r;
}

/**
 * A Korean CV. Hangul is the one script whose face is measured in MEGABYTES
 * (`NanumGothic`, 2 MB per weight against Hebrew's 27 KB), which is why
 * `vite.config.ts` keeps it out of the service worker's precache — so the
 * assertion that it really is the font doing the drawing matters more here than
 * elsewhere: a silent Helvetica fallback would be a page of blank boxes.
 *
 * Latin is mixed in on purpose. A Korean CV names its tools in Latin, and a
 * Korean-led font stack has to keep serving both from one line.
 */
function koreanResume(): Resume {
  const r = createEmptyResume('ko');
  r.basics = { firstName: '민준', lastName: '김', headline: '프런트엔드 개발자' };
  r.contact = { email: 'minjun@example.kr', items: [] };
  r.summary = '웹 기술을 다루는 소프트웨어 개발자입니다.';
  r.skills = [{ id: 's1', name: 'TypeScript', level: 90 }];
  return r;
}

/**
 * A Chinese CV. `NotoSansSC` is the first CFF/OTF face this app registers — Noto
 * CJK publishes no static TTF at all — so this fixture is what proves the engine
 * SUBSETS a CFF. That had to be established before the locale could ship: the two
 * registered weights are 16.1 MB, and a face this exporter failed to subset would
 * leave all of it inside every résumé the user attaches to an application.
 *
 * Latin is mixed in for the Korean fixture's reason: a Chinese CV names its tools in
 * Latin, and NotoSansSC carries Latin, so a Chinese-led stack serves both.
 */
function chineseResume(): Resume {
  const r = createEmptyResume('zh');
  r.basics = { firstName: '明', lastName: '李', headline: '前端开发工程师' };
  r.contact = { email: 'liming@example.cn', items: [] };
  r.summary = '拥有多年经验的软件开发工程师，熟悉现代前端技术栈。';
  r.skills = [{ id: 's1', name: 'TypeScript', level: 90 }];
  return r;
}

/**
 * A Chinese CV carrying an Azerbaijani employer name — the ONE gap in NotoSansSC's
 * Latin coverage, and the app's home market at that. The face has ASCII, Latin-1 and
 * Cyrillic but not `ə ğ ı İ ş`, so those five letters must reach Inter by per-glyph
 * fallback while everything around them stays in the Chinese face.
 */
function chineseWithAzerbaijaniResume(): Resume {
  const r = chineseResume();
  r.experience = [
    {
      id: 'x1',
      company: 'Azərbaycan Şəkər İstehsalı',
      position: '前端开发工程师',
      startDate: '2022-01-01',
      current: true,
      highlights: [],
    },
  ];
  return r;
}

/**
 * A CV in a CV language the app DOES export, but carrying Arabic text — an
 * Arabic name, employer and summary. This is not a hypothetical: every one of
 * those fields is free text, so Arabic reaches the exporter regardless of
 * `Resume.locale` (which cannot be `ar` — see `LocaleMeta.cv`).
 */
function arabicTextResume(): Resume {
  const r = createEmptyResume('en');
  r.basics = { firstName: 'محمد', lastName: 'العلي', headline: 'مطور واجهات أمامية' };
  r.contact = { email: 'mohammed@example.com', items: [] };
  r.summary = 'مطور برمجيات يعمل على تقنيات الويب.';
  r.skills = [{ id: 's1', name: 'TypeScript', level: 90 }];
  return r;
}

/**
 * A CV whose LANGUAGE is Arabic — `locale: 'ar'` — not merely one with some
 * Arabic in a free-text field. That distinction is what these guard: the font
 * order and the text direction are both chosen from `resume.locale`.
 *
 * Deliberately WITHOUT dated entries. A line that mixes Arabic with a date is
 * the trigger for the engine crash pinned down in
 * "still crashes the engine on mixed Arabic lines", and this fixture exists to
 * measure fonts and geometry rather than to die before reaching them.
 */
function arabicResume(): Resume {
  const r = createEmptyResume('ar');
  r.basics = {
    firstName: 'مرحبا',
    lastName: 'باكو',
    headline: 'مطور واجهات أمامية في باكو',
    location: 'باكو',
  };
  r.contact = { email: 'mohammed@example.az', items: [] };
  r.summary = 'خبرة ١٥ سنة في تطوير الويب';
  r.skills = [
    { id: 's1', name: 'السيرة الذاتية', level: 90 },
    { id: 's2', name: 'مطور واجهات أمامية في باكو', level: 80 },
  ];
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
    // Passed for the same reason as `locale`: the accent column is the
    // template's, but core paints it, so a test that omits it is testing a
    // different document from the one the Download button builds.
    pageBleed: entry.manifest.pageBleed,
    // The CV language, exactly as `exportResumePdf` passes it: it selects the
    // font ORDER and the text direction. Leaving it out would put these tests
    // back on a different document from the one the app ships.
    locale: resume.locale,
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
  /** The PDF font resource the run is drawn with, e.g. `F7`. */
  font: string;
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
  let font = '';

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
    const tf = line.match(/^\/(F\d+) ([\d.]+) Tf$/);
    if (tf) {
      font = tf[1];
      size = Number(tf[2]);
    }
    if (line.endsWith('TJ')) {
      const placed = concat(textMatrix, ctm);
      const glyphs = (line.match(/<[0-9a-f]+>/g) ?? []).reduce(
        (total, hex) => total + (hex.length - 2) / 4,
        0,
      );
      draws.push({ x: placed[4], y: placed[5], size, glyphs, font });
    }
  }
  return draws;
}

describe('pdf export', () => {
  beforeAll(() => {
    /**
     * The app's OWN registration, not a copy of it. A second declaration here
     * drifts from the shipped one — which is exactly how the font stack could
     * gain a family (Georgian) that the export needs and these tests never load.
     * Only the directory differs: the web build fetches over HTTP, Node reads
     * straight off disk.
     */
    registerResumeFonts(ReactPdf, FONT_DIR);
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
  it("puts each template's vertical margin on the page itself", () => {
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

  /**
   * The Georgian half of the font stack (`templates/_core/fonts`). Inter carries
   * no Georgian glyph, and neither does react-pdf's Helvetica fallback, so
   * without the second family a Georgian CV exports as a page of blanks — the
   * text is in the file but nothing is drawn.
   *
   * Embedding is the evidence: a family only reaches the PDF's font resources if
   * `fontSubstitution` actually picked it for some code point. Both families must
   * be there — Georgian for the headings and the name, Inter for the Latin
   * e-mail and skill next to them.
   */
  for (const { manifest } of listTemplates()) {
    it(`embeds both fonts for a Georgian CV in "${manifest.id}"`, async () => {
      const source = await renderPdfSource(manifest.id, georgianResume());
      expect(source, 'the Georgian font was never used').toMatch(
        /BaseFont \/[A-Z]{6}\+NotoSansGeorgian/,
      );
      expect(source, 'Latin text stopped using Inter').toMatch(/BaseFont \/[A-Z]{6}\+Inter/);
      // react-pdf falls back to Helvetica per glyph when nothing in the stack has
      // one, and Helvetica has no Georgian either — so its presence means loss.
      expect(source, 'fell back to Helvetica').not.toContain('Helvetica');
    }, 30_000);
  }

  /**
   * The Arabic half of the same stack. Arabic is not a CV language yet, but it
   * is free-text input everywhere, so a name or an employer in Arabic has to
   * come out of the exporter as letters rather than as blanks.
   */
  for (const { manifest } of listTemplates()) {
    it(`embeds the Arabic font for Arabic text in "${manifest.id}"`, async () => {
      const source = await renderPdfSource(manifest.id, arabicTextResume());
      expect(source, 'the Arabic font was never used').toMatch(
        /BaseFont \/[A-Z]{6}\+NotoSansArabic/,
      );
      expect(source, 'Latin text stopped using Inter').toMatch(/BaseFont \/[A-Z]{6}\+Inter/);
      expect(source, 'fell back to Helvetica').not.toContain('Helvetica');
    }, 30_000);
  }

  /**
   * The Korean half of the stack, which does NOT behave like the Georgian and Arabic
   * halves above — and that is why it is asserted separately.
   *
   * ⚠️ A KOREAN CV CONTAINS NO INTER AT ALL, deliberately. `cvFontStack` puts the
   * document's own script first, and unlike the three Noto faces (script-only builds
   * with no Latin in them) a Korean text face ships Latin too, because Korean is
   * written with Latin mixed in. So NanumGothic answers for the e-mail address and
   * for "TypeScript" as well as for the Hangul, and Inter is never consulted.
   *
   * That is the better trade, and it was measured rather than assumed: Nanum's
   * shared characters land within 5% of Inter's (space 0.280 vs 0.281 em), and a
   * Korean line that takes its spaces from its own font stays ONE run instead of
   * alternating between two — the fault that once drew Arabic runs on top of each
   * other. Asserting Inter's ABSENCE pins that, so reordering the stack fails here
   * rather than silently changing every Latin word in every Korean CV.
   *
   * The other thing pinned: the face must be SUBSETTED. `@react-pdf` only subsets a
   * font it can read `glyf`/`loca` from, which is why `registerResumeFonts` points
   * at the TTF rather than at the six-times-smaller woff2 the preview uses — with
   * the woff2 a one-page Korean CV measured 1.7 MB instead of 25 KB. The `ABCDEF+`
   * prefix on a `BaseFont` name IS the subset marker, so matching it asserts a few
   * dozen embedded glyphs rather than all 12,887.
   */
  for (const { manifest } of listTemplates()) {
    it(`embeds a subset of the Korean font in "${manifest.id}"`, async () => {
      const source = await renderPdfSource(manifest.id, koreanResume());
      expect(source, 'the Korean font was never used').toMatch(/BaseFont \/[A-Z]{6}\+NanumGothic/);
      expect(source, 'fell back to Helvetica').not.toContain('Helvetica');
      expect(source, 'the Korean face stopped serving the Latin text too').not.toMatch(
        /BaseFont \/[A-Z]{6}\+Inter/,
      );
    }, 30_000);
  }

  /**
   * Chinese, and what is pinned here is the OUTLINE FORMAT, which no other locale
   * exercises.
   *
   * ⚠️ `NotoSansSC` is a CFF/OTF, not a TTF — Noto CJK publishes no static TrueType
   * build, only this and a variable font fontkit cannot use, so there was no
   * alternative to fall back on. A CFF takes a different path through
   * `@react-pdf/pdfkit` (`FontFile3` / `CIDFontType0C`, not `FontFile2`), and the
   * Korean woff2 is this project's standing proof that the engine will silently embed
   * a WHOLE face when it cannot read the outline tables it wants: 25 KB became
   * 1.7 MB. Two Chinese weights are 16.1 MB, so the same failure here would be far
   * worse — and invisible, because the PDF still looks right.
   *
   * The `ABCDEF+` prefix on the `BaseFont` name IS the subset marker, so matching it
   * asserts a few dozen embedded glyphs rather than all 31,036. Measured at the time
   * of writing: 94.5 KB for a one-page Chinese CV.
   *
   * Inter's absence is asserted for the same reason as Korean's — the CV's own face
   * leads the stack and carries Latin, so it answers for the e-mail address and for
   * "TypeScript" too, and a reordering of the stack should fail loudly here.
   */
  for (const { manifest } of listTemplates()) {
    it(`embeds a CFF subset of the Chinese font in "${manifest.id}"`, async () => {
      const source = await renderPdfSource(manifest.id, chineseResume());
      expect(source, 'the Chinese font was never used').toMatch(/BaseFont \/[A-Z]{6}\+NotoSansSC/);
      expect(source, 'fell back to Helvetica').not.toContain('Helvetica');
      expect(source, 'the Chinese face stopped serving the Latin text too').not.toMatch(
        /BaseFont \/[A-Z]{6}\+Inter/,
      );
      // The CFF embedding path, which is what distinguishes this face from every
      // other one registered: a TrueType outline would be `FontFile2`/`TrueType`.
      expect(source, 'the CFF was not embedded as one').toContain('/FontFile3');
      expect(source).toContain('/CIDFontType0C');
    }, 30_000);
  }

  /**
   * The one place NotoSansSC's Latin coverage runs out, and it is this app's own
   * market: `ə ğ ı İ ş` are absent from it. So an Azerbaijani employer name inside a
   * Chinese CV is the case where BOTH faces have to appear — which is per-glyph
   * fallback working, not a defect, and worth pinning so a stack change cannot turn
   * those five letters into blanks.
   */
  for (const { manifest } of listTemplates()) {
    it(`falls back to Inter for Azerbaijani letters in a Chinese CV in "${manifest.id}"`, async () => {
      const source = await renderPdfSource(manifest.id, chineseWithAzerbaijaniResume());
      expect(source, 'the Chinese font was never used').toMatch(/BaseFont \/[A-Z]{6}\+NotoSansSC/);
      expect(source, 'ə ğ ı İ ş never reached Inter').toMatch(/BaseFont \/[A-Z]{6}\+Inter/);
      expect(source, 'fell back to Helvetica').not.toContain('Helvetica');
    }, 30_000);
  }

  /**
   * Arabic comes out JOINED, and it is `buildResumeDocument` that has to do it
   * (`utils/arabic`) — react-pdf shapes a right-to-left line only after it has
   * reordered it, so unshaped Arabic exports with the wrong contextual form on
   * nearly every letter.
   *
   * `لا` is the sharpest probe: lam + alef is a MANDATORY ligature, one glyph in
   * any correct Arabic rendering and two without shaping. Asserting it through
   * the real document builder is what keeps the pre-shaping wired in — a test
   * that rebuilt its own document could not catch its removal.
   */
  it('joins Arabic on the way into the PDF', async () => {
    const html = `<div style="font-family: NotoSansArabic; font-size: 12pt">لا</div>`;
    const source = await pdf(
      buildResumeDocument(ReactPdf, Html, { html, attribution: false }),
    ).toString();
    const glyphs = textDraws(source).reduce((total, draw) => total + draw.glyphs, 0);
    expect(glyphs, 'lam-alef was drawn as two letters — the text was not shaped').toBe(1);
  }, 30_000);

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
    const sidebar = rectangles(withCredit).find(
      ([, , width]) => Math.abs(width - SIDEBAR_WIDTH) < 1,
    );
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

  /**
   * THE RUN-FRAGMENTATION REGRESSION.
   *
   * All three registered faces contain the characters scripts SHARE — the space
   * above all, plus digits and punctuation — so whichever family is named first
   * wins them. Inter used to be pinned first for every CV, which meant every
   * space inside a non-Latin line resolved to Inter; `fontSubstitution` splits a
   * line at each change of font, so a measured line came out as ELEVEN runs
   * across two fonts instead of five in one, and the runs either side of a space
   * were emitted at the same x. That is what "the characters overlap and are
   * shifted on top of each other" was.
   *
   * Measured on GEORGIAN rather than Arabic, deliberately. The mechanism is the
   * shared space, so it is identical in either script — and an Arabic CV cannot
   * be rendered by this engine at all (see "still crashes the engine on mixed
   * Arabic lines"), so Georgian is the only place the fix is observable
   * end-to-end. The Arabic side is covered by the two document-level tests below.
   */
  for (const { manifest } of listTemplates()) {
    it(`draws a Georgian line in one font in "${manifest.id}"`, async () => {
      const source = await renderPdfSource(manifest.id, georgianResume());
      const byLine = new Map<string, TextDraw[]>();
      for (const draw of textDraws(source)) {
        const key = draw.y.toFixed(1);
        byLine.set(key, [...(byLine.get(key) ?? []), draw]);
      }
      // The summary is the line worth checking: a short label may legitimately
      // be a single run either way.
      const busy = [...byLine.values()].filter((line) => line.length >= 3);
      expect(busy.length, 'no multi-run lines found — fixture too small?').toBeGreaterThan(0);
      for (const line of busy) {
        const fonts = new Set(line.map((d) => d.font));
        expect(
          fonts.size,
          `a line at y=${line[0].y.toFixed(1)} is split across fonts ${[...fonts].join(', ')} — ` +
            "the CV language's own font is not first in the stack",
        ).toBeLessThanOrEqual(2);
      }
    }, 30_000);
  }

  /**
   * Right-to-left CVs are right-aligned, and `textAlign` is the way to do it:
   * react-pdf inherits it (`BASE_INHERITABLE_PROPERTIES`) so it reaches every
   * heading and paragraph from the page, and no shipped template pins
   * `textAlign: 'left'` to override it. `direction` is NOT inheritable in
   * react-pdf, so setting that on the page would reach nothing.
   */
  it('right-aligns a right-to-left CV and leaves the others alone', () => {
    const page = (locale: Resume['locale']): Record<string, unknown> => {
      const document = buildResumeDocument(ReactPdf, Html, {
        html: '<div>x</div>',
        attribution: false,
        locale,
      });
      const pageElement = Children.toArray(
        (document as ReactElement<{ children: ReactNode }>).props.children,
      )[0] as ReactElement<{ style: Record<string, unknown> }>;
      return pageElement.props.style;
    };
    expect(page('ar').textAlign).toBe('right');
    for (const locale of ['az', 'en', 'ru', 'ka'] as const) {
      expect(page(locale).textAlign, locale).toBeUndefined();
    }
  });

  /**
   * The font stack must arrive at the page ORDERED BY THE CV LANGUAGE, and as an
   * array — `@react-pdf` reads a comma string as one family name and would look
   * for a font literally called "NotoSansArabic, Inter, …".
   */
  it("hands the page the CV language's font stack as an array", () => {
    const stackFor = (locale: Resume['locale']): unknown => {
      const document = buildResumeDocument(ReactPdf, Html, {
        html: '<div>x</div>',
        attribution: false,
        locale,
      });
      const pageElement = Children.toArray(
        (document as ReactElement<{ children: ReactNode }>).props.children,
      )[0] as ReactElement<{ style: Record<string, unknown> }>;
      return pageElement.props.style.fontFamily;
    };
    expect(stackFor('ar')).toEqual(cvFontStack('ar'));
    expect(Array.isArray(stackFor('ar'))).toBe(true);
    expect((stackFor('ar') as string[])[0]).toBe('NotoSansArabic');
    expect((stackFor('az') as string[])[0]).toBe('Inter');
  });

  /**
   * And no template may take the font back. `fontFamily` is inheritable, so a
   * template that pins its own on the root wins over the page and reintroduces
   * the fragmentation for every language whose script is not Inter's.
   */
  it('has no template pinning its own font family', async () => {
    for (const { manifest, load } of listTemplates()) {
      const module = (await load()) as { styles?: Record<string, Record<string, unknown>> };
      const styles = module.styles;
      if (!styles) continue;
      for (const [name, rule] of Object.entries(styles)) {
        expect(
          rule.fontFamily,
          `"${manifest.id}" pins fontFamily on styles.${name} — core owns the stack ` +
            '(see cvFontStack), because its ORDER depends on the CV language',
        ).toBeUndefined();
      }
    }
  }, 30_000);

  /**
   * ARABIC EXPORTS AT ALL — the regression this replaced was a hard failure.
   *
   * A line mixing Arabic with left-to-right content (a date, an e-mail, a URL)
   * used to throw `Cannot read properties of undefined (reading 'id')` out of
   * `@react-pdf/textkit`'s `reorderLine`, and every real Arabic CV has such a
   * line: an experience entry puts the job title and its date range on one row.
   * The user got no PDF and a generic error message.
   *
   * The cause is upstream and is fixed by `patches/@react-pdf+textkit+4.4.1.patch`
   * — `reorderLine` resolves a glyph per CHARACTER through `glyphIndices`, which
   * disagrees with the glyph count whenever shaping is not one-to-one (Arabic
   * ligatures merge letters, mark decomposition splits them), and it read `.id`
   * off the resulting `undefined`. The patch skips such a character instead.
   *
   * These tests are therefore also the guard on that patch: delete it, or let
   * `npm ci` skip `postinstall`, and they fail here rather than in front of a user.
   */
  for (const { manifest } of listTemplates()) {
    it(`exports a dated Arabic CV in "${manifest.id}"`, async () => {
      const resume = arabicResume();
      resume.experience = [
        {
          id: 'x1',
          company: 'شركة سايبرنت',
          position: 'مطور واجهات أمامية',
          startDate: '2022-01-01',
          current: true,
          description: 'قيادة تطوير نظام الضرائب الحكومي.',
        },
      ];
      resume.education = [
        {
          id: 'e1',
          type: 'university',
          institution: 'جامعة باكو الحكومية',
          faculty: 'كلية الرياضيات التطبيقية',
          specialization: 'علوم الحاسوب',
          degree: 'magister',
          startDate: '2009-09-01',
          endDate: '2011-06-30',
          current: false,
        },
      ];
      const source = await renderPdfSource(manifest.id, resume);
      expect(source).toContain('%PDF-');
      // Both faces embedded: Arabic from Noto, the Latin e-mail from Inter. A
      // Helvetica fallback would mean glyphs the exporter could not draw.
      expect(source).toMatch(/BaseFont \/[A-Z]{6}\+NotoSansArabic/);
      expect(source).not.toContain('Helvetica');
    }, 30_000);
  }

  /**
   * And the glyphs land somewhere sensible rather than on top of each other.
   *
   * Zero-advance non-joiners legitimately share an x with the run after them
   * (`utils/arabic` inserts one at each `ال`), so a single-glyph run is not a
   * collision — anything wider is.
   */
  it('paints no Arabic run on top of another', async () => {
    const resume = arabicResume();
    resume.experience = [
      {
        id: 'x1',
        company: 'شركة سايبرنت',
        position: 'مطور واجهات أمامية',
        startDate: '2022-01-01',
        current: true,
      },
    ];
    const visible = textDraws(await renderPdfSource('classic', resume)).filter((d) => d.glyphs > 1);
    expect(visible.length).toBeGreaterThan(0);
    for (const [i, draw] of visible.entries()) {
      const collision = visible
        .slice(i + 1)
        .find((o) => Math.abs(o.x - draw.x) < 0.5 && Math.abs(o.y - draw.y) < 0.5);
      expect(
        collision,
        `two runs of ${draw.glyphs} and ${collision?.glyphs} glyphs are painted at ` +
          `(${draw.x.toFixed(1)}, ${draw.y.toFixed(1)})`,
      ).toBeUndefined();
    }
  }, 30_000);

  /**
   * ⚠️ NOTHING MAY BE PAINTED OVER THE ACCENT COLUMN.
   *
   * The column is core's, drawn as the page's FIRST child so everything else
   * lands on top of it — which is exactly what makes it vulnerable: react-pdf
   * paints in document order, so any later opaque box covering the same area
   * hides it. The modern template used to set `backgroundColor: '#ffffff'` on its
   * root, which covered the whole content area and left the column visible only
   * in the 28pt page margins above and below. Because the sidebar's own text is
   * white, the sidebar then read as a blank white block — reported as "the
   * sidebar is half white and half blue".
   *
   * Geometry alone could not catch it: the column's rectangle was present and
   * the full height of the page, and the earlier test asserting exactly that
   * passed while the CV looked broken. So this asserts the PAINT ORDER instead —
   * no filled rectangle after the column may overlap it.
   */
  it("paints nothing opaque over a template's accent column", async () => {
    for (const { manifest } of listTemplates()) {
      const bleed = manifest.pageBleed;
      if (!bleed) continue;
      const source = await renderPdfSource(manifest.id, sampleResume());
      const rects = rectangles(source);
      const columnWidth = A4_WIDTH * 0.34;
      const index = rects.findIndex(
        ([, , w, h]) => Math.abs(w - columnWidth) < 1 && h > A4_HEIGHT - 1,
      );
      expect(index, `"${manifest.id}" never painted its accent column`).toBeGreaterThanOrEqual(0);
      const [cx, , cw] = rects[index];

      for (const [x, , w, h] of rects.slice(index + 1)) {
        const overlaps = x < cx + cw && x + w > cx;
        // A box the size of the whole content area is the giveaway; a small one
        // (the avatar) legitimately sits on top of the column.
        const coversMostOfIt = overlaps && w > cw && h > A4_HEIGHT / 2;
        expect(
          coversMostOfIt,
          `"${manifest.id}" paints a ${w.toFixed(0)}x${h.toFixed(0)} box over its accent column — ` +
            'an opaque template background hides it (see modern/styles.ts)',
        ).toBe(false);
      }
    }
  }, 60_000);
});
