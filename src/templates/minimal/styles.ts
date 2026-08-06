import type { CSSProperties } from 'react';
import { minimalTheme as c } from './theme';

/**
 * Gutter template styles (inline CSSProperties; spec §7.1 subset — flexbox only).
 *
 * The source builds its gutter by giving the content a large `padding-left` and
 * then pulling `.side` elements back into it with a negative margin and a `float`.
 * Floats do not exist in the react-pdf-html subset, so the page is rebuilt as a
 * stack of two-cell ROWS that all share one gutter width — same picture, and it
 * paginates properly, which the floated original would not.
 */
export const styles: Record<string, CSSProperties> = {
  /** No `fontFamily` — core orders the stack by the CV's language. See modern. */
  page: {
    color: c.text,
    fontSize: 9.5,
    lineHeight: 1.5,
    display: 'flex',
    flexDirection: 'column',
    padding: '0 28px',
  },

  /* ── the two-cell row every block is made of ──────────────────────────── */

  row: { display: 'flex', flexDirection: 'row' },
  /**
   * The gutter cell: right-aligned against the content, which is what makes the
   * dates and the photo read as a margin column rather than as a second column.
   */
  /**
   * 122pt, not the source's 184px. Sized to the LONGEST thing it has to hold: a
   * full date, the slash and a localized "Present" (`01.01.2022 / İndiyə kimi`).
   * The original only ever showed years, so its gutter could be narrower without
   * the date breaking into a two-line ragged block.
   */
  aside: {
    width: 122,
    flexGrow: 0,
    flexShrink: 0,
    paddingRight: 18,
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
  },
  /** `flexBasis: 0` + `minWidth: 0` so long text wraps instead of widening the row. */
  body: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },

  /* ── author ───────────────────────────────────────────────────────────── */

  /**
   * The photo sits in a bordered box in the gutter — the source's `.cv-photo`,
   * minus the `position: absolute` white bar it lays over the border.
   */
  photoBox: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: c.border,
    padding: 9,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photo: { width: 62, height: 62, objectFit: 'cover' },
  photoFallback: {
    width: 62,
    height: 62,
    backgroundColor: c.track,
    color: c.muted,
    fontSize: 20,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  author: { marginBottom: 10 },
  /**
   * `fontWeight: 700`, not the source's 800: only 400/500/600/700 of Inter are
   * registered (`services/pdf.ts`), so an 800 would silently resolve to this while
   * implying a heavier face exists.
   */
  name: { fontSize: 27, fontWeight: 700, lineHeight: 1.15, color: c.text },
  /**
   * ⚠️ The source sets this in caps and that is deliberately NOT copied.
   * `textTransform` may only be spent on strings the APP owns — section titles,
   * field labels — never on what the user typed. See the timeline template's
   * `name` for the two failures the rule comes from.
   */
  headline: {
    fontSize: 9,
    fontWeight: 400,
    letterSpacing: 0.6,
    color: c.muted,
    marginTop: 6,
  },
  contactLine: { fontSize: 9, color: c.faint, marginTop: 5 },

  /* ── sections ─────────────────────────────────────────────────────────── */

  section: { display: 'flex', flexDirection: 'column' },
  /** Heading + first block, kept on one page (see `KEEP_TOGETHER`). */
  keepTogether: { display: 'flex', flexDirection: 'column' },
  /**
   * Light, wide-tracked, muted uppercase — the whole hierarchy of the source
   * design lives in this one rule.
   */
  sectionTitle: {
    fontSize: 13,
    fontWeight: 400,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: c.muted,
    marginTop: 16,
    marginBottom: 8,
  },

  /* ── entries ──────────────────────────────────────────────────────────── */

  entry: { marginBottom: 12, display: 'flex', flexDirection: 'column' },
  entryTitle: { fontSize: 10.5, fontWeight: 700, color: c.text },
  /** Company, location, degree, faculty — user content, so no `textTransform`. */
  entrySub: {
    fontSize: 9,
    fontWeight: 400,
    letterSpacing: 0.3,
    color: c.muted,
    marginTop: 1,
  },
  entryDesc: { fontSize: 9.5, color: c.text, marginTop: 4 },
  paragraph: { fontSize: 9.5, color: c.text, margin: 0 },
  /** The date, in the gutter. `.cv-time-period` — the slash is the accent. */
  period: { fontSize: 8.5, color: c.faint, paddingTop: 2, lineHeight: 1.35 },
  slash: { fontSize: 8.5, fontWeight: 700, letterSpacing: 1.5, color: c.accentText },
  link: { fontSize: 9, color: c.accentText, textDecoration: 'none' },
  bulletList: { marginTop: 4, marginBottom: 0, paddingLeft: 0 },
  bulletItem: { fontSize: 9.5, color: c.text, marginBottom: 1 },

  /* ── skills: the `.progress` bar ──────────────────────────────────────── */

  skill: { marginBottom: 7 },
  skillName: { fontSize: 9.5, color: c.text, marginBottom: 3 },
  /** A ROW, not a block — see the modern template for why that matters in RTL. */
  barTrack: {
    width: '100%',
    height: 4,
    backgroundColor: c.track,
    borderRadius: 2,
    display: 'flex',
    flexDirection: 'row',
  },
  barFill: { height: 4, backgroundColor: c.accent, borderRadius: 2 },

  /* ── two-up blocks (`.row > .col-half`) ───────────────────────────────── */

  /**
   * `flexWrap` rather than the source's floated halves — floats are outside the
   * subset, and a wrapped row is what Yoga and CSS agree on. Two cells per line
   * comes from `half`'s 50% width, not from a column count.
   */
  wrapRow: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
  half: { width: '50%', paddingRight: 12, marginBottom: 4 },
  infoLabel: { fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 0.5, color: c.muted },
  infoValue: { fontSize: 9.5, color: c.text },
  languageName: { fontSize: 9.5, color: c.text },
  languageLevel: { fontSize: 8.5, color: c.muted },
  inlineList: { fontSize: 9.5, color: c.text },
};
