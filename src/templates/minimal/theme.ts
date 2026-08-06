/**
 * Gutter template palette, from maitrenem/free-resume-theme (MIT).
 *
 * The source ships eight interchangeable accents and defaults to `#FAD300`
 * yellow. Teal is taken instead — one of its own eight — because the default is
 * unreadable as text on white (yellow on white is roughly 1.4:1) and this design
 * puts the accent on the date separator and the links, not only on fills.
 *
 * Two teals, deliberately. `accent` is the source's own `#00B19E` and is only ever
 * used where contrast does not apply — bar fills, bullet dots, rules. `accentText`
 * is darkened to clear 4.5:1 on white for the places the accent carries WORDS.
 * Same split, and the same reason, as the brand blue in `index.css`.
 */
export const minimalTheme = {
  accent: '#00b19e',
  accentText: '#00786b',
  text: '#0e252d',
  /** `$color-muted` — section headings and the small print live at this weight. */
  muted: '#8b9296',
  faint: '#6e767a',
  border: '#e7e9e9',
  /** `.progress` track: the source's `rgba(0,0,0,.05)` flattened onto white. */
  track: '#f1f2f2',
};
