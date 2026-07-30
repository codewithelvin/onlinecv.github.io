# OnlineCV

A browser-only, **ATS-friendly** resume/CV builder. Create a clean CV entirely in your browser and export it as a real, text-based (machine-parseable) PDF — **no account, no backend, and no data ever leaves your device**.

Rebuild of `onlinecv.az` for the Azerbaijani job market. Trilingual UI (Azerbaijani / Russian / English), installable PWA, works offline.

## Highlights

- **100% client-side.** All resume data lives in **IndexedDB** (one resume per browser). The only network calls are optional analytics.
- **Live preview + text PDF export.** The in-browser preview is native HTML (fast, live); on **Download**, the same template HTML is converted to a real ATS PDF via `@react-pdf/renderer` + `react-pdf-html` (lazy-loaded — kept out of the initial bundle).
- **Three templates.** `classic` (ATS single-column, default), `compact` (dense, ATS-safe), `modern` (accent sidebar with avatar). Templates are **plug-ins** auto-discovered from `src/templates/` — add a folder, rebuild, done.
- **Trilingual.** UI locale (app chrome) and CV locale (exported headings) are independent.
- **Fully responsive PWA.** Phone → 4K, portrait + landscape; installable and offline-capable (incl. offline PDF export).

## Tech stack

React 18 · Vite 6 · TypeScript (strict) · Ant Design 5 · Zustand · React Hook Form + yup · dayjs · react-i18next · React Icons · `@react-pdf/renderer` + `react-pdf-html` · `vite-plugin-pwa` · `schema-dts` · `react-easy-crop`. Tests: Vitest + React Testing Library.

## Getting started

```bash
npm install
npm run dev        # start the dev server
```

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build (`dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test` | Vitest (run once) |

## Environment variables

Optional, injected at build time from repository secrets. When unset, analytics is simply not initialized.

| Variable | Purpose |
|----------|---------|
| `VITE_GA_MEASUREMENT_ID` | Google Analytics measurement id (`G-XXXXXXX`) |
| `VITE_CLARITY_PROJECT_ID` | Microsoft Clarity project id |

## Project structure

```
src/
  app/        # App root, providers, i18n, theme, SEO
  components/ # Presentational + form-field components
  data/       # Bundled dictionaries (JSON) + loader
  features/   # editor, wizard, avatar, templates picker, preview, export, i18n switch, reset
  hooks/      # responsive, online status, dictionary, debounce
  layouts/    # Editor + preview responsive layout
  pages/      # The single root page
  services/   # IndexedDB persistence, PDF export, analytics (side-effect boundaries)
  state/      # Zustand store (single source of truth)
  templates/  # Plug-in resume templates (_core contract + classic/modern/compact)
  test/       # Shared test setup + renderWithProviders
  types/      # Canonical data models
  utils/      # Pure helpers (date, id, dictionary, validation, yup resolver)
```

Adding a template = add a folder under `src/templates/<id>/` (`index.tsx`, `styles.ts`, `theme.ts`, `manifest.ts`, `thumbnail.png`). The core is never edited.

## Deployment

GitHub Actions → GitHub Pages (custom domain `onlinecv.az` via `public/CNAME`). On push to `main`, the workflow lints, type-checks, tests, builds, and deploys. One-time: repo **Settings → Pages → Source = GitHub Actions**.

### The `base` path

`vite.config.ts` currently sets `base: '/onlinecv.github.io/'`, because Pages still serves this as a **project** repo from a sub-path. Everything derives from that one constant (asset URLs, PWA scope/`start_url`/icons, the SW navigation fallback, the PDF font paths), so when `onlinecv.az` DNS is pointed at Pages, changing it to `'/'` moves the whole app.

Two consequences while the sub-path is in force:

- The dev and preview URLs carry it too — `http://localhost:5173/onlinecv.github.io/`, **not** `http://localhost:5173/`.
- **`robots.txt` and `sitemap.xml` are only served at the sub-path** (`…/onlinecv.github.io/robots.txt`). Crawlers only ever fetch `/robots.txt` at the origin root, so neither file has any effect until the app is on the domain root. Nothing to fix in the app — it is what a sub-path deployment means.

Separately, both files are excluded from the service worker's navigation fallback (`navigateFallbackDenylist` in `vite.config.ts`). Opening either is a navigation request, and without that exclusion the SW answered it with `index.html` — the file appeared not to load at all, because it had quietly become the app.

## License

[MIT](./LICENSE)
