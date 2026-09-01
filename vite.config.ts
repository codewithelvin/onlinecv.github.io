import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { localePages } from './vite-plugin-locale-pages';
// The service worker's navigation allowlist is the app's real route list, so it
// is derived from the same module that decides where each locale lives.
import { appRoutePattern } from './src/app/seo-locales';

/**
 * Public path the built app is served from. MUST match the real URL or every
 * asset 404s and the page renders as a bare `<title>` with no app.
 *
 * `'/'` since the cutover to the custom domain (2026-08-27). A Pages site with a
 * custom domain is served from the DOMAIN ROOT even though
 * `codewithelvin/onlinecv.github.io` is a PROJECT repo — the sub-path
 * (`https://codewithelvin.com/onlinecv.github.io/`) only applied while the repo
 * had no domain of its own, and once one is set GitHub 301s the sub-path to it.
 *
 * So this constant and the repo's **Settings → Pages → Custom domain** are ONE
 * decision made in two places: with the domain set and this at `'/onlinecv.github.io/'`
 * every asset 404s, and with the domain unset and this at `'/'` the same. Never
 * change one without the other.
 *
 * Everything else derives from it — asset URLs, the PWA `scope`/`start_url`/icon
 * paths, the service worker's navigation fallback, and the PDF font directory
 * (`import.meta.env.BASE_URL` in `services/pdf.ts`) — so this is the only edit
 * that moves the whole app.
 */
const BASE = '/';

