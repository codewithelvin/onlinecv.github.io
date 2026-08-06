import type { TemplateManifest } from '../_core/contract';
import { bannerTheme } from './theme';
import thumbnail from './thumbnail.jpg';

export const manifest: TemplateManifest = {
  id: 'banner',
  name: {
    az: 'Banner',
    ru: 'Баннер',
    en: 'Banner',
    ka: 'ბანერი',
    ar: 'لافتة',
    es: 'Banner',
    he: 'כרזה',
    ko: '배너',
    zh: '横幅',
    fr: 'Bandeau',
    de: 'Banner',
    it: 'Banner',
    tr: 'Afiş',
    pt: 'Faixa',
    pl: 'Baner',
    hu: 'Fejléc',
    el: 'Πανό',
    kk: 'Баннер',
    uz: 'Banner',
  },
  /** A photo and a filled header band — real text throughout, but not ATS shape. */
  atsSafe: false,
  accent: bannerTheme.accent,
  thumbnail,
  /**
   * Asymmetric on purpose. The band is the first thing in the flow and carries its
   * own padding, so the page needs only enough top margin to keep it off the paper
   * edge; the bottom is the normal breathing room.
   *
   * No `pageBleed`: the band is a flow element precisely BECAUSE a bleed layer
   * repeats on every page, and a masthead reprinted at the top of page 2 is not
   * what this design means.
   */
  pageMargin: { top: 22, bottom: 30 },
};
