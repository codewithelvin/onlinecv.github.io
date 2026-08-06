import type { CSSProperties } from 'react';
import { bannerTheme as c } from './theme';

/**
 * Banner template styles (inline CSSProperties; spec §7.1 subset — flexbox only).
 */
export const styles: Record<string, CSSProperties> = {
  /**
   * No `fontFamily` — core orders the stack by the CV's language (see modern).
   * No horizontal padding either, on purpose: the header band below has to reach
   * both paper edges, so the padding lives on the band and on `body` instead.
   */
  page: {
    color: c.text,
    fontSize: 9.5,
    lineHeight: 1.45,
    display: 'flex',
    flexDirection: 'column',
  },

  /* ── the header band ──────────────────────────────────────────────────── */

  /**
   * A block in the FLOW, not a `pageBleed`. It reaches both side edges (the root
   * has no horizontal padding) but deliberately not the top one: `manifest.pageMargin`
   * insets it, and that is the correct trade — a bleed layer would repeat the band
   * on page 2, where a CV wants its content, not a second masthead.
   */
  band: {
    backgroundColor: c.accent,
    color: c.onAccent,
    padding: '14px 26px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 58, height: 58, borderRadius: 29, objectFit: 'cover' },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: c.accentText,
    color: c.onAccent,
    fontSize: 20,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** `flexBasis: 0` + `minWidth: 0` so a long name wraps instead of widening the row. */
  bandText: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  name: { fontSize: 20, fontWeight: 700, color: c.onAccent, lineHeight: 1.2 },
  /**
   * ⚠️ No `textTransform` — this is the user's own headline. See the timeline
   * template's `name` for what upper-casing user content breaks.
   */
  headline: {
    fontSize: 9.5,
    letterSpacing: 0.4,
    color: c.onAccentMuted,
    marginTop: 3,
  },
  bandContacts: { fontSize: 8.5, color: c.onAccentMuted, marginTop: 4, lineHeight: 1.4 },

  body: { padding: '14px 26px 0', display: 'flex', flexDirection: 'column' },

  /* ── sections ─────────────────────────────────────────────────────────── */

  section: { marginBottom: 11, display: 'flex', flexDirection: 'column' },
  /** Heading + first block, kept on one page (see `KEEP_TOGETHER`). */
  keepTogether: { display: 'flex', flexDirection: 'column' },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: c.accentText,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: c.accentLine,
    paddingBottom: 3,
    marginBottom: 7,
  },

  /* ── entries ──────────────────────────────────────────────────────────── */

  /**
   * The accent rule down the inline-start edge of each entry. Declared as a LEFT
   * border here and moved to the right by `index.tsx` for a right-to-left CV —
   * react-pdf has no logical border properties, so the side has to be chosen.
   */
  entry: {
    borderLeftWidth: 2,
    borderLeftStyle: 'solid',
    borderLeftColor: c.accentLine,
    paddingLeft: 9,
    marginBottom: 9,
    display: 'flex',
    flexDirection: 'column',
  },
  headRow: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' },
  entryTitle: { fontSize: 10.5, fontWeight: 600, color: c.heading, paddingRight: 8 },
  entryDate: { fontSize: 9, color: c.faint, flexGrow: 0, flexShrink: 0 },
  entrySub: { fontSize: 9, color: c.muted, marginTop: 1 },
  entryDesc: { fontSize: 9.5, color: c.muted, marginTop: 3 },
  paragraph: { fontSize: 9.5, color: c.text, margin: 0 },
  link: { fontSize: 9, color: c.accentText, textDecoration: 'none' },
  bulletList: { marginTop: 3, marginBottom: 0, paddingLeft: 0 },
  bulletItem: { fontSize: 9.5, color: c.muted, marginBottom: 1 },

  /* ── pills and pairs ──────────────────────────────────────────────────── */

  wrapRow: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
  /**
   * A skill / language / interest chip. The margin that separates chips is applied
   * by `index.tsx` on the reading-start side, so a right-to-left CV does not end up
   * with its gaps on the wrong edge of every chip.
   */
  pill: {
    backgroundColor: c.accentSoft,
    color: c.accentText,
    borderRadius: 8,
    padding: '2px 7px',
    marginBottom: 4,
    fontSize: 9,
  },
  half: {
    width: '50%',
    paddingRight: 12,
    marginBottom: 3,
    display: 'flex',
    flexDirection: 'column',
  },
  infoLabel: { fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 0.4, color: c.faint },
  infoValue: { fontSize: 9.5, color: c.text },
};
