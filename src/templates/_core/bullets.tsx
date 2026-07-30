import type { CSSProperties, JSX } from 'react';

/**
 * Achievement bullets, drawn as explicit flex rows — NOT as `<ul>`/`<li>`.
 *
 * Part of the core (spec §7.1): written once, shared by every template, so no
 * template can reintroduce the bug below.
 *
 * `react-pdf-html` renders an `<li>` as a row of two boxes, a marker box and a
 * content box. With `resetStyles` on — which `services/pdf.ts` needs, or the
 * library's own margins fight every template — it sets `li_bullet.display:
 * 'none'`. Yoga honours that and gives the marker box zero size at the row's
 * origin, but @react-pdf's PAINT pass has no notion of `display` and draws the
 * "•" anyway: at the row's origin, i.e. directly on top of the first characters
 * of the text. (Measured in `templates.pdf.test.tsx`: marker and text both at
 * x=56.0, y=630.3.) The browser preview hid it completely, since there the
 * marker is a real list marker sitting out in the padding.
 *
 * Two explicit boxes behave identically in CSS and in Yoga, so the preview and
 * the PDF indent the same and the marker can never land under the text.
 */

/** The marker glyph. Inter has it in every shipped weight. */
export const BULLET = '•';

/** Width of the marker column, in pt. Wide enough for the glyph plus its gap. */
const DEFAULT_MARK_WIDTH = 10;

export function BulletList({
  items,
  listStyle,
  itemStyle,
  markWidth = DEFAULT_MARK_WIDTH,
}: {
  /** Bullet texts; an empty list renders nothing (BR-5). */
  items: string[];
  /** Template styling for the list box (spacing, indent). */
  listStyle?: CSSProperties;
  /** Template styling for one row — font size and colour live here so both the
   *  marker and the text inherit them, in CSS and in react-pdf alike. */
  itemStyle?: CSSProperties;
  markWidth?: number;
}): JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...listStyle }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'row', ...itemStyle }}>
          <div style={{ width: markWidth, flexGrow: 0, flexShrink: 0 }}>{BULLET}</div>
          {/* `flexBasis: 0` + `minWidth: 0` so a long bullet wraps inside the
              row instead of widening it — the one place CSS and Yoga would
              otherwise disagree about a text flex item. */}
          <div style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }}>{item}</div>
        </div>
      ))}
    </div>
  );
}
