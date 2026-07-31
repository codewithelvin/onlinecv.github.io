/**
 * The CV's font stack — core, so a template never has to know which scripts the
 * app supports.
 *
 * Inter carries Latin (Azerbaijani `ə ğ ı İ ş` included) and Cyrillic but NOT a
 * single Georgian glyph, so a Georgian CV rendered in Inter alone exports as a
 * page of blanks: `@react-pdf` falls back to Helvetica per glyph, and Helvetica
 * has no Georgian either. Noto Sans Georgian covers exactly the gap — it is a
 * script-only build with no Latin at all, so the two never compete.
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
export const CV_FONT_STACK = ['Inter', 'NotoSansGeorgian'];

/** `CV_FONT_STACK` as a CSS declaration, for the templates' inline styles. */
export const CV_FONT_FAMILY = CV_FONT_STACK.join(', ');
