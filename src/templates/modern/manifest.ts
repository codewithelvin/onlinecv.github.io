import type { TemplateManifest } from '../_core/contract';
import { modernTheme } from './theme';
import thumbnail from './thumbnail.jpg';

export const manifest: TemplateManifest = {
  id: 'modern',
  name: { az: 'Müasir', en: 'Modern', ru: 'Современный', ka: 'თანამედროვე', ar: 'عصري' },
  atsSafe: false,
  accent: modernTheme.accent,
  thumbnail,
  pageMargin: { top: 28, bottom: 28 },
  /**
   * The accent column behind the sidebar. Core paints it at page level in both
   * targets, so it reaches the paper edges (escaping `pageMargin`) and repeats on
   * every page.
   *
   * The width MUST match `styles.sidebar`: the template root carries no
   * horizontal padding, so 34% of the page is 34% of the root.
   */
  pageBleed: { width: '34%', color: modernTheme.accent },
};
