import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Vite configuration for OnlineCV.
 *
 * - `base: '/'` because the app is served from the custom domain `onlinecv.az`
 *   (see spec §A2 deploy note). The bare `*.github.io` preview will 404 assets.
 * - PWA (§19.1): installable + offline app shell; Inter fonts precached so PDF
 *   export works offline. Manifest derived from `resources/manifest.json` with
 *   `orientation: 'any'` (§10.3) so the installed app rotates freely.
 * - The `@react-pdf/renderer` engine is code-split (lazy-loaded on Download, §19).
 */
export default defineConfig({
  base: '/',
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
        start_url: '/',
        scope: '/',
        orientation: 'any',
        display: 'standalone',
        icons: [
          { src: '/pwa/maskable.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
          { src: '/pwa/logo48.png', type: 'image/png', sizes: '48x48' },
          { src: '/pwa/logo72.png', type: 'image/png', sizes: '72x72' },
          { src: '/pwa/logo96.png', type: 'image/png', sizes: '96x96' },
          { src: '/pwa/logo128.png', type: 'image/png', sizes: '128x128' },
          { src: '/pwa/logo192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
          { src: '/pwa/logo256.png', type: 'image/png', sizes: '256x256' },
          { src: '/pwa/logo384.png', type: 'image/png', sizes: '384x384' },
          { src: '/pwa/logo512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
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
