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
    /**
     * Ant Design's default "description" grey is `rgba(0,0,0,0.45)` — `#8c8c8c`
     * on white, a 3.36:1 contrast ratio that fails WCAG AA (4.5:1) and is
     * flagged by Lighthouse/axe. It drives `Typography type="secondary"`, the
     * `Steps` titles, form `extra` hints and list subtitles — a lot of this UI.
     * `rgba(0,0,0,0.6)` (`#666`) reaches 5.7:1 while still reading as muted.
     */
    colorTextDescription: 'rgba(0, 0, 0, 0.6)',
    /** Same problem, one step lighter again; `#8c8c8c` gives 3.36:1. */
    colorTextPlaceholder: 'rgba(0, 0, 0, 0.55)',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f5f5f5',
    },
  },
};
