import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { localePages } from './vite-plugin-locale-pages';

/**
 * Public path the built app is served from. MUST match the real URL or every
 * asset 404s and the page renders as a bare `<title>` with no app.
 *
 * `codewithelvin/onlinecv.github.io` is a PROJECT repo (a `<name>.github.io`
 * repo only becomes a user site when `<name>` is the account name), so Pages
 * serves it from a sub-path — currently
 * `https://codewithelvin.com/onlinecv.github.io/`, because the `codewithelvin`
 * account has a user-level Pages domain.
 *
 * When `onlinecv.az` DNS is finally pointed at GitHub Pages and `public/CNAME`
 * takes effect, the app moves to the domain root: change this to `'/'` and
 * everything below follows.
 */
const BASE = '/onlinecv.github.io/';

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
         * The Korean PDF fonts are the ONLY assets kept out of the precache, and
         * the reason is arithmetic. `NanumGothic` is 4.1 MB across its two weights
         * — six times all three other script faces put together — against a
         * precache that is 6.9 MB in total, so precaching it would make every
         * install of the app well over half again as big, for a script most of its
         * users will never type. The Korean UI and PREVIEW are unaffected and work
         * offline from the first load: those draw the same face from the woff2 pair
         * in `fonts/woff2/` (758 KB), which stays precached with everything else.
         *
         * What it costs, stated plainly: the FIRST Korean PDF export needs the
         * network. `runtimeCaching` below then keeps the files, so every export
         * after it — offline included — is served from the cache.
         */
        globIgnores: ['**/NanumGothic-*.ttf'],
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
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
    /**
     * One static landing page per language (`/az/`, `/ru/`, …) plus the sitemap
     * and robots.txt. Last in the list, so it rewrites the HTML the other plugins
     * have already produced.
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
