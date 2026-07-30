import type { CSSProperties } from 'react';
import { modernTheme as m } from './theme';

/** Modern template styles (inline CSSProperties; spec §7.1 subset — flexbox only). */
export const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: 'Inter',
    backgroundColor: m.pageBg,
    color: m.text,
    fontSize: 11,
    lineHeight: 1.45,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    /**
     * Fill the page height so the accent sidebar runs edge to edge instead of
     * stopping at its own content. Works in both targets: `react-pdf-html`
     * renders this div as a direct child of react-pdf's `Page` (a flex column),
     * and `A4Frame` makes its canvas a flex column for the live preview.
     * `flexGrow` rather than a fixed height, so nothing is hard-coded to A4 and
     * a CV that overflows one page still paginates normally.
     */
    flexGrow: 1,
  },
  /**
   * The accent column's COLOUR, painted as a page-level layer rather than as the
   * background of the flowing column.
   *
   * It has to escape the page margin to reach the paper edges, and a flex child
   * cannot: negative margins stretch a stretched item upwards but not downwards
   * (measured — the column came up 28pt short at the foot). Absolute offsets are
   * honoured in both directions, and `data-page-bleed` makes react-pdf repeat it
   * on every page (see `blockRenderer` in `services/pdf.ts`). First child, so it
   * paints behind the sidebar's content.
   */
  sidebarBleed: {
    position: 'absolute',
    top: -28,
    bottom: -28,
    left: 0,
    width: '34%',
    backgroundColor: m.accent,
  },
  /**
   * `position: relative` on both columns is load-bearing, not decoration: a
   * browser paints POSITIONED elements above in-flow ones regardless of source
   * order, so the absolutely positioned accent layer above would otherwise cover
   * the sidebar's text and the left edge of the main column in the preview.
   * Making the columns positioned too puts them back in document order — behind
   * nothing, in front of the layer. react-pdf already paints in document order,
   * so this changes nothing there.
   */
  sidebar: {
    position: 'relative',
    width: '34%',
    color: m.sidebarText,
    padding: '28px 18px',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    position: 'relative',
    width: '66%',
    // Horizontal only; vertical comes from `manifest.pageMargin`.
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
  },
  avatarWrap: { display: 'flex', flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  avatar: { width: 92, height: 92, borderRadius: 46, objectFit: 'cover' },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: m.accentDark,
    color: m.sidebarText,
    fontSize: 30,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideName: { fontSize: 18, fontWeight: 700, textAlign: 'center', color: m.sidebarText },
  sideHeadline: { fontSize: 11, textAlign: 'center', color: m.sidebarMuted, marginTop: 2, marginBottom: 8 },
  sideSection: { marginTop: 12, display: 'flex', flexDirection: 'column' },
  sideTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: m.sidebarText,
    borderBottom: `1px solid ${m.barTrack}`,
    paddingBottom: 3,
    marginBottom: 6,
  },
  sideItem: { fontSize: 10, color: m.sidebarMuted, marginBottom: 3 },
  barLabel: { fontSize: 10, color: m.sidebarText, marginBottom: 2, marginTop: 5 },
  barTrack: { width: '100%', height: 5, backgroundColor: m.barTrack, borderRadius: 3 },
  barFill: { height: 5, backgroundColor: m.barFill, borderRadius: 3 },
  section: { marginBottom: 12, display: 'flex', flexDirection: 'column' },
  /** Heading + first entry, kept on one page (see `KEEP_TOGETHER`). */
  keepTogether: { display: 'flex', flexDirection: 'column' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: m.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    borderBottom: `2px solid ${m.rule}`,
    paddingBottom: 3,
    marginBottom: 7,
  },
  paragraph: { fontSize: 11, color: m.text, margin: 0 },
  entry: { marginBottom: 9, display: 'flex', flexDirection: 'column' },
  entryTitle: { fontSize: 11.5, fontWeight: 600, color: m.heading },
  entryMeta: { fontSize: 10, color: m.faint, marginTop: 1 },
  entryDesc: { fontSize: 10.5, color: m.muted, marginTop: 3 },
  /** Indent is `paddingLeft` + the marker column drawn by `BulletList` (10pt). */
  bulletList: { marginTop: 3, marginBottom: 0, paddingLeft: 4 },
  bulletItem: { fontSize: 10.5, color: m.muted, marginBottom: 1 },
  link: { color: m.sidebarMuted, textDecoration: 'none' },
  mainLink: { color: m.accent, textDecoration: 'none' },
};
