import type { CSSProperties } from 'react';
import { classicTheme as c } from './theme';

/**
 * Classic template styles as inline `CSSProperties` (spec §7.1 CSS subset).
 * The same objects drive the live HTML preview and the export PDF, so they
 * stay within flexbox/colors/borders/fonts only — no grid/position/floats.
 */
export const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: 'Inter',
    color: c.text,
    backgroundColor: c.pageBg,
    padding: '32px 40px',
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
  entryTitle: { fontSize: 11.5, fontWeight: 600, color: c.heading },
  entryDate: { fontSize: 10, color: c.faint, fontWeight: 500 },
  entrySub: { fontSize: 10.5, color: c.muted, marginTop: 1 },
  entryDesc: { fontSize: 10.5, color: c.text, marginTop: 3 },
  bulletList: { marginTop: 3, marginBottom: 0, paddingLeft: 16 },
  bulletItem: { fontSize: 10.5, color: c.text, marginBottom: 1 },
  infoRow: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
  infoPair: { fontSize: 10.5, color: c.text, width: '50%', marginBottom: 2 },
  infoLabel: { color: c.faint },
  inlineList: { fontSize: 10.5, color: c.text },
  link: { color: c.accent, textDecoration: 'none' },
};
