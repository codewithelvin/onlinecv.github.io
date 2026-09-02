import type { TemplateManifest } from '../_core/contract';
import thumbnail from './thumbnail.jpg';

export const manifest: TemplateManifest = {
  id: 'classic',
  name: {
    az: 'Klassik',
    en: 'Classic',
    ru: 'Классический',
    ka: 'კლასიკური',
    ar: 'كلاسيكي',
    es: 'Clásica',
    de: 'Klassisch',
    el: 'Κλασικό',
    fr: 'Classique',
    he: 'קלאסי',
    hu: 'Klasszikus',
    it: 'Classico',
    ja: 'クラシック',
    kk: 'Классикалық',
    ko: '클래식',
    pl: 'Klasyczny',
    pt: 'Clássico',
    tr: 'Klasik',
    uz: 'Klassik',
    zh: '经典',
  },
  atsSafe: true,
  accent: '#1461c7',
  thumbnail,
  // The page's own top/bottom margin; the left/right 40 stays in `styles.page`.
  pageMargin: { top: 32, bottom: 32 },
};
