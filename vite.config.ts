import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
        description: 'ATS-friendly resume/CV builder — build and export your CV entirely in your browser.',
        lang: 'az',
        dir: 'ltr',
        theme_color: '#1877F2',
        background_color: '#ffffff',
        start_url: BASE,
        scope: BASE,
        orientation: 'any',
        display: 'standalone',
        icons: [
          { src: `${BASE}pwa/maskable.png`, type: 'image/png', sizes: '512x512', purpose: 'maskable' },
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
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Must be base-qualified, or the offline fallback resolves to the domain
        // root and misses the app entirely.
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
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
  },
});
