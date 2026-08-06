/**
 * Banner template palette.
 *
 * The green is the one thing carried over from lduo/resume, whose accent is
 * `#109d59`. That exact value is NOT used: white text on it measures about 3.4:1,
 * which passes for the name and fails for everything smaller, and this design puts
 * the headline and the contact line on the coloured band too. `accent` is darkened
 * until white clears 4.5:1 on all of it — the same call already made for the brand
 * blue, and the reason `#1461c7` exists rather than `#1877F2`.
 */
export const bannerTheme = {
  /** The header band, section headings, entry rules. White text sits on this. */
  accent: '#0d7a45',
  /** Pill fill — the accent at a tint that keeps its text legible. */
  accentSoft: '#e7f2eb',
  /** Accent as TEXT on white (pills, links). */
  accentText: '#0a5f36',
  /** Rules and pill borders. */
  accentLine: '#bcdcc8',
  onAccent: '#ffffff',
  /** Muted text ON the band — white at ~80%, flattened so no alpha is needed. */
  onAccentMuted: '#cfe6d9',
  text: '#1f2933',
  muted: '#4a555f',
  faint: '#6b7680',
  heading: '#12181d',
};
