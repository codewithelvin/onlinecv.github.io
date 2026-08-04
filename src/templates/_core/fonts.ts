import type { Locale } from '../../types/resume';

/**
 * The CV's font stack — core, so a template never has to know which scripts the
 * app supports.
 *
 * Inter carries Latin (Azerbaijani `ə ğ ı İ ş` included) and Cyrillic but NOT a
 * single Georgian or Arabic glyph, so a CV in either script rendered in Inter
 * alone exports as a page of blanks: `@react-pdf` falls back to Helvetica per
 * glyph, and Helvetica has no more of them than Inter does. The two Noto faces
 * cover exactly the gaps — both are script-only builds with no Latin at all, so
 * none of the three ever competes for a code point.
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
export const CV_FONT_STACK = ['Inter', 'NotoSansGeorgian', 'NotoSansArabic', 'NotoSansHebrew'];

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
};

/**
 * WHAT ORDER CANNOT DO, so that nobody tries to fix it here again.
 *
 * All three faces carry the characters scripts SHARE \u2014 space, digits, Latin
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
