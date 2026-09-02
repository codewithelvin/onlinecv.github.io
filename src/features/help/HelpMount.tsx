import { type JSX, Suspense, lazy, useEffect, useState } from 'react';
import { useHelpStore } from './help-store';

/**
 * Mounts the guide only once someone asks for it.
 *
 * TWO layers of laziness, doing different jobs. `React.lazy` keeps the panel's
 * component code out of the entry chunk; the `open` check below keeps it from
 * being requested at all until the first click, so a visitor who never opens the
 * guide never downloads a byte of it. (The copy itself is a third layer — see
 * `content/index.ts`.)
 *
 * `.then(m => ({ default: m.HelpPanel }))` rather than a default export, because
 * §27 asks for named exports and `React.lazy` insists on a default; the adapter is
 * one line and keeps the rule.
 *
 * No `Suspense` fallback: there is nothing on screen to replace — the panel is an
 * overlay, and a spinner in the corner of the page while its chunk arrives would
 * be a second loading state for the same click that already has one inside the
 * drawer.
 */
const HelpPanel = lazy(() => import('./HelpPanel').then((m) => ({ default: m.HelpPanel })));

export function HelpMount(): JSX.Element | null {
  const open = useHelpStore((s) => s.open);
  /**
   * A LATCH, not a mirror of `open`. Unmounting the panel the instant it closes
   * would take the drawer off screen with no slide-out — the component would be
   * gone before its own closing animation could run. So it is mounted on the first
   * open and then stays, which costs nothing (it renders a closed `Drawer`) and is
   * what makes closing look deliberate rather than like a crash.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <HelpPanel />
    </Suspense>
  );
}
