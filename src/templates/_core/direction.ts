import type { CSSProperties } from 'react';
import type { Locale } from '../../types/resume';
import type { PageBleed } from '../../types/template';
import { LOCALES } from '../../app/i18n/locales';

/**
 * Writing direction for CV layout — core, because neither renderer gives it to
 * us for free.
 *
 * The TEXT half is already handled centrally: `services/pdf.ts` puts
 * `textAlign: 'right'` on the page (react-pdf inherits it) and `A4Frame` puts
 * `direction: rtl` on the preview sheet, so headings and paragraphs align
 * correctly in both targets without a template knowing.
 *
 * The BLOCK half cannot be done that way. `react-pdf` never calls Yoga's
 * `setDirection` — it only maps `flexDirection` — so there is no automatic
 * mirroring of rows and no support for logical properties like `inset-inline`.
 * A right-to-left CV therefore keeps its Latin arrangement (sidebar on the left,
 * dates on the right) unless the layout is mirrored explicitly, which is what
 * these helpers are for.
 */

/** Does this CV language read right to left? */
export function isRtl(locale: Locale): boolean {
  return LOCALES[locale].dir === 'rtl';
}

/**
 * A row style with its direction mirrored for a right-to-left CV.
 *
 * Applied by the template rather than by core, for one reason: the preview
 * renders the template's React elements directly while the export re-parses its
 * markup, so a flip made in the export path only would show up in the PDF and
 * not in the preview. Deriving it from `resume.locale` inside the template keeps
 * one source for both.
 *
 * A no-op on anything that is not a row, and on every left-to-right locale — so
 * it is safe to wrap a style unconditionally.
 */
export function mirrorRow(style: CSSProperties, locale: Locale): CSSProperties {
  if (!isRtl(locale)) return style;
  const { flexDirection } = style;
  if (flexDirection !== 'row' && flexDirection !== 'row-reverse') return style;
  return {
    ...style,
    flexDirection: flexDirection === 'row' ? 'row-reverse' : 'row',
  };
}

/**
 * A style whose `paddingRight` means "the gap on the side the date is on".
 *
 * The templates put an 8pt gap after an entry title so a long title cannot run
 * into the date beside it. In a right-to-left CV `mirrorRow` swaps the two, and
 * the gap has to swap with them or the title touches the date on one side and
 * floats away from it on the other — which is what a reviewer sees as "the dates
 * are wrong in Arabic". Logical properties would express this directly, but
 * react-pdf supports none.
 */
export function mirrorInlineEndPadding(style: CSSProperties, locale: Locale): CSSProperties {
  if (!isRtl(locale)) return style;
  const { paddingRight, ...rest } = style;
  if (paddingRight === undefined) return style;
  return { ...rest, paddingLeft: paddingRight };
}

/**
 * A style whose explicit `textAlign` means "toward the inline start/end", flipped
 * for a right-to-left CV.
 *
 * `services/pdf.ts` and `A4Frame` already set the DEFAULT alignment per direction,
 * so prose needs nothing. This is for the places a template overrides that default
 * — a date column right-aligned so it hugs the rail beside it, a gutter label
 * right-aligned against its content. `mirrorRow` moves that column to the other
 * side of the row, and an alignment left behind then points away from the thing it
 * was aligned to: the dates drift to the far paper edge and the rail they belonged
 * to is left bare. Same class of problem as `mirrorInlineEndPadding`, and the same
 * reason it cannot be expressed directly — react-pdf has no logical properties.
 */
export function mirrorTextAlign(style: CSSProperties, locale: Locale): CSSProperties {
  if (!isRtl(locale)) return style;
  const { textAlign } = style;
  if (textAlign === 'right') return { ...style, textAlign: 'left' };
  if (textAlign === 'left') return { ...style, textAlign: 'right' };
  return style;
}

/**
 * Which edge the accent column hugs, after mirroring.
 *
 * `manifest.pageBleed` states the LEFT-TO-RIGHT design; a right-to-left CV wants
 * the mirror image, so that the column ends up on the same side as the sidebar
 * once `mirrorRow` has flipped the template's root. Both renderers call this, so
 * the preview and the export cannot disagree about which side it is on.
 */
export function bleedSide(bleed: PageBleed, locale: Locale): 'left' | 'right' {
  const declared = bleed.side ?? 'left';
  if (!isRtl(locale)) return declared;
  return declared === 'left' ? 'right' : 'left';
}
