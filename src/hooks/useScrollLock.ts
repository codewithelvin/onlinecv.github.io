import { useEffect } from 'react';

/**
 * Freeze background scrolling while a modal is open.
 *
 * Ant Design's own scroll-lock is opted out of (see `utils/modal-container`)
 * because it locks `<body>`, which turns body into a scroll container and breaks
 * the `position: sticky` header and preview pane. This locks the ROOT element
 * instead: CSS propagates overflow set on the root to the VIEWPORT, so `<html>`
 * itself never becomes a scroll container, sticky positioning keeps resolving
 * against the viewport, and the scroll offset is preserved on release.
 *
 * The companion half of the fix is CSS: `.ant-modal-wrap { overscroll-behavior:
 * contain }` in `index.css`, which stops a touch drag on the mask from chaining
 * its scroll to the document — the way the page leaked on mobile.
 *
 * Stacked modals share one lock via a counter, so the inner one closing does not
 * release the outer one's.
 */

let lockCount = 0;
let restoreOverflow = '';

function lockScroll(): void {
  if (typeof document === 'undefined') return;
  lockCount += 1;
  if (lockCount > 1) return;
  const root = document.documentElement;
  restoreOverflow = root.style.overflow;
  root.style.overflow = 'hidden';
}

function unlockScroll(): void {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  document.documentElement.style.overflow = restoreOverflow;
}

/** Lock background scrolling for as long as `active` is true. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    lockScroll();
    return unlockScroll;
  }, [active]);
}
