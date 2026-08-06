import type { TemplateManifest } from '../_core/contract';
import { timelineTheme } from './theme';
import thumbnail from './thumbnail.jpg';

export const manifest: TemplateManifest = {
  id: 'timeline',
  name: {
    az: 'Xronologiya',
    ru: 'Хронология',
    en: 'Timeline',
    ka: 'ქრონოლოგია',
    ar: 'الخط الزمني',
    es: 'Cronología',
    he: 'ציר זמן',
    ko: '타임라인',
    zh: '时间线',
    fr: 'Chronologie',
    de: 'Zeitstrahl',
    it: 'Cronologia',
    tr: 'Zaman çizelgesi',
    pt: 'Cronologia',
    pl: 'Oś czasu',
    hu: 'Idővonal',
    el: 'Χρονολόγιο',
    kk: 'Хронология',
    uz: 'Xronologiya',
  },
  /**
   * Two columns and a filled sidebar, so not the single-column, image-free shape
   * `atsSafe` promises — even though every word on it is real, selectable text
   * (there is no photo in this design at all). `classic` and `compact` remain the
   * ATS answer; this one is for a human reader.
   */
  atsSafe: false,
  accent: timelineTheme.accent,
  thumbnail,
  pageMargin: { top: 30, bottom: 30 },
  /**
   * The grey sidebar. Painted by core at page level in both targets so it reaches
   * the paper edges and repeats on page 2 — see `PageBleed`, and `styles.sidebar`,
   * whose width this MUST match (the template root carries no horizontal padding,
   * so 34% of the page is 34% of the root).
   *
   * `side: 'right'` is the source design's arrangement; `bleedSide` mirrors it for
   * a right-to-left CV, matching the `mirrorRow` applied to the template root.
   */
  pageBleed: { width: '34%', color: timelineTheme.sidebar, side: 'right' },
};
