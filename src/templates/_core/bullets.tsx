import type { CSSProperties, JSX } from 'react';
import type { Locale } from '../../types/resume';
import { isRtl } from './direction';

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
  locale = 'az',
}: {
  /** Bullet texts; an empty list renders nothing (BR-5). */
  items: string[];
  /** Template styling for the list box (spacing, indent). */
  listStyle?: CSSProperties;
  /** Template styling for one row — font size and colour live here so both the
   *  marker and the text inherit them, in CSS and in react-pdf alike. */
  itemStyle?: CSSProperties;
  markWidth?: number;
  /**
   * The CV's language (`resume.locale`); only its DIRECTION is used. In a
   * right-to-left CV the marker belongs to the right of its text and the list's
   * indent to the right of the block. Neither renderer arranges that on its own —
   * react-pdf has no logical properties and never sets Yoga's direction — so the
   * sides are chosen here, once, on behalf of every template.
   */
  locale?: Locale;
}): JSX.Element | null {
  if (items.length === 0) return null;
  const rtl = isRtl(locale);
  /**
   * A template's `paddingLeft` here means the INLINE-START indent. Left as-is in
   * a right-to-left CV it would indent from the far edge, leaving the markers
   * hanging outside the text block, so it moves across.
   */
  const { paddingLeft, ...restList } = listStyle ?? {};
  const indent =
    paddingLeft === undefined ? undefined : { [rtl ? 'paddingRight' : 'paddingLeft']: paddingLeft };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...restList, ...indent }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', ...itemStyle }}
        >
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
