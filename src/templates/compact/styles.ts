import type { CSSProperties } from 'react';
import { compactTheme as c } from './theme';

/** Compact template styles — smaller base size, tighter leading/margins (spec build plan). */
export const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: 'Inter',
    color: c.text,
    backgroundColor: c.pageBg,
    padding: '24px 32px',
    fontSize: 9.5,
    lineHeight: 1.35,
    display: 'flex',
    flexDirection: 'column',
  },
  header: { display: 'flex', flexDirection: 'column', marginBottom: 8 },
  name: { fontSize: 19, fontWeight: 700, color: c.heading },
  headline: { fontSize: 11, color: c.accent, fontWeight: 600 },
  contactLine: { fontSize: 9, color: c.muted, marginTop: 3 },
  section: { marginBottom: 7, display: 'flex', flexDirection: 'column' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: c.heading,
    borderBottom: `1px solid ${c.rule}`,
    paddingBottom: 2,
    marginBottom: 4,
  },
  paragraph: { fontSize: 9.5, color: c.text, margin: 0 },
  entry: { marginBottom: 5, display: 'flex', flexDirection: 'column' },
  entryHeadRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  entryTitle: { fontSize: 10, fontWeight: 600, color: c.heading },
  entryDate: { fontSize: 9, color: c.faint },
  entrySub: { fontSize: 9.5, color: c.muted },
  entryDesc: { fontSize: 9.5, color: c.text, marginTop: 1 },
  bulletList: { marginTop: 1, marginBottom: 0, paddingLeft: 14 },
  bulletItem: { fontSize: 9.5, color: c.text },
  inlineList: { fontSize: 9.5, color: c.text },
  infoLine: { fontSize: 9.5, color: c.text },
  infoLabel: { color: c.faint },
  link: { color: c.accent, textDecoration: 'none' },
};
