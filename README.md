# OnlineCV

A browser-only, **ATS-friendly** resume/CV builder. Create a clean CV entirely in your browser and export it as a real, text-based (machine-parseable) PDF — **no account, no backend, and no data ever leaves your device**.

Rebuild of `onlinecv.az` for the Azerbaijani job market. Multilingual UI (Azerbaijani / Arabic / English / Spanish / Georgian / Korean / Russian / Hebrew), installable PWA, works offline.

## Highlights

- **100% client-side.** All resume data lives in **IndexedDB** (one resume per browser). The only network calls are optional analytics.
- **Live preview + text PDF export.** The in-browser preview is native HTML (fast, live); on **Download**, the same template HTML is converted to a real ATS PDF via `@react-pdf/renderer` + `react-pdf-html` (lazy-loaded — kept out of the initial bundle).
- **Three templates.** `classic` (ATS single-column, default), `compact` (dense, ATS-safe), `modern` (accent sidebar with avatar). Templates are **plug-ins** auto-discovered from `src/templates/` — add a folder, rebuild, done.
- **Multilingual — eight languages.** Azerbaijani (default), Arabic, English, Spanish, Georgian, Korean, Russian and Hebrew, every one of them exportable as the CV's own language; the UI locale (app chrome) and the CV locale (exported headings) are independent. Adding a language is additive — see [docs/adding-a-language.md](docs/adding-a-language.md).
- **Fully responsive PWA.** Phone → 4K, portrait + landscape; installable and offline-capable (incl. offline PDF export).

## Tech stack

React 18 · Vite 6 · TypeScript (strict) · Ant Design 5 · Zustand · React Hook Form + yup · dayjs · react-i18next · React Icons · `@react-pdf/renderer` + `react-pdf-html` · `vite-plugin-pwa` · `schema-dts` · `react-easy-crop`. Tests: Vitest + React Testing Library. Formatting: Prettier (`npm run format`).

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
| `npm run format` | Prettier — write |
| `npm run format:check` | Prettier — check only (CI runs this first) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test` | Vitest (run once) |

## Environment variables

Read at build time. When a value is unset (or blank), that integration is simply not initialized.

| Variable | Purpose |
|----------|---------|
| `VITE_GA_MEASUREMENT_ID` | Google Analytics measurement id (`G-XXXXXXX`) |
| `VITE_CLARITY_PROJECT_ID` | Microsoft Clarity project id |

Both live in the committed **`.env.production`**. They are public identifiers — a static site
ships them in its own bundle — so a repository secret would only have hidden them from
contributors, while an unset secret expanding to an empty string would have *silently* disabled
analytics (an inline `VITE_*` env var outranks every `.env` file in Vite).

The filename is the dev/prod gate, and it is why `services/analytics.ts` needs no `NODE_ENV`
check of its own: Vite loads `.env.production` for `npm run build` and `npm run preview`, but
**not** for `npm run dev` (mode=development) or `npm run test` (mode=test). Moving these ids
into plain `.env` would start reporting local development traffic as real users.

### Analytics and user data

Clarity records session replays, and the app promises the CV never leaves the device (§18/BR-3).
Clarity masks `<input>`/`<textarea>` values by default, but the live preview renders that same
data as ordinary DOM text — so anything displaying the user's own data must carry the
`CLARITY_MASK` attribute exported by `services/analytics.ts`. Currently that is the `A4Frame`
sheet (which covers every template, including any added later) and the avatar.

**Set the Clarity dashboard's masking mode to `Strict`.** One gap is not closable from here: Ant
Design renders a chosen `Select` value as TEXT (`.ant-select-selection-item`), not as an input
value, so it gets none of Clarity's default input masking. Measured on the built app with a
seeded CV, these four were readable outside any mask — `Kişi` (gender), `Subay` (marital
status), `Xidmət etmişəm` (military status), `Azərbaycan` (nationality) — and the same applies
to every other `Select`-backed pick (city, university, faculty, speciality, position). `Strict`
covers all of them at once, including selects added later, which per-element attributes would
not.

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

GitHub Actions → GitHub Pages (custom domain `onlinecv.az` via `public/CNAME`). On push to `main`, the workflow checks formatting, lints, type-checks, tests, builds, and deploys. One-time: repo **Settings → Pages → Source = GitHub Actions**.

### The `base` path

`vite.config.ts` currently sets `base: '/onlinecv.github.io/'`, because Pages still serves this as a **project** repo from a sub-path. Everything derives from that one constant (asset URLs, PWA scope/`start_url`/icons, the SW navigation fallback, the PDF font paths), so when `onlinecv.az` DNS is pointed at Pages, changing it to `'/'` moves the whole app.

Two consequences while the sub-path is in force:

- The dev and preview URLs carry it too — `http://localhost:5173/onlinecv.github.io/`, **not** `http://localhost:5173/`.
- **`robots.txt` and `sitemap.xml` are only served at the sub-path** (`…/onlinecv.github.io/robots.txt`). Crawlers only ever fetch `/robots.txt` at the origin root, so neither file has any effect until the app is on the domain root. Nothing to fix in the app — it is what a sub-path deployment means.

Separately, both files are excluded from the service worker's navigation fallback (`navigateFallbackDenylist` in `vite.config.ts`). Opening either is a navigation request, and without that exclusion the SW answered it with `index.html` — the file appeared not to load at all, because it had quietly become the app.

## License

[MIT](./LICENSE)
