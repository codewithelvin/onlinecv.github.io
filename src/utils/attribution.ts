import type { CSSProperties } from 'react';
import type { Resume } from '../types/resume';

/**
 * The optional "Made with …" credit line on the CV (FR: support the project).
 *
 * Deliberately NOT translated: it is the product's own wordmark plus its domain,
 * and it reads the same on an Azerbaijani, Russian or English CV.
 */
export const ATTRIBUTION_TEXT = 'Made with www.onlinecv.az';

/**
 * Whether the credit line is shown. Opt-OUT: resumes persisted before the flag
 * existed carry no value, and those must keep showing it, so ONLY an explicit
 * `false` turns it off.
 */
export function showAttribution(resume: Resume): boolean {
  return resume.attribution !== false;
}

/**
 * Preview footer styling. The preview canvas is laid out at 1 CSS px = 1 PDF pt
 * (see `A4Frame`), so these numbers are the same ones `services/pdf.ts` gives the
 * exported footer — the two renders match without a second set of constants.
 *
 * Absolutely positioned, exactly like the PDF's `<Text fixed>`, and for the same
 * reason: in the flow it would take height from the template root, and a
 * template that fills the page (the modern one's accent sidebar) would stop
 * short of the bottom edge with a white strip under it.
 */
export const ATTRIBUTION_FONT_SIZE = 7;
export const ATTRIBUTION_COLOR = '#9e9e9e';
/** Distance from the bottom edge of the page, in points — shared with the PDF. */
export const ATTRIBUTION_BOTTOM = 10;

/**
 * Positioned against the SHEET, not the text area — in both targets.
 *
 * react-pdf resolves an absolutely positioned child of `Page` against the page
 * box, page margin included, so the offset is measured straight from the paper
 * edge. The preview therefore renders this as a child of the sheet rather than
 * of the margin-inset text area (see `A4Frame`); the previous attempt to
 * compensate for the margin arithmetically put the credit 12pt BELOW the bottom
 * of the paper, where it silently vanished from the export.
 */
export const attributionPreviewStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: ATTRIBUTION_BOTTOM,
  textAlign: 'center',
  fontFamily: 'Inter',
  fontSize: ATTRIBUTION_FONT_SIZE,
  color: ATTRIBUTION_COLOR,
};
