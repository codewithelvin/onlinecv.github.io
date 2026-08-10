/**
 * @vitest-environment node
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import * as ReactPdf from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import type { Resume, TemplateId } from '../types/resume';
import { fullResume } from '../test/fixtures/full-resume';
import { makeDateFormatter } from '../utils/date';
import { localizeResume, referencedDictionaryGroups } from '../utils/localize-resume';
import { loadDictionaries } from '../data/dictionaries';
import { ATTRIBUTION_FONT_SIZE } from '../utils/attribution';
import { buildResumeDocument, registerResumeFonts } from '../services/pdf';
import { i18n } from '../app/i18n';
import { getTemplate, listTemplates } from './_core/registry';
import { stripIconArt } from './_core/contact-icons';
import { pdfPlainText } from '../test/pdf-text';
import { styles as classicStyles } from './classic/styles';
import { styles as modernStyles } from './modern/styles';

/**
 * End-to-end render of a REAL, fully-populated CV (see the fixture) through
 * every template, in both targets.
 *
 * The other template tests use a near-empty resume: they prove the components
 * run. This one proves the OUTPUT is usable — that nothing is dropped on the way
 * to the page and that nothing is drawn outside it. A CV that renders fine with
 * two skills and falls apart with eight is the failure mode users actually hit.
 */

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
/** The modern template's sidebar is 34% of the page width. */
const SIDEBAR_WIDTH = 202.39;
const FONT_DIR = 'public/fonts/ttf';

/** Values that must survive the trip to the page, whatever the template. */
const MUST_APPEAR = [
  'Elvin',
  'Hüseynov',
  'Frontend Developer',
  'codewithelvin@gmail.com',
  'Cybernet LLC',
  'Front-End Developer',
  'Project Manager',
  'Smart Bytes',
  'Qala Express',
  'Azərbaycan Dövlət Aqrar Universiteti',
  'Azərbaycan Tibb Universiteti',
  'Bakı Avrasiya Universiteti',
  'Redux',
  'TypeScript',
  'JavaScript',
  'İngilis dili',
  'Alman dili',
  'Advanced JavaScript Concepts',
  'Udemy',
  'Kitab oxumaq',
];

async function localized(): Promise<Resume> {
  const resume = fullResume();
  const dicts = await loadDictionaries(referencedDictionaryGroups(resume));
  return localizeResume(resume, resume.locale, dicts);
}

function renderHtml(Template: React.ComponentType<never>, resume: Resume): string {
  return renderToStaticMarkup(
    createElement(Template as never, {
      resume,
      t: i18n.getFixedT(resume.locale),
      formatDate: makeDateFormatter(resume.locale),
    }),
  );
}

/**
 * THE document the app exports — `buildResumeDocument` is the same function
 * `exportResumePdf` calls, so nothing here can drift away from what users get.
 */
async function renderPdfSource(templateId: TemplateId, resume: Resume): Promise<string> {
  const entry = getTemplate(templateId);
  const Template = (await entry.load()).default;
  const document = buildResumeDocument(ReactPdf, Html, {
    html: renderHtml(Template as never, resume),
    attribution: true,
    pageMargin: entry.manifest.pageMargin,
    // Passed for the same reason as `locale`: the accent column is the
    // template's, but core paints it, so a test that omits it is testing a
    // different document from the one the Download button builds.
    pageBleed: entry.manifest.pageBleed,
  });
  return pdf(document).toString();
}

function pageCount(source: string): number {
  return (source.match(/\/Type \/Page[^s]/g) ?? []).length;
}

/**
 * Font size of every text run, page by page, in drawing order — read back from
 * the uncompressed content streams. Sizes stand in for the text itself, which
 * subsetted fonts make unreadable, and they are enough to tell a section heading
 * from body copy.
 */
function pageFontSizes(source: string): number[][] {
  return [...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map((m) => [...m[1].matchAll(/\/F\d+ ([\d.]+) Tf/g)].map((f) => Number(f[1])))
    .filter((sizes) => sizes.length > 0);
}

/** Filled rectangles, as `[x, y, width, height]`. */
function rectangles(source: string): number[][] {
  return [...source.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re/g)].map((m) =>
    m.slice(1).map(Number),
  );
}

