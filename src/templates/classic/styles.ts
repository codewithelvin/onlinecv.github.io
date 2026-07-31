import type { CSSProperties } from 'react';
import { CV_FONT_FAMILY } from '../_core/fonts';
import { classicTheme as c } from './theme';

/**
 * Classic template styles as inline `CSSProperties` (spec §7.1 CSS subset).
 * The same objects drive the live HTML preview and the export PDF, so they
 * stay within flexbox/colors/borders/fonts only — no grid/position/floats.
 */
export const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: CV_FONT_FAMILY,
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
  contactLine: { fontSize: 10, color: c.muted, marginTop: 6 },
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
