import type { TemplateManifest } from '../_core/contract';
import thumbnail from './thumbnail.png';

export const manifest: TemplateManifest = {
  id: 'classic',
  name: { az: 'Klassik', en: 'Classic', ru: 'Классический' },
  atsSafe: true,
  accent: '#1461c7',
  thumbnail,
  // The page's own top/bottom margin; the left/right 40 stays in `styles.page`.
  pageMargin: { top: 32, bottom: 32 },
};