/**
 * Vite configuration for OnlineCV.
 *
 * - `base` is `BASE` above; the PWA manifest/scope/icons are all derived from it
 *   rather than hard-coded to `/`, so one edit moves the whole app.
 * - PWA (§19.1): installable + offline app shell; Inter fonts precached so PDF
 *   export works offline. Manifest derived from `resources/manifest.json` with
 *   `orientation: 'any'` (§10.3) so the installed app rotates freely.
 * - The `@react-pdf/renderer` engine is code-split (lazy-loaded on Download, §19).
 */
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'fonts/ttf/Inter-Regular.ttf',
        'fonts/ttf/Inter-Medium.ttf',
        'fonts/ttf/Inter-SemiBold.ttf',
        'fonts/ttf/Inter-Bold.ttf',
        'fonts/woff2/Inter-Regular.woff2',
        'fonts/woff2/Inter-Medium.woff2',
        'fonts/woff2/Inter-SemiBold.woff2',
        'fonts/woff2/Inter-Bold.woff2',
      ],
      manifest: {
        name: 'OnlineCV',
        short_name: 'OnlineCV',
        description:
          'ATS-friendly resume/CV builder — build and export your CV entirely in your browser.',
        lang: 'az',
        dir: 'ltr',
        theme_color: '#1877F2',
        background_color: '#ffffff',
        start_url: BASE,
        scope: BASE,
        orientation: 'any',
        display: 'standalone',
        icons: [
          {
            src: `${BASE}pwa/maskable.png`,
            type: 'image/png',
            sizes: '512x512',
            purpose: 'maskable',
          },
          { src: `${BASE}pwa/logo48.png`, type: 'image/png', sizes: '48x48' },
          { src: `${BASE}pwa/logo72.png`, type: 'image/png', sizes: '72x72' },
          { src: `${BASE}pwa/logo96.png`, type: 'image/png', sizes: '96x96' },
          { src: `${BASE}pwa/logo128.png`, type: 'image/png', sizes: '128x128' },
          { src: `${BASE}pwa/logo192.png`, type: 'image/png', sizes: '192x192', purpose: 'any' },
          { src: `${BASE}pwa/logo256.png`, type: 'image/png', sizes: '256x256' },
          { src: `${BASE}pwa/logo384.png`, type: 'image/png', sizes: '384x384' },
          { src: `${BASE}pwa/logo512.png`, type: 'image/png', sizes: '512x512', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,json}'],
        /**
         * The three East Asian faces are the ONLY assets kept out of the precache,
         * and the reason is arithmetic every time.
         *
         * `NanumGothic` is 4.1 MB across its two weights — six times all three
         * other script faces put together — against a precache that is 6.9 MB in
         * total, so precaching it would make every install of the app well over
         * half again as big, for a script most of its users will never type. The
         * Korean UI and PREVIEW are unaffected and work offline from the first
         * load: those draw the same face from the woff2 pair in `fonts/woff2/`
         * (758 KB), which stays precached with everything else.
         *
         * `NotoSansSC` is 16.1 MB, more than twice the entire rest of the app, and
         * this one is stricter: Noto CJK publishes no woff2 or TTF, so the .otf is
         * what the preview loads as well (see `index.css`). Precaching it is simply
         * out of the question — it would quadruple every install — so BOTH targets
         * take it from the network on first use.
         *
         * `NotoSansJP` is 9.2 MB and takes the Chinese arrangement wholesale, for
         * the same reason (no woff2, no TTF) — it is simply the smaller of the two
         * Han faces, because Japanese needs 12,747 ideographs and not every
         * simplified form as well. Both are needed: the two draw the same code
         * points differently, so neither can stand in for the other (`_core/fonts`).
         *
         * What that costs, stated plainly: the first Korean PDF EXPORT needs the
         * network, and a Chinese or Japanese visitor's first page load fetches the
         * face before the UI is drawn in it (`font-display: swap` shows a system
         * Han face meanwhile). `runtimeCaching` below then keeps the files, so
         * everything after the first time — offline included — is served from the
         * cache.
         *
         * The `.otf` extension is also absent from `globPatterns` above, so these
         * would fall out of the precache even without this list. Named here anyway:
         * an omission is not a decision anyone can read.
         */
        globIgnores: ['**/NanumGothic-*.ttf', '**/NotoSansSC-*.otf', '**/NotoSansJP-*.otf'],
        runtimeCaching: [
          {
            // `registerResumeFonts` (services/pdf.ts) fetches these by URL at
            // export time, so a runtime handler is all it takes to make them
            // offline-safe once they have been fetched once. CacheFirst, because a
            // font file at a hashed-by-content path never changes.
            urlPattern: /\/fonts\/ttf\/NanumGothic-[A-Za-z]+\.ttf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'onlinecv-korean-pdf-fonts',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Same rule for Chinese, with one difference that matters: the BROWSER
            // requests these too (the `@font-face` in `index.css` points at the
            // same files), so this handler is what makes the Chinese UI and live
            // preview work offline after the first visit — not just the export.
            urlPattern: /\/fonts\/ttf\/NotoSansSC-[A-Za-z]+\.otf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'onlinecv-chinese-fonts',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Japanese — the Chinese rule again, browser-facing half included, and
            // a cache of its own so a visitor who reads one language never carries
            // the other's 9 MB around.
            urlPattern: /\/fonts\/ttf\/NotoSansJP-[A-Za-z]+\.otf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'onlinecv-japanese-fonts',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Must be base-qualified, or the offline fallback resolves to the domain
        // root and misses the app entirely.
        navigateFallback: `${BASE}index.html`,
        /**
         * Files that must be served as THEMSELVES, never as the app shell.
         *
         * Opening `robots.txt` or `sitemap.xml` is a NAVIGATION request, so
         * without this the service worker answers it out of `navigateFallback`
         * and hands back `index.html` — the file "doesn't load", it silently
         * becomes the app, and a crawler reads no directives at all. Workbox
         * tests these against `pathname + search`, so they hold under any `base`.
         */
        navigateFallbackDenylist: [/\/robots\.txt$/, /\/sitemap\.xml$/, /\/[^/?]+\.(?:txt|xml)$/],
        /**
         * The app's OWN routes, and nothing else — this is what makes a 404 a 404
         * for anyone who has visited before.
         *
         * Workbox's default allowlist is `[/./]`, i.e. the fallback answers EVERY
         * navigation. Combined with a single-route app that is precached in full,
         * that had one consequence and no benefit: every real route
         * (`/`, `/az`, `/az/`, `/az.html`) is already in the precache and is served
         * from there, so the only requests the fallback ever actually handled were
         * addresses the site does not have — which it turned into `index.html` with
         * a **200**. Every dead link from the old backend site (`/en/university/x`,
         * `/candidate/y`) therefore rendered the editor instead of an error for
         * every returning visitor, and `404.html` could never be reached at all.
         * (Crawlers were unaffected — they run no service worker, so they always
         * got the origin's real 404. The soft-200 was a browser-only illusion, and
         * the reason these URLs looked like live routes.)
         *
         * Derived from `SUPPORTED_LOCALES` so a new language cannot be forgotten
         * here, and base-qualified like everything else. Matched against
         * `pathname + search`, hence the optional query — an inbound
         * `/az?utm_source=…` is a real route and must still work offline.
         *
         * The denylist above is kept even though nothing it names could match this
         * allowlist: Workbox gives the denylist precedence, so it stays as the
         * guard that survives someone widening the allowlist later.
         */
        navigateFallbackAllowlist: [appRoutePattern(BASE)],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
    /**
     * One static landing page per language (`/az`, `/ru`, …) plus the sitemap
     * and robots.txt. Last in the list, so it rewrites the HTML the other plugins
     * have already produced.
     *
     * Emits each locale TWICE — `az.html` (the canonical `/az`, a real 200) and
     * `az/index.html` (compatibility, since Pages can author no redirect for the
     * `/az/` form already published). Both land in the precache, which is where
     * the extra ~20 entries in the build output come from.
     */
    localePages(),
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    /**
     * Vitest's default is 5s, which this suite genuinely outgrows: several tests
     * mount the WHOLE editor plus the live preview, and others render real PDFs
     * through `@react-pdf`. Alone they land in 1–3s, but when files compete for
     * cores they drift past 5s and fail on the clock rather than on an assertion
     * — a flake that has bitten `HomePage` and `EditorPanel` repeatedly and was
     * previously papered over by stating `30_000` on individual tests.
     *
     * Raised globally so the whole class is fixed rather than the two tests that
     * happened to cross the line most recently. It cannot mask a hang: a real
     * infinite loop still fails, just 30s later.
     */
    testTimeout: 30_000,
  },
});
