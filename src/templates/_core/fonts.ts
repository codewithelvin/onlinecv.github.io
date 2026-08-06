import type { Locale } from '../../types/resume';

/**
 * The CV's font stack — core, so a template never has to know which scripts the
 * app supports.
 *
 * Inter carries Latin (Azerbaijani `ə ğ ı İ ş` included) and Cyrillic but NOT a
 * single Georgian, Arabic, Hebrew, Hangul or Han glyph, so a CV in any of those
 * scripts rendered in Inter alone exports as a page of blanks: `@react-pdf` falls
 * back to Helvetica per glyph, and Helvetica has no more of them than Inter does.
 * The extra faces cover exactly the gaps.
 *
 * The three script-only Noto faces (Georgian, Arabic, Hebrew) carry no Latin at
 * all, so they can never compete with Inter for a code point. The two East Asian
 * faces DO — a Korean or Chinese text face ships Latin, because both languages are
 * written with Latin mixed in — and in both cases that was measured rather than
 * assumed, because whichever family leads supplies every space, digit and comma in
 * the document (see below):
 *
 *  - `NanumGothic` lands within 5% of Inter (space 0.280 vs 0.281 em, comma 0.303
 *    vs 0.288, `a` 0.545 vs 0.562).
 *  - `NotoSansSC` is close on the marks that show (comma 0.278 vs 0.288, `a` 0.563
 *    vs 0.562) and 20% tighter on the SPACE (0.224 vs 0.281). That is visible in a
 *    Latin run but not wrong, and Chinese is written without spaces between words,
 *    so the character it under-serves is the one its own script barely uses. Its
 *    digits are tabular (0.555 throughout, against Inter's proportional
 *    0.407–0.646), which a column of dates is better off for.
 *
 * `NotoSansSC` has one real gap, and it is the app's own market: it covers ASCII,
 * Latin-1 and Cyrillic but NOT `ə ğ ı İ ş`. So an Azerbaijani proper noun inside a
 * Chinese CV takes those five letters from Inter and everything around them from
 * NotoSansSC — per-glyph fallback doing exactly its job, in both targets.
 *
 * Both targets get per-glyph fallback from this one declaration:
 *
 *  - The browser does it natively for a CSS font stack.
 *  - `react-pdf-html` splits a `font-family` declaration on commas into the
 *    array form that `@react-pdf/layout`'s `fontSubstitution` walks per code
 *    point (`pickFontFromFontStack`). NOTE: `@react-pdf` itself does NOT split a
 *    comma-separated string — a real `StyleSheet` (`services/pdf.ts`) must be
 *    given `CV_FONT_STACK`, the array, or the whole string is read as one
 *    unknown family name.
 *
 * Every family named here must be registered in BOTH places: `Font.register` in
 * `services/pdf.ts` (PDF) and an `@font-face` in `index.css` (preview) —
 * otherwise the same CV renders in two different faces.
 */
export const CV_FONT_STACK = [
  'Inter',
  'NotoSansGeorgian',
  'NotoSansArabic',
  'NotoSansHebrew',
  'NanumGothic',
  'NotoSansJP',
  'NotoSansSC',
];

/** `CV_FONT_STACK` as a CSS declaration, for the templates' inline styles. */
export const CV_FONT_FAMILY = CV_FONT_STACK.join(', ');

/**
 * The font that should answer FIRST for a CV in a given language.
 *
 * Only the scripts that need their own face appear here; everything else is
 * covered by Inter, which stays the default.
 */
const PRIMARY_FONT: Partial<Record<Locale, string>> = {
  ka: 'NotoSansGeorgian',
  ar: 'NotoSansArabic',
  he: 'NotoSansHebrew',
  ko: 'NanumGothic',
  zh: 'NotoSansSC',
  ja: 'NotoSansJP',
};

/**
 * Which face must answer FIRST for a language, or `undefined` when Inter covers
 * the script.
 *
 * Exported because the UI has the same question and, since Japanese, the same
 * hard constraint: `app/theme.ts` orders the CHROME's stack with it. Two callers,
 * one table — the alternative is a second list that silently disagrees with this
 * one about which font a language is set in.
 */
export function primaryFont(locale: Locale): string | undefined {
  return PRIMARY_FONT[locale];
}

