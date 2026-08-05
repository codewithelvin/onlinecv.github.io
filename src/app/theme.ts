import type { ThemeConfig } from 'antd';

/** Brand blue from the PWA manifest — used for decorative fills only. */
export const BRAND = '#1877F2';
/** AA-safe darker variant for text-bearing surfaces (spec §10.2 typography note). */
export const BRAND_ACCESSIBLE = '#1461c7';

/**
 * UI font stack. The script faces sit behind Inter for the same reason they do in
 * the CV stack (`templates/_core/fonts.ts`): Inter has no glyphs for Georgian,
 * Arabic, Hebrew, Hangul or Han, so without them those UIs fall through to whatever
 * the OS happens to have. Every `@font-face` block in `index.css` is
 * `unicode-range`-scoped, so nothing is downloaded for the Latin/Cyrillic locales —
 * which matters most for the two East Asian faces, the only ones big enough to
 * notice (`NotoSansSC` alone is 8 MB per weight).
 *
 * The two faces that also carry Latin — `NanumGothic` and `NotoSansSC` — are last
 * deliberately: leading with Inter keeps the UI's own letterforms identical in all
 * nine languages, and Hangul and Han reach their own face by per-glyph fallback
 * anyway.
 */
export const FONT_FAMILY =
  "Inter, NotoSansGeorgian, NotoSansArabic, NotoSansHebrew, NanumGothic, NotoSansSC, 'Segoe UI', Roboto, 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif";

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
    /**
     * 35px instead of antd's 32: inputs, selects, date pickers and buttons all
     * read better with the extra breathing room next to their labels. The
     * small/large steps are pinned rather than derived (antd would compute
     * 26.25 / 43.75) — `controlHeightSM` keeps the value the 32px default
     * produced, so the compact icon buttons don't grow, and 44 for large lines
     * up with the minimum touch target (spec §10.3).
     *
     * NOTE: this token also feeds `Input.TextArea`'s vertical padding, where a
     * taller box is pure waste (a textarea sizes itself from `rows`). The
     * padding is pinned back in `index.css` — see the `textarea.ant-input` rule.
     */
    controlHeight: 35,
    controlHeightSM: 24,
    controlHeightLG: 44,
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
    /**
     * Same problem again, in red: antd's `#ff4d4f` is 3.26:1 on white, so every
     * `danger` button's label ("Sıfırla", "Sil", "Şəkli sil") misses WCAG AA —
     * and so does white text on a filled one, which is what the reset
     * confirmation's OK button is. Antd's own red-7 clears AA at 5.6:1 and still
     * reads unmistakably as red. The rest of the error ramp (hover, active,
     * borders, backgrounds) is derived from this one value, so validation
     * messages and error borders move with it.
     */
    colorError: '#cf1322',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f5f5f5',
    },
    Form: {
      /**
       * Ant Design puts `0 0 8px` under a vertical label, which reads as a gap
       * rather than as a caption belonging to the control below it — the more so
       * in this editor, where nearly every field is a two-line label/control
       * pair and the accordion stacks a dozen of them. 2px keeps the label
       * visually attached to its own control.
       */
      verticalLabelPadding: '0 0 2px',
      /**
       * The matching outer rhythm. Antd's default is 24px, which after tightening
       * the label gap would leave the fields floating in their own whitespace and
       * push the CV form well past a phone screen. 16px still separates one field
       * from the next by more than a label sits from its control, so the pairing
       * stays unambiguous.
       */
      itemMarginBottom: 16,
    },
  },
};
