import type { TemplateManifest } from '../_core/contract';
import { minimalTheme } from './theme';
import thumbnail from './thumbnail.jpg';

export const manifest: TemplateManifest = {
  id: 'minimal',
  name: {
    az: 'Minimal',
    ru: 'Минимализм',
    en: 'Minimal',
    ka: 'მინიმალური',
    ar: 'بسيط',
    es: 'Minimalista',
    he: 'מינימלי',
    ko: '미니멀',
    zh: '简约',
    fr: 'Minimaliste',
    de: 'Minimalistisch',
    it: 'Minimalista',
    tr: 'Minimal',
    pt: 'Minimalista',
    pl: 'Minimalistyczny',
    hu: 'Minimalista',
    el: 'Μινιμαλιστικό',
    kk: 'Минималды',
    uz: 'Minimal',
  },
  /**
   * The margin column and the photo box put it outside the single-column,
   * image-free shape `atsSafe` promises, even though the page is otherwise plain
   * text with no fills behind it.
   */
  atsSafe: false,
  accent: minimalTheme.accent,
  thumbnail,
  /**
   * Generous, because white space is what this design spends instead of colour.
   * No `pageBleed`: nothing here reaches the paper edge — the gutter is margin,
   * not a filled column.
   */
  pageMargin: { top: 40, bottom: 36 },
};
