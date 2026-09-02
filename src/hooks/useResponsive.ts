import { Grid } from 'antd';

/**
 * Responsive helper built on Ant Design's breakpoints (spec §10.3):
 * `≥ lg` → two-pane split; `< lg` → tabbed Edit/Preview + full-screen modals.
 *
 * `isWide` (`≥ xl`, 1200px) is a THIRD state and it exists for one reason: the
 * editor header carries eight things, and between `lg` and `xl` there is room for
 * the two-pane LAYOUT but not for all of their labels. Measured at 1024px,
 * thirteen of the twenty locales wrapped that row — and a wrapped header does not
 * simply get taller, it spills OUT of itself (`Layout.Header` is a fixed 64px),
 * slicing the first row in half and floating the download button over the page.
 * So the two invitations (guide, community) drop their labels below `xl` while
 * the four working controls keep theirs.
 */
export function useResponsive(): { isDesktop: boolean; isMobile: boolean; isWide: boolean } {
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  return { isDesktop, isMobile: !isDesktop, isWide: Boolean(screens.xl) };
}
