/**
 * Where modals are portalled.
 *
 * Every Ant Design modal in this app renders into `#modal-root` rather than
 * straight into `<body>`, because rc-portal only engages its body scroll-lock
 * when the portal container IS `document.body`:
 *
 *   useScrollLocker(autoLock && open && (container === default || container === document.body))
 *
 * That lock injects `html body { overflow-y: hidden }`, which has two nasty
 * side effects on this layout:
 *
 *  1. It turns `<body>` into a scroll container, so the desktop preview pane's
 *     `position: sticky` re-anchors to body's (unscrolled) scrollport and flies
 *     off-screen — the preview appears blank while a modal is open.
 *  2. Combined with a viewport-height body it clips the document, resetting the
 *     scroll position to the top so closing a modal dumps the user at the top
 *     of the page.
 *
 * Opting out via the public `getContainer` prop avoids both. The modal itself is
 * still `position: fixed`, so it looks and behaves identically; the only thing
 * given up is background scroll-locking behind the mask.
 */

const CONTAINER_ID = 'modal-root';

/**
 * The modal portal host, created on demand if `index.html` didn't provide it.
 * Falls back to `document.body` only when there is no DOM at all.
 */
export function getModalContainer(): HTMLElement {
  if (typeof document === 'undefined') return null as unknown as HTMLElement;
  const existing = document.getElementById(CONTAINER_ID);
  if (existing) return existing;
  const created = document.createElement('div');
  created.id = CONTAINER_ID;
  document.body.appendChild(created);
  return created;
}
