import { type JSX, type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import type { PageBleed, PageMargin } from '../../types/template';
import type { Locale } from '../../types/resume';
import { LOCALES } from '../../app/i18n/locales';
import { cvFontFamily } from '../../templates/_core/fonts';
import { bleedSide } from '../../templates/_core/direction';

/**
 * A4 portrait in POINTS — the unit `@react-pdf/renderer` actually lays the
 * exported page out in. Templates express their sizes as bare numbers (e.g.
 * `fontSize: 11`), which `react-pdf-html` reads as `11px` from the markup and
 * applies as 11pt in the PDF. Rendering the preview on a 595×842 canvas
 * therefore makes 1 CSS px === 1 PDF pt, so the preview breaks lines exactly
 * where the PDF does — and, being a smaller canvas, it is scaled UP to fill the
 * pane, which is what makes the text readable rather than shrunken.
 */
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

/** Don't blow the page up past this on very wide viewports. */
const MAX_SCALE = 2;

/**
 * Renders children on a fixed A4 portrait canvas and scales it to fit the
 * available width (spec §10.3: preview keeps A4 aspect, scales to fit, never
 * forces horizontal scroll). The exported PDF is always A4 regardless.
 */
export function A4Frame({
  children,
  footer,
  pageMargin,
  pageBleed,
  locale = 'az',
}: {
  children: ReactNode;
  /**
   * The CV's language (`resume.locale`), NOT the UI's. Drives the font order and
   * the writing direction of the sheet's content — the preview half of what
   * `buildResumeDocument` does for the export, so the two cannot drift.
   */
  locale?: Locale;
  /**
   * The selected template's per-page vertical margin. Applied to the canvas —
   * exactly as `services/pdf.ts` applies it to react-pdf's `Page` — so the
   * preview keeps matching the export.
   */
  pageMargin?: PageMargin;
  /**
   * The template's full-height accent column (`manifest.pageBleed`), painted by
   * the frame rather than by the template — see `PageBleed` for why.
   */
  pageBleed?: PageBleed;
  /**
   * Rendered inside the page, on top of it: the credit line positions itself
   * against the page box (see `attributionPreviewStyle`) so it never takes
   * height away from a template that fills the page.
   */
  footer?: ReactNode;
}): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(A4_HEIGHT);

  // Layout effect, not a passive one: measure and scale BEFORE the browser
  // paints, so a narrow viewport never briefly sees an unscaled 595px page.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const page = pageRef.current;
    if (!wrap || !page) return;
    const update = (): void => {
      setScale(Math.min(MAX_SCALE, wrap.clientWidth / A4_WIDTH));
      // Reserve room for content that runs past a single page, so a long CV
      // grows the scroll area instead of spilling over whatever follows.
      setContentHeight(Math.max(A4_HEIGHT, page.scrollHeight));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      /**
       * The whole frame is left-to-right, whatever the UI is set to — not just
       * the sheet inside it.
       *
       * Two reasons, and the second one is a layout bug rather than a nicety.
       * (1) The exported PDF inherits no page direction, so a preview that
       * mirrored under `<html dir="rtl">` (the Arabic UI) would stop showing what
       * the export produces. (2) The page is laid out at its full 595pt width and
       * scaled down with `transformOrigin: top left`; under RTL the browser
       * places that oversized box against the RIGHT edge of its parent, so it
       * overflowed to the left and the transform then pulled it further left,
       * out of the pane and under `overflow: hidden` — which is what "the preview
       * is shrunk in RTL" looked like. Scaling geometry and writing direction
       * have nothing to do with each other; this keeps them apart.
       */
      dir="ltr"
      style={{
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        justifyContent: 'center',
        // The scaled page can never widen the pane, even mid-measurement.
        overflow: 'hidden',
      }}
    >
      <div style={{ width: A4_WIDTH * scale, height: contentHeight * scale, flex: '0 0 auto' }}>
        <div
          ref={pageRef}
          /** Restated on the sheet itself: see the wrapper's `dir` above. */
          dir="ltr"
          style={{
            width: A4_WIDTH,
            minHeight: A4_HEIGHT,
            boxSizing: 'border-box',
            // Anchor for the credit line, which is positioned against the SHEET
            // (paper edge) exactly as react-pdf positions a `Page` child.
            position: 'relative',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            background: '#ffffff',
            boxShadow: '0 1px 8px rgba(0,0,0,0.12)',
            // Flex column so a template root that declares `flexGrow: 1` fills
            // the page height — that's what lets the modern template's accent
            // sidebar run to the bottom edge, matching the exported PDF where
            // the root is a direct child of react-pdf's (column) `Page`.
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/*
            The accent column, first so the content paints over it. Same box and
            same numbers as the PDF's page-level `fixed` View: it hugs the SHEET,
            not the margin-inset text area, so it reaches the paper edges. The
            text area below is `position: relative`, which keeps it above this
            layer — CSS paints positioned elements over in-flow ones regardless
            of source order, so both have to be positioned to respect the order.
          */}
          {pageBleed ? (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                // Mirrored for a right-to-left CV — the same rule the export
                // applies, from the same helper.
                [bleedSide(pageBleed, locale)]: 0,
                width: pageBleed.width,
                backgroundColor: pageBleed.color,
              }}
            />
          ) : null}
          {/*
            The text area, inset from the paper by the template's page margin.
            A MARGIN on this box rather than padding on the sheet, because both
            renderers resolve absolutely positioned children — the modern
            template's full-bleed accent column — against their container's box,
            and react-pdf uses the CONTENT box while CSS uses the PADDING box.
            Making the inset a margin removes padding from the equation, so one
            set of offsets means the same thing in the preview and in the PDF.
          */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 auto',
              display: 'flex',
              flexDirection: 'column',
              marginTop: pageMargin?.top ?? 0,
              marginBottom: pageMargin?.bottom ?? 0,
              /**
               * Font order and text alignment belong to the CV's language and are
               * set once, here, for every template — the mirror of what
               * `buildResumeDocument` puts on react-pdf's `Page`.
               *
               * ⚠️ `direction: 'rtl'` is deliberately NOT set, and this is load
               * bearing. CSS already reverses a flex `row` when `direction` is
               * rtl, so combined with the explicit `row-reverse` the templates
               * apply (`mirrorRow`) the preview mirrored TWICE and landed back in
               * left-to-right — the modern template's sidebar stayed on the left
               * while its accent column moved to the right, which is what "the
               * blue sidebar is totally broken in RTL" looked like. react-pdf has
               * no notion of `direction` at all, so it mirrored once and was
               * correct, and the two renderers disagreed.
               *
               * One mirroring, done explicitly, in both targets. `textAlign` is
               * safe to set because react-pdf inherits it too, so it means the
               * same thing on both sides.
               */
              fontFamily: cvFontFamily(locale),
              ...(LOCALES[locale].dir === 'rtl' ? { textAlign: 'right' as const } : {}),
            }}
          >
            {children}
          </div>
          {/* Outside the text area on purpose: the credit belongs to the sheet. */}
          {footer}
        </div>
      </div>
    </div>
  );
}
