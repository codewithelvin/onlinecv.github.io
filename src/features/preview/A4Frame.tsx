import { type JSX, type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import type { PageMargin } from '../../types/template';

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
}: {
  children: ReactNode;
  /**
   * The selected template's per-page vertical margin. Applied to the canvas —
   * exactly as `services/pdf.ts` applies it to react-pdf's `Page` — so the
   * preview keeps matching the export.
   */
  pageMargin?: PageMargin;
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