/**
 * ⚠️ JAPANESE AND CHINESE WANT THE SAME CODE POINTS, and no `unicode-range` can
 * separate them.
 *
 * The earlier overlaps were narrow enough to settle by size — NanumGothic and
 * NotoSansSC both claim U+3000–303F (。、《》「」), so the smaller face is declared
 * first and a Chinese page pulls 333 KB of Korean rather than a Korean page
 * pulling 8 MB of Han. `NotoSansJP` breaks that method: it claims kana AND the
 * whole CJK Unified block, exactly what `NotoSansSC` claims, so whichever of the
 * two leads supplies every ideograph in the document.
 *
 * And they are not interchangeable. Measured with fontkit on the two shipped
 * faces: of 1,806 sampled ideographs both fonts contain, **65.6% are drawn with
 * different outlines**, and 25 of the 43 characters in ordinary CV vocabulary
 * (氏名, 学歴, 職歴, 資格, 免許, 会社, 卒業, 都道府県) are among them. A Japanese CV
 * set in NotoSansSC is legible but visibly Chinese-typeset — the same class of
 * defect as Mtavruli month names in Georgian, where the glyphs exist and are
 * still the wrong ones.
 *
 * So the ORDER follows the document's language rather than a fixed rule, here and
 * in the chrome. Neither face can be dropped: NotoSansJP has 12,747 ideographs to
 * NotoSansSC's 20,976 and lacks most simplified-only forms, so a Chinese page led
 * by it would fall through to SC glyph by glyph and mix two faces in one line.
 */

/**
 * WHAT ORDER CANNOT DO, so that nobody tries to fix it here again.
 *
 * Every face carries the characters scripts SHARE \u2014 space, digits, Latin
 * punctuation \u2014 and `@react-pdf/layout`'s `fontSubstitution` resolves each code
 * point against the stack strictly first-match-first, with the previously used
 * font ranked BELOW the whole stack (`pickFontFromFontStack`). There is no
 * context sensitivity to exploit: whichever family leads supplies every shared
 * character in the document, however far it sits from its own script.
 *
 * So a single flat stack always mis-serves the minority script. Measured on the
 * shipped faces, per em: space 0.281 (Inter) vs 0.260 (both Noto); comma and
 * period 0.288 (Inter) vs 0.600 (Noto Georgian) \u2014 more than double. A Georgian
 * CV led by Noto Georgian therefore prints double-width commas inside its Latin
 * e-mail addresses and skill names, and led by Inter it gives its Georgian prose
 * Latin-proportioned spaces instead. Both are compromises; neither is a bug that
 * reordering can remove.
 *
 * How big the compromise is depends on the FACE, though, not on the principle:
 * `NanumGothic`'s shared characters are within 5% of Inter's (space 0.280, comma
 * 0.303, `(` 0.363), because a Korean text face is designed to sit next to Latin.
 * A Korean CV led by it therefore pays nothing measurable, unlike a Georgian one.
 * `NotoSansSC` sits between the two: same punctuation widths as Inter, a space 20%
 * tighter — and a Chinese CV is mostly text that has no spaces in it.
 *
 * The CV's own language wins, because that is where the bulk of the text is. Per
 * text-element stacks would be the real fix, but `fontFamily` would have to be
 * decided per element in BOTH renderers (the preview draws the templates' React
 * elements, the export re-parses their markup) \u2014 a change to every template, for
 * a difference of a fraction of a point in punctuation width.
 */

/**
 * `CV_FONT_STACK` reordered so the script the document is actually in comes
 * first.
 *
 * WHY THE ORDER MATTERS, and it is not about letters. All three faces contain
 * the characters scripts SHARE — space above all, plus digits and punctuation —
 * so whichever font is named first wins them. With Inter fixed at the front,
 * every space inside an Arabic line resolved to Inter, and `fontSubstitution`
 * splits a line at each change of font: one measured Arabic line came out as
 * ELEVEN runs in two fonts instead of five in one, and the runs either side of a
 * space were emitted at the same x — the "characters on top of each other" a
 * user reported.
 *
 * Putting the document's own script first means its spaces, digits and
 * punctuation come from its own font, so a line stays one run.
 *
 * Registration is unaffected — `services/pdf.ts` registers every family in
 * `CV_FONT_STACK` whatever the CV's language, because one CV can mix them.
 */
export function cvFontStack(locale: Locale): string[] {
  /**
   * The CV's LANGUAGE decides, and nothing else.
   *
   * This briefly also sniffed the document's content, so that Arabic typed into
   * an Azerbaijani CV would pull the Arabic face to the front. That existed only
   * to dodge a crash in `@react-pdf/textkit`, which is now fixed properly by
   * `patches/@react-pdf+textkit+4.4.1.patch` — and as a layout rule it was
   * actively bad: one Arabic word in an otherwise Latin CV re-served every space,
   * digit and comma in the whole document from the Arabic face.
   */
  const primary = PRIMARY_FONT[locale];
  if (!primary) return CV_FONT_STACK;
  return [primary, ...CV_FONT_STACK.filter((family) => family !== primary)];
}

/** `cvFontStack` as a CSS declaration, for the preview and the parsed markup. */
export function cvFontFamily(locale: Locale): string {
  return cvFontStack(locale).join(', ');
}
