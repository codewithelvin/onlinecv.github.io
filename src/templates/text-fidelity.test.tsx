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
  /**
   * Hebrew is right-to-left like Arabic, so it goes through the same bidi
   * reordering — but it needs no shaping pass (no contextual letter forms, no
   * mandatory ligatures) and therefore neither pre-shaping nor non-joiners, which
   * are what damage Arabic's text layer. If that reasoning holds, Hebrew comes back
   * intact and belongs in the must-survive list rather than beside Arabic. This is
   * the assertion `LocaleMeta.cv: true` rests on for Hebrew.
   */
  he: {
    firstName: 'דוד',
    lastName: 'כהן',
    headline: 'מפתח צד לקוח',
    summary: 'מפתח תוכנה בעל ניסיון בפיתוח מערכות ובעבודה מול לקוחות',
    company: 'סייברנט',
    position: 'מפתח בכיר',
    institution: 'האוניברסיטה העברית בירושלים',
    faculty: 'הפקולטה למתמטיקה שימושית',
    skill: 'ניהול זמן',
    highlight: 'בנייה מחדש של פורטל הלקוחות',
  },
  /**
   * Korean — the first East Asian script here, and what is interesting about it is
   * how LITTLE it needs. Hangul is written with precomposed syllables, one code
   * point each, so there are no contextual forms and nothing for a shaping pass to
   * do; it reads left-to-right, so no bidi either. If that reasoning holds the words
   * come back exactly as they went in — and `LocaleMeta.cv: true` rests on this
   * passing rather than on the reasoning.
   *
   * The surname is a single syllable on purpose (see `PERSON_NAME`), and the company
   * name mixes Latin into Hangul, which is how Korean CVs are really written — that
   * is also the case where `cvFontStack` hands one line to two faces.
   */
  ko: {
    firstName: '민준',
    lastName: '김',
    headline: '프런트엔드 개발자',
    summary: '웹 기술을 다루는 소프트웨어 개발자이며 품질과 협업을 중시합니다',
    company: '사이버넷 Cybernet',
    position: '선임 프런트엔드 개발자',
    institution: '서울대학교',
    faculty: '컴퓨터공학부',
    skill: '시간 관리',
    highlight: '납세자 포털 전면 재구축',
  },
  /**
   * Chinese, and it is here rather than beside Arabic for one reason worth stating:
   * `NotoSansSC` is a CFF/OTF, the first one this app registers. `@react-pdf` had
   * never been asked to subset that outline format here, and the Korean woff2 is the
   * standing proof that this engine will silently embed a whole face when it cannot
   * read the tables it expects. If the CFF path is sound, every word below comes
   * back out of the PDF exactly as it went in — `LocaleMeta.cv: true` for `zh` rests
   * on this passing, not on the reasoning.
   *
   * Latin is mixed into the company name deliberately: `NotoSansSC` carries Latin
   * (unlike the three Noto script faces), so a Chinese-led stack has to go on
   * serving both halves of that string.
   */
  zh: {
    firstName: '明',
    lastName: '李',
    headline: '前端开发工程师',
    summary: '拥有多年经验的软件开发工程师，熟悉现代前端技术栈并重视代码质量',
    company: '赛博网络 Cybernet',
    position: '高级前端开发工程师',
    institution: '北京大学',
    faculty: '计算机科学与技术学院',
    skill: '时间管理',
    highlight: '完成纳税人门户的全面重构',
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
/**
 * The locales whose text MUST survive intact — everything except Arabic, which is
 * tracked as a documented expected failure below.
 *
 * NOT "the left-to-right ones", which is what this list used to be called: Hebrew
 * is right-to-left and still expected to come back whole, because what damages
 * Arabic is the shaping workaround, not the direction.
 */
const MUST_SURVIVE = LOCALES.filter((l) => l !== 'ar');

describe('exported text matches the input', () => {
  beforeAll(() => registerResumeFonts(ReactPdf, 'public/fonts/ttf'));

  for (const { manifest } of listTemplates()) {
    for (const locale of MUST_SURVIVE) {
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
    it.fails(
      `still loses Arabic words in "${manifest.id}"`,
      async () => {
        const source = await render(manifest.id, resumeFor('ar'));
        expect(missingWords(source, Object.values(WORDS.ar).join(' '))).toEqual([]);
      },
      60_000,
    );
  }

  /**
   * Every glyph drawn must be one its own font can name. An unmappable id means
   * a run was painted with glyph ids belonging to a DIFFERENT font — the fault
   * that put Latin letters inside Arabic words.
   */
  for (const { manifest } of listTemplates()) {
    it(`draws only glyphs its fonts can name in "${manifest.id}"`, async () => {
      for (const locale of MUST_SURVIVE) {
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
    it.fails(
      `draws unnameable glyphs for Arabic in "${manifest.id}"`,
      async () => {
        const source = await render(manifest.id, resumeFor('ar'));
        expect(pdfTextRuns(source).flatMap((run) => run.unmapped)).toEqual([]);
      },
      120_000,
    );
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
