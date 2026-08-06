/**
 * Timeline template palette.
 *
 * Deliberately near-monochrome, because the source design is: mnjul/html-resume
 * carries its whole hierarchy in weight, case and spacing and spends no colour at
 * all (#444 body, #000 headings, #555 rules, #ccc decorator, #f2f2f2 sidebar).
 * The one addition is `accent`, and only because `manifest.accent` draws the
 * picker's selection ring — a graphite that reads as "this template has no colour"
 * rather than inventing one it never uses.
 */
export const timelineTheme = {
  accent: '#4b5563',
  /** The vertical decorator rule and the ring around each dot. */
  rail: '#c9ced6',
  /** The filled circle sitting on the rail at each entry. */
  dot: '#555b63',
  /** Sidebar fill — `manifest.pageBleed` paints it, not a style. */
  sidebar: '#f1f2f4',
  text: '#444444',
  heading: '#111111',
  sectionTitle: '#555555',
  muted: '#5c636b',
  faint: '#767d85',
};