describe('full profile', () => {
  beforeAll(() => {
    // The app's own registration — see the note in `templates.pdf.test.tsx`.
    registerResumeFonts(ReactPdf, FONT_DIR);
  });

  for (const { manifest } of listTemplates()) {
    describe(manifest.id, () => {
      it('keeps every filled-in value in the HTML preview', async () => {
        const Template = (await getTemplate(manifest.id).load()).default;
        const html = renderHtml(Template as never, await localized());
        for (const value of MUST_APPEAR) {
          expect(html, `"${value}" is missing from the ${manifest.id} preview`).toContain(value);
        }
      }, 30_000);

      /**
       * A CV this size must stay in the 1–3 page range a recruiter will read,
       * and nothing may be painted wider than the sheet. (Text runs can't be
       * bounds-checked from the stream: react-pdf positions them with `cm`
       * transforms, so every `Tm` origin reads back as 0,0.)
       */
      it('paginates sanely and paints nothing wider than the sheet', async () => {
        const source = await renderPdfSource(manifest.id, await localized());
        const pages = pageCount(source);
        expect(pages, `${manifest.id} produced ${pages} pages`).toBeGreaterThanOrEqual(1);
        expect(pages, `${manifest.id} produced ${pages} pages`).toBeLessThanOrEqual(3);

        for (const [x, , width] of rectangles(source)) {
          expect(x + width, `a filled block runs to x=${x + width}`).toBeLessThanOrEqual(
            A4_WIDTH + 1,
          );
        }
      }, 60_000);
    });
  }

  /**
   * The credit line has to be ON the paper.
   *
   * It is positioned against the page box, margin included — treating the page
   * margin as an inset and compensating for it (as the text area's own absolute
   * children must) drew it 12pt BELOW the bottom edge: present in the file,
   * invisible in every reader. The y here is react-pdf's top-down coordinate of
   * the credit's own text block.
   */
  for (const { manifest } of listTemplates()) {
    it(`keeps the credit inside the sheet in ${manifest.id}`, async () => {
      const source = await renderPdfSource(manifest.id, await localized());
      const placements = [
        ...source.matchAll(/1 0 0 1 0 ([\d.]+) cm[\s\S]{0,200}?\/F\d+ 7 Tf/g),
      ].map((m) => Number(m[1]));
      expect(placements.length, 'the credit was not drawn at all').toBeGreaterThan(0);
      for (const y of placements) {
        expect(y, `credit drawn at y=${y}, off the ${A4_HEIGHT}pt page`).toBeLessThan(A4_HEIGHT);
        expect(y, `credit drawn at y=${y}, nowhere near the foot`).toBeGreaterThan(A4_HEIGHT - 60);
      }
    }, 60_000);
  }

  /**
   * A section heading must never be the last thing on a page with its entries
   * overleaf — reported from a real export of this very profile, where page 1 of
   * the modern CV ended on "Kurslar və sertifikatlar" and the certificates
   * themselves began on page 2. `KEEP_TOGETHER` binds each heading to its first
   * block; this checks the result in the finished PDF.
   *
   * Only the two templates whose heading size is unique are checked: compact
   * draws headings and entry titles at the same 10pt, and an ENTRY title ending
   * a page is legitimate (its description continues overleaf).
   */
  const headingSizes: Array<[TemplateId, number]> = [
    ['classic', classicStyles.sectionTitle.fontSize as number],
    ['modern', modernStyles.sectionTitle.fontSize as number],
  ];

  for (const [templateId, headingSize] of headingSizes) {
    it(`never ends a page of the ${templateId} CV with a stranded heading`, async () => {
      const pages = pageFontSizes(await renderPdfSource(templateId, await localized()));
      expect(pages.length).toBeGreaterThan(1);
      pages.slice(0, -1).forEach((sizes, index) => {
        // The credit line is `fixed`, so it is drawn last on every page.
        const body = sizes.filter((size) => size !== ATTRIBUTION_FONT_SIZE);
        expect(
          body[body.length - 1],
          `page ${index + 1} ends on a ${headingSize}pt heading`,
        ).not.toBe(headingSize);
      });
    }, 60_000);
  }

  /**
   * With real content the modern CV runs to a second page — the case where the
   * accent sidebar used to stop mid-page. It must reach the bottom edge on
   * EVERY page, credit line included (the credit is absolutely positioned
   * precisely so it takes no height from the column).
   */
  it('runs the modern sidebar to the bottom of every page of a real CV', async () => {
    const source = await renderPdfSource('modern', await localized());
    const fullHeight = rectangles(source).filter(
      ([, , width, height]) =>
        Math.abs(width - SIDEBAR_WIDTH) < 1 && Math.abs(height - A4_HEIGHT) < 1,
    );
    expect(fullHeight).toHaveLength(pageCount(source));
  }, 60_000);

  /**
   * The contact channels are real PDF link ANNOTATIONS, not merely styled text.
   *
   * The markup guard in `templates.test.tsx` proves each value is wrapped in an
   * `<a href>`; it cannot prove `react-pdf-html` turned that into a `Link` and
   * that `@react-pdf` emitted a `/URI` action for it. Reading the finished file
   * is the only place that question is actually answered — and it goes through
   * `buildResumeDocument`, the function the Download button calls, for the
   * standing reason that every layout bug which shipped hid behind a test that
   * re-implemented the export.
   */
  it('emits a clickable annotation for every contact channel that has one', async () => {
    const source = await renderPdfSource('classic', await localized());
    const uris = [...source.matchAll(/\/URI \(([^)]*)\)/g)].map((m) => m[1]);

    expect(uris).toContain('mailto:codewithelvin@gmail.com');
    expect(uris).toContain('tel:+994558043484');
    expect(uris.some((u) => u.startsWith('https://www.linkedin.com/'))).toBe(true);
    // A postal address is deliberately unlinked (see `contactHref`), so nothing
    // in the file may point at one.
    expect(uris.some((u) => /Bak|Baki/.test(u))).toBe(false);
  }, 60_000);

  /**
   * The channel marks reach the exported PDF as real images — AND the text layer
   * comes out exactly as it did before they existed.
   *
   * Both halves matter, and only the finished file can answer either. A mark is
   * drawn as a react-pdf inline ATTACHMENT: a `U+FFFC` bound to an image inside
   * the text run. Two things could go wrong invisibly — `react-pdf-html` could
   * bucket the `<span>` as BLOCK content (the contact line would come apart into
   * stacked fragments), or the object-replacement character could survive into the
   * text layer and wedge a stray glyph into the middle of a phone number. The
   * second one is the serious one: this app's whole promise is that an ATS can
   * read the file, and it would hide behind a page that looks perfectly right.
   *
   * `@react-pdf/render` swaps the replacement glyph for a SPACE once the image is
   * painted, which is why the numbers below come back intact.
   */
  it('draws the contact marks as images without touching the text layer', async () => {
    const resume = await localized();
    const source = await renderPdfSource('classic', resume);
    expect(
      (source.match(/\/Subtype \/Image/g) ?? []).length,
      'no image XObject — the marks never reached the file',
    ).toBeGreaterThan(0);

    const text = pdfPlainText(source);
    for (const value of [
      'codewithelvin@gmail.com',
      '+994558043484',
      '+994124985225',
      'linkedin.com/in/elvinihuseynov',
      'github.com/codewithelvin',
    ]) {
      expect(text, `"${value}" did not survive the marks`).toContain(value);
    }
    // …and no mark left its own character behind.
    expect(text).not.toContain('￼');
  }, 60_000);

  /**
   * The base64 artwork does NOT travel into `react-pdf-html`.
   *
   * `stripIconArt` takes it out because the exporter re-resolves the same file
   * from `data-contact-icon`; leaving it in would cost an "unsupported style"
   * warning per channel plus a couple of kilobytes of css-tree parsing each.
   * Asserted against the markup the exporter is actually handed, so the strip
   * cannot quietly stop matching what `ContactIcon` writes.
   */
  it('hands react-pdf-html no icon artwork to parse', async () => {
    const Template = (await getTemplate('classic').load()).default;
    const html = renderHtml(Template as never, await localized());
    expect(html, 'the preview lost its artwork').toContain('background:url(data:image/png;base64,');
    expect(stripIconArt(html)).not.toContain('base64');
  });
});
