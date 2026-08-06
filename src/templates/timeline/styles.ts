import type { CSSProperties } from 'react';
import { timelineTheme as c } from './theme';

/**
 * Timeline template styles (inline CSSProperties; spec §7.1 subset — flexbox
 * only, no grid/position/floats/transforms).
 *
 * The source design draws its decorator with `position: absolute` pseudo-elements
 * (`.decorator::before`/`::after`, two stacked circles) and a `float`ed
 * place/location pair. Neither survives the react-pdf-html subset, so both are
 * rebuilt out of flex boxes here — see `rail*`/`dot` and `placeRow` below. That
 * rebuild is the whole adaptation: the geometry is the same, the mechanism is not.
 */
export const styles: Record<string, CSSProperties> = {
  /**
   * No `fontFamily` and no `backgroundColor` — see the modern template for both.
   * The sidebar fill is `manifest.pageBleed`, so anything opaque here hides it.
   */
  page: {
    color: c.text,
    fontSize: 9.5,
    lineHeight: 1.35,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    flexGrow: 1,
  },
  /** `position: relative` puts the columns back on top of the bleed layer — see modern. */
  main: {
    position: 'relative',
    width: '66%',
    // Horizontal only; the vertical margin is `manifest.pageMargin`.
    padding: '0 20px',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebar: {
    position: 'relative',
    width: '34%',
    padding: '4px 16px',
    display: 'flex',
    flexDirection: 'column',
  },

  /* ── main column: title block ─────────────────────────────────────────── */

  header: { marginBottom: 16, display: 'flex', flexDirection: 'column' },
  /**
   * `fontWeight: 400`, not the source's 300: only 400/500/600/700 of Inter are
   * registered (`services/pdf.ts`), and asking for a weight that is not there
   * makes @react-pdf pick the nearest — so a 300 would silently BE this, while
   * telling the next reader a light face exists. The airy look comes from the
   * size and the letter spacing instead.
   *
   * ⚠️ NO `textTransform: 'uppercase'`, even though the source design sets the
   * name in caps. It may only be spent on strings the APP owns — section titles,
   * field labels — never on what the user typed. Two reasons, and
   * `text-fidelity.test.tsx` caught both: the PDF's text layer then carries
   * `ИВАН ПЕТРОВ` where the CV says `Иван Петров`, so an ATS reads back a name
   * nobody wrote; and `toUpperCase()` on Georgian maps Mkhedruli to MTAVRULI,
   * which Georgian orthography uses for whole words only — the same trap
   * `LocaleMeta.capitalizeMonths` exists to keep month names out of.
   */
  name: {
    fontSize: 19,
    fontWeight: 400,
    letterSpacing: 1.2,
    color: c.heading,
    lineHeight: 1.2,
  },
  headline: { fontSize: 9.5, color: c.muted, marginTop: 4, letterSpacing: 0.4 },

  /* ── main column: sections ────────────────────────────────────────────── */

  section: { marginBottom: 12, display: 'flex', flexDirection: 'column' },
  /** Heading + first entry, kept on one page (see `KEEP_TOGETHER`). */
  keepTogether: { display: 'flex', flexDirection: 'column' },
  /**
   * The heading is INDENTED to the rail, not to the page: in the source it sits at
   * `left: date-block-width + margin`, so the section titles and the entry titles
   * share one vertical line and the dates hang out to the left of both.
   */
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: c.sectionTitle,
    marginBottom: 6,
  },

  /* ── the indent that lines headings up with the entry titles ──────────── */

  indentRow: { display: 'flex', flexDirection: 'row' },
  /**
   * Exactly the width of what sits left of an entry's text: the date column (54),
   * the rail (9) and the gap after it (`DETAILS_GAP`, 9). Keep the three in step
   * or the section headings stop lining up with the titles beneath them.
   */
  indentSpacer: { width: 72, flexGrow: 0, flexShrink: 0 },
  indentBody: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },

  /* ── one entry: [date] [rail] [details] ───────────────────────────────── */

  /** `alignItems: stretch` is what lets the rail below fill the entry's height. */
  entryRow: { display: 'flex', flexDirection: 'row', alignItems: 'stretch' },
  dateCol: {
    width: 54,
    flexGrow: 0,
    flexShrink: 0,
    paddingRight: 8,
    paddingTop: 1,
    textAlign: 'right',
    fontSize: 8,
    lineHeight: 1.25,
    color: c.faint,
  },
  /**
   * The decorator column. Three boxes in a column — a short rule, the dot, then a
   * rule that grows — which draws a continuous vertical line with a filled circle
   * on it. The source stacks two absolutely positioned pseudo-elements to get the
   * same picture; this needs no positioning, so it lays out identically in Yoga and
   * in the browser.
   */
  rail: {
    width: 9,
    flexGrow: 0,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  railStub: { width: 1, height: 5, backgroundColor: c.rail },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.dot },
  railLine: { width: 1, flexGrow: 1, backgroundColor: c.rail },
  /**
   * `flexBasis: 0` + `minWidth: 0` so long text wraps inside the row (see
   * `BulletList`). The gap after the rail is applied by `index.tsx` (`DETAILS_GAP`),
   * which puts it on whichever side the CV's language starts from.
   */
  details: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingBottom: 9,
  },
  entryTitle: { fontSize: 10.5, fontWeight: 600, color: c.heading },
  /** Workplace on one side, location on the other — the source's floated pair. */
  placeRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  place: { fontSize: 9, color: c.muted, paddingRight: 8 },
  location: { fontSize: 9, color: c.faint },
  entrySub: { fontSize: 9, color: c.faint, marginTop: 1 },
  entryDesc: { fontSize: 9, color: c.muted, marginTop: 3 },
  paragraph: { fontSize: 9.5, color: c.text, margin: 0 },
  bulletList: { marginTop: 3, marginBottom: 0, paddingLeft: 0 },
  bulletItem: { fontSize: 9, color: c.muted, marginBottom: 1 },
  mainLink: { fontSize: 9, color: c.muted, textDecoration: 'none' },

  /* ── sidebar ──────────────────────────────────────────────────────────── */

  sideSection: { marginTop: 18, display: 'flex', flexDirection: 'column' },
  sideTitle: {
    fontSize: 10.5,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: c.heading,
    marginBottom: 5,
  },
  sideItem: { fontSize: 8.5, color: c.muted, marginBottom: 2.5, lineHeight: 1.4 },
  sideLabel: { fontSize: 8, color: c.faint, textTransform: 'uppercase', letterSpacing: 0.4 },
};
