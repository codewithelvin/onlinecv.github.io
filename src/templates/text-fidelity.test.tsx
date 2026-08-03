/**
 * @vitest-environment node
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import * as ReactPdf from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import type { Locale, Resume } from '../types/resume';
import { createEmptyResume } from '../utils/empty-resume';
import { buildResumeDocument, registerResumeFonts } from '../services/pdf';
import { makeDateFormatter } from '../utils/date';
import { i18n } from '../app/i18n';
import { getTemplate, listTemplates } from './_core/registry';
import { missingWords, pdfTextRuns } from '../test/pdf-text';

/**
 * DOES THE PDF CONTAIN THE TEXT THAT WENT IN?
 *
 * The question every other PDF test in this repo dodged. A full green suite once
 * reported success on an Arabic export whose words were missing letters
 * (`العملية` → `العملي`) and had Latin glyphs substituted into them
 * (`مطورĂاجهات`) — because the assertions checked embedded fonts, run positions
 * and page geometry, and never the characters. Layout tests cannot catch a
 * corrupt glyph; only reading the text back can.
 *
 * `src/test/pdf-text.ts` decodes through each font's own `/ToUnicode` table,
 * which is also how an ATS reads the file — so this doubles as the ATS-parseable
 * guarantee the whole product rests on (§1).
 */

/** Words that must survive, kept apart from the resume so they can be asserted. */
const WORDS = {
  ar: {
    firstName: 'محمد',
    lastName: 'العلي',
    headline: 'مطور واجهات أمامية',
    summary: 'مطور برمجيات يعمل على تقنيات الويب الحديثة ويحرص على الجودة',
    company: 'شركة سايبرنت',
    position: 'أخصائي قسم خدمة العملاء',
    institution: 'جامعة باكو الحكومية',
    faculty: 'كلية الرياضيات التطبيقية',
    skill: 'إدارة الوقت',
    highlight: 'إعادة بناء بوابة المكلفين',
  },
  ka: {
    firstName: 'ნიკოლოზ',
    lastName: 'ბარათაშვილი',
    headline: 'ფრონტენდ დეველოპერი',
    summary: 'გამოცდილი დეველოპერი რომელიც მუშაობს ვებტექნოლოგიებზე',
    company: 'კიბერნეტი',
    position: 'უფროსი დეველოპერი',
    institution: 'თბილისის სახელმწიფო უნივერსიტეტი',
    faculty: 'მათემატიკის ფაკულტეტი',
    skill: 'დროის მართვა',
    highlight: 'პორტალის სრული გადაწერა',
  },
  ru: {
    firstName: 'Иван',
    lastName: 'Петров',
    headline: 'Фронтенд разработчик',
    summary: 'Опытный разработчик который занимается вебтехнологиями',
    company: 'Кибернет',
    position: 'Ведущий разработчик',
    institution: 'Бакинский государственный университет',
    faculty: 'Факультет прикладной математики',
    skill: 'Управление временем',
    highlight: 'Полная переработка портала',
  },
} as const;

function resumeFor(locale: keyof typeof WORDS): Resume {
  const w = WORDS[locale];
  const r = createEmptyResume(locale as Locale);
  r.basics = {
    firstName: w.firstName,
    lastName: w.lastName,
    headline: w.headline,
    location: '',
  };
  r.contact = { email: 'test@example.az', items: [] };
  r.summary = w.summary;
  r.experience = [
    {
      id: 'x1',
      company: w.company,
      position: w.position,
      startDate: '2022-01-01',
      current: true,
      highlights: [w.highlight],
    },
  ];
  r.education = [
    {
      id: 'e1',
      type: 'university',
      institution: w.institution,
      faculty: w.faculty,
      specialization: w.faculty,
      degree: 'magister',
      startDate: '2009-09-01',
      endDate: '2011-06-30',
      current: false,
    },
  ];
  r.skills = [{ id: 's1', name: w.skill, level: 80 }];
  return r;
}

async function render(templateId: string, resume: Resume): Promise<string> {
  const entry = getTemplate(templateId);
  const Template = (await entry.load()).default;
  return pdf(
    buildResumeDocument(ReactPdf, Html, {
      html: renderToStaticMarkup(
        createElement(Template, {
          resume,
          t: i18n.getFixedT(resume.locale),
          formatDate: makeDateFormatter(resume.locale),
        }),
      ),
      attribution: true,
      pageMargin: entry.manifest.pageMargin,
      pageBleed: entry.manifest.pageBleed,
      locale: resume.locale,
    }),
  ).toString();
}

