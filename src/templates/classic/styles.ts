import type { CSSProperties } from 'react';
import { classicTheme as c } from './theme';

/**
 * Size of the contact line's text.
 *
 * A named constant rather than a literal because `ContactList` needs the SAME
 * number to size its channel marks — that is what keeps a mark vertically centred
 * on the line it sits in (`contactIconHeight`). `styles` is typed
 * `Record<string, CSSProperties>`, so reading it back out of `contactLine`
 * recovers `string | number | undefined` and re-introduces the guesswork this
 * avoids.
 */
export const CONTACT_FONT_SIZE = 10;

/**
 * Classic template styles as inline `CSSProperties` (spec §7.1 CSS subset).
 * The same objects drive the live HTML preview and the export PDF, so they
 * stay within flexbox/colors/borders/fonts only — no grid/position/floats.
 */
export const styles: Record<string, CSSProperties> = {
  /**
   * No `fontFamily` here on purpose: core sets it on the page for both targets
   * (`cvFontStack` for the PDF, `A4Frame` for the preview) so that it can be
   * ORDERED BY THE CV LANGUAGE. Pinning it in a template puts Inter back in
   * front, which hands the characters every face shares — the space above all —
   * to the wrong font and shatters each Arabic or Georgian line into
   * alternating runs.
   */
  page: {
    color: c.text,
    backgroundColor: c.pageBg,
    // Horizontal only — the vertical margin is `manifest.pageMargin`, so it
    // repeats on page 2 instead of applying once to the whole document.
    padding: '0 40px',
    fontSize: 11,
    lineHeight: 1.45,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    borderBottom: `1px solid ${c.rule}`,
    paddingBottom: 12,
    marginBottom: 14,
  },
  name: { fontSize: 24, fontWeight: 700, color: c.heading, letterSpacing: 0.2 },
  headline: { fontSize: 13, color: c.accent, fontWeight: 600, marginTop: 2 },
  contactLine: { fontSize: CONTACT_FONT_SIZE, color: c.muted, marginTop: 6 },
  /**
   * A contact channel as a link (`ContactList`). Deliberately the SAME colour as
   * `contactLine` and undecorated: the printed contact line must look exactly as
   * it did before it became tappable. The declaration is still required — a
   * browser paints an unstyled anchor blue, and `react-pdf-html`'s own
   * `a { textDecoration: underline }` survives `resetStyles`.
   */
  contactLink: { color: c.muted, textDecoration: 'none' },
  section: { marginBottom: 12, display: 'flex', flexDirection: 'column' },
  /** Heading + first entry, kept on one page (see `KEEP_TOGETHER`). */
  keepTogether: { display: 'flex', flexDirection: 'column' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: c.heading,
    borderBottom: `1px solid ${c.rule}`,
    paddingBottom: 3,
    marginBottom: 7,
  },
  paragraph: { fontSize: 11, color: c.text, margin: 0 },
  entry: { marginBottom: 9, display: 'flex', flexDirection: 'column' },
  entryHeadRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  /**
   * The title yields, the date does not. Real entries have long titles
   * ("Lənkəran Dövlət Universitetinin Sosial və Aqrar-Texnoloji Kolleci") next
   * to a short date, and the two defaults disagree: CSS shrinks flex items by
   * default, Yoga (react-pdf) does not. Stating both keeps the preview and the
   * PDF breaking the same way, with the date always intact on one line.
   */
  entryTitle: { fontSize: 11.5, fontWeight: 600, color: c.heading, flexShrink: 1, paddingRight: 8 },
  entryDate: { fontSize: 10, color: c.faint, fontWeight: 500, flexShrink: 0 },
  entrySub: { fontSize: 10.5, color: c.muted, marginTop: 1 },
  entryDesc: { fontSize: 10.5, color: c.text, marginTop: 3 },
  /** Indent is `paddingLeft` + the marker column drawn by `BulletList` (10pt). */
  bulletList: { marginTop: 3, marginBottom: 0, paddingLeft: 4 },
  bulletItem: { fontSize: 10.5, color: c.text, marginBottom: 1 },
  infoRow: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
  infoPair: { fontSize: 10.5, color: c.text, width: '50%', marginBottom: 2 },
  infoLabel: { color: c.faint },
  inlineList: { fontSize: 10.5, color: c.text },
  link: { color: c.accent, textDecoration: 'none' },
};
