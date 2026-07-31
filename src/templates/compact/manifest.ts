import type { TemplateManifest } from '../_core/contract';
import thumbnail from './thumbnail.jpg';

export const manifest: TemplateManifest = {
  id: 'compact',
  name: { az: 'Yığcam', en: 'Compact', ru: 'Компактный', ka: 'კომპაქტური' },
  atsSafe: true,
  accent: '#1461c7',
  thumbnail,
  // Tighter than classic — this template's job is to fit more on a page.
  pageMargin: { top: 24, bottom: 24 },
};
