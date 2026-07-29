import type { ThemeConfig } from 'antd';

/** Brand blue from the PWA manifest — used for decorative fills only. */
export const BRAND = '#1877F2';
/** AA-safe darker variant for text-bearing surfaces (spec §10.2 typography note). */
export const BRAND_ACCESSIBLE = '#1461c7';

export const FONT_FAMILY =
  "Inter, 'Segoe UI', Roboto, 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif";

/**
 * Ant Design `ConfigProvider` theme (spec §10.2). Primary uses the AA-safe
 * `#1461c7` so white text on primary buttons meets WCAG AA; 8-pt grid; radius 8.
 */
export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: BRAND_ACCESSIBLE,
    colorLink: BRAND_ACCESSIBLE,
    colorInfo: BRAND_ACCESSIBLE,
    borderRadius: 8,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    colorBgLayout: '#f5f5f5',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f5f5f5',
    },
  },
};