const LOCALES = Object.keys(WORDS) as (keyof typeof WORDS)[];
/** The locales whose text MUST survive intact. Arabic is tracked separately. */
const LTR_LOCALES = LOCALES.filter((l) => l !== 'ar');

describe('exported text matches the input', () => {
  beforeAll(() => registerResumeFonts(ReactPdf, 'public/fonts/ttf'));

  for (const { manifest } of listTemplates()) {
    for (const locale of LTR_LOCALES) {
      it(`keeps every word in "${manifest.id}" (${locale})`, async () => {
        const source = await render(manifest.id, resumeFor(locale));
        expect(missingWords(source, Object.values(WORDS[locale]).join(' '))).toEqual([]);
      }, 60_000);
    }

    /**
     * ⚠️ ARABIC IS A DOCUMENTED EXPECTED FAILURE, not an oversight.
     *
     * `it.fails` asserts the assertion below still does NOT hold, so this file
     * stays green while the gap exists AND turns red the moment somebody fixes
     * it — which is the signal we want, rather than a silently-skipped test.
     *
     * Two causes remain, both measured (see CLAUDE.md):
     *
     *  1. The non-joiner `utils/arabic` inserts at `ال` to suppress a spurious
     *     lam-alef ligature is extracted as a word break, so `العملية` comes out
     *     of the text layer as `ا لعملية`. Visual output is correct; only
     *     copy-paste and ATS parsing are affected. Removing the non-joiner takes
     *     this from 17 missing words to 10 but reintroduces a visible wrong
     *     ligature on most lines.
     *  2. Text is still truncated at LINE ENDS (`الحاسوب` → `الحاسو`), i.e. the
     *     line breaker over-fills a line and the excess is dropped. Independent of
     *     glyph handling — it survives with pre-shaping off.
     *
     * What this test DID catch and is now fixed: glyphs drawn from the wrong font
     * (Latin letters inside Arabic words) and characters dropped by the previous
     * patch. Do not delete it to make the suite green.
     */
    it.fails(`still loses Arabic words in "${manifest.id}"`, async () => {
      const source = await render(manifest.id, resumeFor('ar'));
      expect(missingWords(source, Object.values(WORDS.ar).join(' '))).toEqual([]);
    }, 60_000);
  }

  /**
   * Every glyph drawn must be one its own font can name. An unmappable id means
   * a run was painted with glyph ids belonging to a DIFFERENT font — the fault
   * that put Latin letters inside Arabic words.
   */
  for (const { manifest } of listTemplates()) {
    it(`draws only glyphs its fonts can name in "${manifest.id}"`, async () => {
      for (const locale of LTR_LOCALES) {
        const source = await render(manifest.id, resumeFor(locale));
        const unmapped = pdfTextRuns(source).flatMap((run) => run.unmapped);
        expect(unmapped, `${manifest.id} (${locale}) drew unmappable glyphs`).toEqual([]);
      }
    }, 120_000);

    /**
     * Arabic still draws a handful of glyphs its font's `/ToUnicode` cannot name
     * — react-pdf builds that table from `glyph.codePoints`, which is empty for
     * some glyphs the shaper produces. They paint correctly; they just cannot be
     * turned back into text. Expected-failure for the same reason as above.
     */
    it.fails(`draws unnameable glyphs for Arabic in "${manifest.id}"`, async () => {
      const source = await render(manifest.id, resumeFor('ar'));
      expect(pdfTextRuns(source).flatMap((run) => run.unmapped)).toEqual([]);
    }, 120_000);
  }

  /**
   * No Latin letter may appear inside a run drawn with a non-Latin font. This is
   * the direct signature of the corruption: `مطورĂاجهات`, `Hاريخ`, `اKبداع`.
   */
  it('never mixes Latin letters into Arabic runs', async () => {
    for (const { manifest } of listTemplates()) {
      const source = await render(manifest.id, resumeFor('ar'));
      for (const run of pdfTextRuns(source)) {
        const hasArabic = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(run.text);
        const latin = run.text.match(/[A-Za-zÀ-ſ]/g);
        expect(
          hasArabic && latin ? `${manifest.id}: "${run.text}" contains ${latin.join('')}` : null,
        ).toBeNull();
      }
    }
  }, 120_000);
});
