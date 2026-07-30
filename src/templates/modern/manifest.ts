import type { TemplateManifest } from '../_core/contract';
import thumbnail from './thumbnail.png';

export const manifest: TemplateManifest = {
  id: 'modern',
  name: { az: 'Müasir', en: 'Modern', ru: 'Современный' },
  atsSafe: false,
  accent: '#1461c7',
  thumbnail,
  // The accent sidebar still bleeds to the paper edge: it cancels this margin
  // with negative vertical margins of its own (see `styles.sidebar`).
  pageMargin: { top: 28, bottom: 28 },
};
