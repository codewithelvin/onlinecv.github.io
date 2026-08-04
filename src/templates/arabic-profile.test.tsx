/**
 * @vitest-environment node
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import * as ReactPdf from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import type { Resume } from '../types/resume';
import { buildResumeDocument, registerResumeFonts } from '../services/pdf';
import { makeDateFormatter } from '../utils/date';
import { localizeResume, referencedDictionaryGroups } from '../utils/localize-resume';
import { loadDictionaries } from '../data/dictionaries';
import { i18n } from '../app/i18n';
import { getTemplate, listTemplates } from './_core/registry';
import data from '../test/fixtures/arabic-resume.json';

/**
 * A REAL, fully-populated Arabic CV, exported through the whole pipeline the
 * Download button uses — dictionary localization included.
 *
 * The Arabic tests in `templates.pdf.test.tsx` are unit-ish: small fixtures aimed
 * at one property each. This one is the integration check, and it exists because
 * every Arabic bug in this codebase was found by a full CV and missed by a small
 * one: the export crash needed a dated entry, the run-fragmentation needed a real
 * sentence with spaces in it, and the destroyed text layer only showed up in
 * extracted prose.
 */
const arabicResume = (): Resume => structuredClone(data) as Resume;

const A4_HEIGHT = 841.89;

async function exportPdf(templateId: string, resume: Resume): Promise<string> {
  const entry = getTemplate(templateId);
  const Template = (await entry.load()).default;
  const dicts = await loadDictionaries(referencedDictionaryGroups(resume));
  const localized = localizeResume(resume, resume.locale, dicts);
  return pdf(
    buildResumeDocument(ReactPdf, Html, {
      html: renderToStaticMarkup(
        createElement(Template, {
          resume: localized,
          t: i18n.getFixedT(resume.locale),
          formatDate: makeDateFormatter(resume.locale),
        }),
      ),
      title: 'CV',
      attribution: true,
      pageMargin: entry.manifest.pageMargin,
      pageBleed: entry.manifest.pageBleed,
      locale: resume.locale,
    }),
  ).toString();
}

const pageCount = (source: string): number => (source.match(/\/Type \/Page[^s]/g) ?? []).length;

const rectangles = (source: string): number[][] =>
  [...source.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re/g)].map((m) =>
    m.slice(1).map(Number),
  );

describe('full Arabic profile', () => {
  beforeAll(() => registerResumeFonts(ReactPdf, 'public/fonts/ttf'));

  for (const { manifest } of listTemplates()) {
    it(`exports in "${manifest.id}"`, async () => {
      const source = await exportPdf(manifest.id, arabicResume());
      expect(source).toContain('%PDF-');
      expect(pageCount(source)).toBeGreaterThan(0);
      // Arabic drawn by Noto and the Latin e-mail/URLs by Inter, with nothing
      // falling through to Helvetica (which has neither script).
      expect(source).toMatch(/BaseFont \/[A-Z]{6}\+NotoSansArabic/);
      expect(source).toMatch(/BaseFont \/[A-Z]{6}\+Inter/);
      expect(source).not.toContain('Helvetica');
    }, 60_000);
  }

  /**
   * The accent column follows the sidebar across for a right-to-left CV, and
   * still runs the full height of every page.
   */
  it('mirrors the modern accent column and keeps it full height', async () => {
    const source = await exportPdf('modern', arabicResume());
    const bleed = getTemplate('modern').manifest.pageBleed;
    expect(bleed).toBeDefined();
    const width = 595.28 * 0.34;
    const columns = rectangles(source).filter(
      ([, , w, h]) => Math.abs(w - width) < 1 && Math.abs(h - A4_HEIGHT) < 1,
    );
    expect(columns).toHaveLength(pageCount(source));
    // Mirrored: on the RIGHT, so x is the page width minus the column width.
    for (const [x] of columns) {
      expect(x).toBeCloseTo(595.28 - width, 0);
    }
  }, 60_000);
});
