import { Grid } from 'antd';

/**
 * Responsive helper built on Ant Design's breakpoints (spec §10.3):
 * `≥ lg` → two-pane split; `< lg` → tabbed Edit/Preview + full-screen modals.
 */
export function useResponsive(): { isDesktop: boolean; isMobile: boolean } {
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  return { isDesktop, isMobile: !isDesktop };
}
