# Browser support — Firefox parity audit

Target: **the app behaves the same in Firefox (desktop + Android) as in Chromium.**

This is the source-level audit done on 2026-07-30: every browser API and CSS
feature the app relies on, checked against Gecko. Three real differences were
found and fixed; the rest are listed so nobody re-investigates them.

Automated cross-browser runs (Playwright + Firefox) are **not** wired up yet —
that needs a new dev dependency and is a separate decision (spec §27). Until
then, the manual pass at the bottom is the check before a release.

## Fixed (real Gecko/Blink differences)

| # | Symptom in Firefox | Cause | Fix |
|---|---|---|---|
| 1 | "PDF kimi endir" produces no file, or a 0-byte one | `URL.revokeObjectURL()` ran in the same tick as `a.click()`. Chromium copies the blob synchronously; Gecko starts the download asynchronously and then finds the URL already revoked | `services/pdf.ts` defers the revoke by 10s |
| 2 | Bottom action bar (with Download) sits below the fold on a phone until you scroll | `min-height: 100vh` is the *large* viewport in every mobile engine, and Firefox Android's collapsing toolbar makes it obvious | `.min-h-viewport` / `.preview-column` in `index.css` — `100dvh` with a `100vh` fallback |
| 3 | Risk of scrollbar gutters on Android where Chrome shows none | The custom scrollbar CSS set `scrollbar-width`/`scrollbar-color` on `*`. The `::-webkit-` half is inert on Gecko, but the standard half is **not**, and it can turn off Android's overlay scrollbars | The whole block is scoped to `@media (pointer: fine)` — the hover-reveal design is mouse-only anyway |

Plus one hardening that is not Firefox-specific: `text-size-adjust: 100%` on
`body`, because Gecko and Blink each reserve the right to inflate text in narrow
reflowed columns and don't agree on when.

## Audited — no difference, no action

- **CSS**: `overflow-x: clip` (FF 81+, and it does *not* create a scroll
  container, so the sticky header/preview survive), `scrollbar-gutter: stable`
  (97+), `overscroll-behavior: contain` (59+ — this is what stops the modal mask
  from chaining its scroll to the page on touch), `position: sticky` inside flex,
  `gap`, `inset`, `padding-block`, `:focus-within`, `env(safe-area-inset-*)`,
  `prefers-reduced-motion`. No `grid`, `:has()`, `backdrop-filter`, or
  `aspect-ratio` anywhere.
- **Scroll lock** (`hooks/useScrollLock`): sets `overflow: hidden` on
  `<html>`. Both engines propagate root overflow to the viewport and keep the
  scroll offset, so the header stays sticky and the page returns where it was.
- **IndexedDB** (`services/persistence.ts`): every call rejects into the
  memory-only fallback + `PersistenceBanner`, which is exactly what old Firefox
  private windows (< 115, where IDB `open` throws) need. FF 115+ gives an
  ephemeral in-memory IDB and the app behaves normally.
- **Canvas avatar pipeline** (`features/avatar/cropImage.ts`): `drawImage`,
  `rotate`, `toDataURL('image/jpeg', q)` — no `OffscreenCanvas`, no
  `createImageBitmap`, so nothing needs a fallback.
- **`crypto.randomUUID`** (`utils/id.ts`): already guarded, which also covers an
  insecure-origin (`http://<LAN-IP>`) test session where the API is absent.
- **`ResizeObserver`** (`A4Frame`), `matchMedia` (antd `useBreakpoint`),
  `navigator.onLine`, `\p{L}` regex escapes in the PDF filename, woff2 fonts,
  `<input type="file">` driven by a button `.click()`: supported since well
  before any browser this app targets.
- **`@react-pdf/renderer` + `react-pdf-html`**: pure JS/WASM-free path, fonts
  fetched over HTTP from `public/fonts/ttf`. Works the same in Gecko.

## Known, accepted, not bugs

- **PWA install**: Firefox **desktop** cannot install web apps at all, and
  Firefox Android offers "Add to Home screen" without the
  `beforeinstallprompt` API. The app ships no custom install button, so nothing
  breaks — installability is simply a Chromium/Safari feature here.
- **Service workers are disabled in Firefox Private Browsing** → no offline mode
  in a private window. `useRegisterSW` swallows the registration failure.
- **Scrollbar appearance** differs on desktop: Firefox honours
  `scrollbar-width: thin` + `scrollbar-color`, Chromium draws the 10px
  `::-webkit-scrollbar` pill. Same behaviour, slightly different look — there is
  no single API that covers both.

## Manual pass (until Playwright lands)

Run `npm run dev` and open the printed URL in Firefox. Desktop first, then
Firefox Android (or desktop RDM: `Ctrl+Shift+M`, a 390×844 device profile with
touch simulation on).

1. **Wizard**: both steps validate; gender/marital start empty and refuse to
   submit until chosen; finishing lands in the editor.
2. **Editor**: every section opens; inputs are 35px tall, textareas unchanged;
   labels focus their control when clicked.
3. **Modals**: open one and drag on the dark mask — the page behind must not
   scroll; closing returns you to the same scroll position.
4. **Avatar**: pick a large photo → cropper pans/zooms/rotates → saved avatar
   appears in the preview.
5. **Preview**: A4 page scales to the pane with no horizontal scrollbar; the
   dimmed "Made with www.onlinecv.az" line sits at the bottom; unchecking the box
   removes it.
6. **PDF**: Download produces a real file (this is fix #1 — verify the file
   opens and has content), text is selectable, the credit line is on the page,
   and the modern template's blue sidebar runs the full page height.
7. **Language**: switch AZ/RU/EN/KA — UI and dictionary-backed values re-label.
   In Georgian, check the CV preview AND the exported PDF actually draw the
   script: a missing `NotoSansGeorgian` shows up as blank space, not as tofu.
8. **Mobile layout**: Edit/Preview tabs, the bottom action bar is visible without
   scrolling, and the 44px row controls are comfortable.
9. **Reload**: everything persists (IndexedDB), including which sections were
   open.
