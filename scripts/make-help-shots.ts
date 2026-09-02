/**
 * Regenerate the user guide's screenshots — ONE SET PER LANGUAGE, written to
 * `public/help-shots/<locale>/<shot>.webp` (spec §10.4, FR-19).
 *
 *   npm run build                                   # dist/ is the subject
 *   npx vite-node scripts/make-help-shots.ts               # all 20 languages
 *   npx vite-node scripts/make-help-shots.ts -- ja         # just these
 *   npx vite-node scripts/make-help-shots.ts -- --only=modal   # just these shots
 *
 * WHY IT DRIVES THE REAL APP. Every other generated image in this repo is
 * rendered from a string of HTML (`capture.ts`): a template, a social card, an
 * icon. A guide screenshot cannot be, because the thing being documented is the
 * Ant Design chrome around the CV — an accordion mid-scroll, a modal with a filled
 * form, a slider, a bottom action bar on a phone. Reconstructing those in static
 * markup would produce a picture of an app that does not exist, which is worse
 * than no picture: a reader compares it to their screen and concludes they are in
 * the wrong place. So this serves `dist/`, opens it in headless Edge, seeds a CV
 * into IndexedDB, clicks, and clips regions out of what the app actually drew.
 *
 * WHY ONE SET PER LANGUAGE. The reader who opens the guide is the reader who could
 * not understand the interface. Showing them a screenshot of a DIFFERENT
 * interface — in a language they do not read — documents nothing.
 *
 * THREE THINGS ABOUT HEADLESS EDGE, all previously learned the hard way here and
 * all still true (see `capture.ts`): `--window-size` is ignored, so the viewport
 * comes from `Emulation.setDeviceMetricsOverride`; the load event fires before
 * webfonts are applied; and `--virtual-time-budget` deadlocks anything touching
 * pdf.js. A fourth, specific to this script: NEVER seed IndexedDB from a page
 * running the app — its debounced autosave overwrites the seed a moment later.
 * `park()` below navigates to `/robots.txt` first, which is the same origin with
 * no JavaScript on it.
 */
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { SUPPORTED_LOCALES } from '../src/app/i18n/locales';
import { HELP_SHOT_SIZE } from '../src/features/help/shots';
import type { HelpShotId } from '../src/features/help/types';
import type { Locale } from '../src/types/resume';
import { fullResume } from '../src/test/fixtures/full-resume';
import { type Cdp, capture, sleep, withBrowser } from './capture';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'public/help-shots');
const PORT = 4318;
const ORIGIN = `http://127.0.0.1:${PORT}`;

/**
 * WebP at 82, and the number was chosen against the alternative rather than
 * guessed: the same nine shots as JPEG at a visually equal quality are roughly
 * twice the size, and there are ~180 of them. WebP also keeps the whole set out of
 * the PWA precache for free, because `globPatterns` in `vite.config.ts` has never
 * listed the extension.
 */
const FORMAT = 'webp';
const QUALITY = 82;

/** Desktop viewport. Tall on purpose — see `clipFor`. */
const DESKTOP = { width: 1400, height: 2400 };
/** Phone viewport, at a common modern size. */
const PHONE = { width: 400, height: 780 };

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Serve `dist/` the way GitHub Pages does.
 *
 * The resolution ORDER matters and is not the obvious one: an extensionless
 * request is tried against `<name>.html` BEFORE `<name>/index.html`. That is what
 * makes `/az` a real 200 instead of a redirect (see `seo-locales.ts`), and this
 * script has to reproduce it or every locale would be served the wrong file.
 *
 * ⚠️ The containment check compares RESOLVED paths with `sep`, not with a
 * hand-written `/`. A previous harness in this repo compared a Windows
 * backslashed path against a forward-slashed prefix, decided every file was
 * outside the root, and 404'd the entire app — which looks exactly like a broken
 * build.
 */
function serveDist(): { close: () => void } {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', ORIGIN);
    const raw = decodeURIComponent(url.pathname);
    const candidates =
      raw === '/'
        ? ['index.html']
        : [
            raw.replace(/^\//, ''),
            `${raw.replace(/^\//, '')}.html`,
            `${raw.replace(/^\//, '')}/index.html`,
          ];

    for (const candidate of candidates) {
      const file = resolve(DIST, normalize(candidate));
      if (file !== DIST && !file.startsWith(DIST + sep)) continue;
      if (!existsSync(file) || !statSync(file).isFile()) continue;
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      createReadStream(file).pipe(res);
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  });
  server.listen(PORT, '127.0.0.1');
  return { close: () => server.close() };
}

/** A thin, typed wrapper over the handful of CDP calls this script needs. */
function driver(cdp: Cdp) {
  const evaluate = async <T>(expression: string): Promise<T> => {
    const result = (await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })) as { result?: { value?: T }; exceptionDetails?: { text?: string } };
    if (result.exceptionDetails) {
      throw new Error(`evaluate failed: ${result.exceptionDetails.text ?? 'unknown'}`);
    }
    return result.result?.value as T;
  };

  const viewport = async (size: { width: number; height: number }): Promise<void> => {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      ...size,
      deviceScaleFactor: 1,
      mobile: false,
    });
  };

  const goto = async (path: string): Promise<void> => {
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: `${ORIGIN}${path}` });
    await loaded;
    await evaluate('document.fonts.ready.then(() => true)');
  };

  /** Poll until a selector matches, or give up loudly. */
  const waitFor = async (selector: string, timeoutMs = 15_000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (await evaluate<boolean>(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) {
        return;
      }
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${selector}`);
      await sleep(150);
    }
  };

  const click = async (selector: string): Promise<void> => {
    await waitFor(selector);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click(); true`);
  };

  /** The union of several elements' boxes, in viewport coordinates. */
  const boxOf = async (selectors: string[]): Promise<Box> => {
    const box = await evaluate<Box | null>(`(() => {
      const sels = ${JSON.stringify(selectors)};
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top);
        x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
      }
      return x1 === -Infinity ? null : { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    })()`);
    if (!box) throw new Error(`no element matched ${selectors.join(', ')}`);
    return box;
  };

  return { evaluate, viewport, goto, waitFor, click, boxOf };
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A fixed-size window centred on the element being documented.
 *
 * The size comes from `HELP_SHOT_SIZE`, which is also what the guide writes into
 * the image's `width`/`height` attributes — so clipping to anything else would
 * make the markup lie about the file and reintroduce the layout shift those
 * attributes exist to prevent. Centring rather than cropping from the top-left is
 * what absorbs the real variation here: the same panel is visibly wider in German
 * than in Chinese.
 *
 * Clamped into the viewport, and this is why `DESKTOP` is 2400px tall: with the
 * page scrolled to the origin, viewport coordinates and page coordinates are the
 * same numbers, so there is no way for the two readings of CDP's `clip` to
 * disagree. Nothing here ever needs to scroll.
 */
function clipFor(id: HelpShotId, anchor: Box, view: { width: number; height: number }): Box {
  const size = HELP_SHOT_SIZE[id];
  const centre = (start: number, span: number, want: number, limit: number): number =>
    Math.max(0, Math.min(limit - want, start + span / 2 - want / 2));
  return {
    x: centre(anchor.x, anchor.width, size.width, view.width),
    y: centre(anchor.y, anchor.height, size.height, view.height),
    ...size,
  };
}

/** The state a page must be put into before a shot, and what to point the camera at. */
interface ShotPlan {
  id: HelpShotId;
  /** Runs after the app has loaded; may click, open modals, etc. */
  prepare?: (d: ReturnType<typeof driver>) => Promise<void>;
  /** Elements the clip is centred on. */
  anchor: string[];
  /** Phone viewport instead of desktop. */
  phone?: boolean;
  /**
   * Render at exactly the shot's own width instead of the full desktop viewport.
   *
   * For a shot that documents a REGION — a modal, a section, the button row — a
   * narrower clip out of a wide window is right: the surroundings are context the
   * picture does not need. For one that documents the WHOLE SCREEN it is wrong,
   * and visibly so. `editor` is a 1180px window cut out of a 1400px viewport, so
   * it lost 110px from each side: the left edge took the form's field labels
   * (`Ad`, `Şəhər`, `CV-də göstər` all began mid-word) and the right edge took the
   * end of the button row. A picture of the two-pane layout that cuts off one of
   * the panes documents the wrong app.
   *
   * Setting the viewport to the capture size makes the clip the entire window, so
   * nothing can be outside it. Still ≥`lg`, so the layout stays two-pane.
   */
  fullWidth?: boolean;
  /**
   * Shorten the viewport from `DESKTOP`'s 2400px for this shot.
   *
   * ⚠️ The tall viewport is what makes page and viewport coordinates identical
   * (see `clipFor`) — and it also makes every `100vh` rule in the app resolve
   * against 2400px. `app-modal` caps a dialog at `calc(100vh - 64px)`, so at
   * 2400px it caps at 2336 and an item editor simply GROWS to its full form
   * height instead of scrolling. The 680px clip then landed in the middle of it:
   * no title, no Save button — under a caption that says "nothing is saved until
   * you press Save at the bottom of the window".
   *
   * A realistic height puts the cap back, which is not a workaround but the
   * honest picture: pinned title, pinned footer, scrolling body is exactly what
   * the app does on a real screen. Only needed by a shot whose subject sizes
   * itself against the viewport.
   */
  viewportHeight?: number;
  /** Start from an empty database (the wizard). */
  empty?: boolean;
}

/**
 * The nine shots, in the order the guide uses them.
 *
 * Each names the DOM ids the app has committed to (`FieldScope`, see
 * `EditorPanel`) rather than Ant Design class names wherever one exists — those
 * ids are a stated contract, and a class is an implementation detail of a
 * dependency. Where no id exists (a modal, the header, a collapse panel) the class
 * is unavoidable, and a missing element throws rather than producing a picture of
 * the wrong thing.
 */
const PLANS: ShotPlan[] = [
  { id: 'wizard', empty: true, anchor: ['.ant-card'] },
  { id: 'editor', fullWidth: true, anchor: ['.ant-layout-header', '#basics-firstName'] },
  {
    id: 'list',
    anchor: ['#experience-add'],
    prepare: async (d) => {
      await d.waitFor('#experience-add');
    },
  },
  {
    id: 'modal',
    // See `viewportHeight`: at 2400px the dialog's `max-height: 100vh - 64px`
    // never bites, so it grows past any clip that could hold it.
    viewportHeight: 900,
    anchor: ['.ant-modal'],
    prepare: async (d) => {
      await d.click('#experience-item-0-edit');
      await d.waitFor('.ant-modal #experience-position');
      // The dialog animates in; capturing mid-transition yields a translucent,
      // half-scaled panel that looks like a rendering fault.
      await sleep(500);
    },
  },
  { id: 'visibility', anchor: ['#generalInfo-gender', '#generalInfo-driverLicense'] },
  {
    id: 'photo',
    anchor: ['.ant-modal'],
    prepare: async (d) => {
      await d.waitFor('#avatar-file');
      await d.evaluate('window.__pickPhoto(); true');
      await d.waitFor('.ant-modal');
      await sleep(700);
    },
  },
  {
    id: 'templates',
    anchor: ['.ant-modal'],
    prepare: async (d) => {
      await d.click('#template-picker');
      await d.waitFor('#template-option-classic');
      await sleep(500);
    },
  },
  { id: 'actions', anchor: ['#template-picker', '#export-pdf'] },
  { id: 'mobile', phone: true, anchor: ['#editorTabs', '#action-bar'] },
];

/**
 * A stand-in photograph for the cropper shot.
 *
 * Generated rather than committed, and deliberately NOT square: the whole point of
 * the dialog is choosing which part of a rectangular picture becomes a square
 * portrait, and a source that is already square would document a control that
 * appears to do nothing.
 */
async function samplePhoto(path: string): Promise<void> {
  await capture(
    [
      {
        html: `<!doctype html><html><head><meta charset="utf-8"><style>
          html,body{margin:0;width:900px;height:1200px}
          body{background:linear-gradient(160deg,#cfe0f5 0%,#9dbbe0 55%,#7fa3cf 100%);
               display:flex;align-items:flex-end;justify-content:center}
          .head{width:300px;height:300px;border-radius:50%;background:#f2f5f9;margin-bottom:24px}
          .body{position:absolute;bottom:0;width:540px;height:330px;
                border-radius:270px 270px 0 0;background:#f2f5f9}
        </style></head><body><div class="body"></div><div class="head"></div></body></html>`,
        out: path,
        width: 900,
        height: 1200,
        format: 'jpeg',
        quality: 88,
      },
    ],
    () => {},
  );
}

/** Everything the app needs in storage before a screenshot. */
function seedScript(locale: Locale, empty: boolean): string {
  const resume = { ...fullResume(), locale };
  const state = { resume, uiLocale: locale, wizardCompleted: true, openSections: null };
  return `(async () => {
    /* Both are per-browser decisions the app stores outside the CV. Pre-answering
       them keeps the consent drawer and the install dialog out of every
       screenshot — neither is what the picture is documenting, and the install
       dialog in particular makes the page behind it inert. */
    localStorage.setItem('onlinecv-analytics-consent', 'denied');
    localStorage.setItem('onlinecv-install-dismissed', '1');
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('onlinecv', 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains('app')) r.result.createObjectStore('app');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('app', 'readwrite');
      const store = tx.objectStore('app');
      ${empty ? `store.delete('state');` : `store.put(${JSON.stringify(state)}, 'state');`}
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
    return true;
  })()`;
}

/**
 * Teach the page to open its own file picker.
 *
 * A hidden `<input type=file>` cannot be filled by clicking it, and CDP's
 * `DOM.setFileInputFiles` needs a node id this driver does not track. Assigning a
 * `DataTransfer` built from a fetched blob is the equivalent that works entirely
 * in page script — the app sees exactly the `change` event a real selection
 * produces.
 */
function installPhotoPicker(photoUrl: string): string {
  return `window.__pickPhoto = async () => {
    const res = await fetch(${JSON.stringify(photoUrl)});
    const blob = await res.blob();
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.querySelector('#avatar-file');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }; true`;
}

async function shootLocale(
  cdp: Cdp,
  locale: Locale,
  photoUrl: string,
  plans: ShotPlan[],
): Promise<void> {
  const d = driver(cdp);
  const dir = join(OUT, locale);
  mkdirSync(dir, { recursive: true });

  for (const plan of plans) {
    const view = plan.phone
      ? PHONE
      : {
          ...DESKTOP,
          ...(plan.fullWidth ? { width: HELP_SHOT_SIZE[plan.id].width } : {}),
          ...(plan.viewportHeight ? { height: plan.viewportHeight } : {}),
        };
    await d.viewport(view);

    // Park off the app before touching its database: the editor's debounced
    // autosave would otherwise write over the seed a few hundred milliseconds
    // after it lands. (`robots.txt` is same-origin and runs no script.)
    await d.goto('/robots.txt');
    await d.evaluate(seedScript(locale, plan.empty ?? false));

    await d.goto(`/${locale}`);
    await d.waitFor(plan.empty ? '#wizard-firstName' : '#basics-firstName');
    if (plan.id === 'photo') await d.evaluate(installPhotoPicker(photoUrl));
    // The preview is debounced and the dictionaries are lazy chunks; both have to
    // land before the app looks like itself.
    await sleep(1200);
    await d.evaluate('window.scrollTo(0, 0); true');
    if (plan.prepare) await plan.prepare(d);

    const clip = clipFor(plan.id, await d.boxOf(plan.anchor), view);
    const shot = (await cdp.send('Page.captureScreenshot', {
      format: FORMAT,
      quality: QUALITY,
      clip: { ...clip, scale: 1 },
      // Deliberately false: with the page at scroll origin and a viewport tall
      // enough to hold everything, page and viewport coordinates coincide — and
      // capturing beyond the viewport is known to remount the preview pane.
      captureBeyondViewport: false,
    })) as { data: string };

    const out = join(dir, `${plan.id}.${FORMAT}`);
    writeFileSync(out, Buffer.from(shot.data, 'base64'));
  }
  console.log(`✓ ${locale} (${plans.length} shot${plans.length === 1 ? '' : 's'})`);
}

async function main(): Promise<void> {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('dist/ is missing — run `npm run build` first');
  }
  const args = process.argv.slice(2);
  const wanted = args.filter((arg) => !arg.startsWith('-'));
  const locales = SUPPORTED_LOCALES.filter((l) => wanted.length === 0 || wanted.includes(l));
  if (locales.length === 0) throw new Error(`No such locale(s): ${wanted.join(', ')}`);

  /**
   * `--only=modal,editor` — re-capture some shots, in every language, without
   * redoing the rest.
   *
   * Worth the six lines: re-framing ONE shot otherwise costs 180 captures and
   * about forty minutes, which is enough friction to make "good enough" framing
   * tempting. Every shot is written to its own file, so a partial run leaves the
   * others exactly as they were.
   */
  const only = args
    .find((arg) => arg.startsWith('--only='))
    ?.slice('--only='.length)
    .split(',')
    .filter(Boolean);
  const plans = only ? PLANS.filter((p) => only.includes(p.id)) : PLANS;
  if (plans.length === 0) throw new Error(`No such shot(s): ${only?.join(', ')}`);

  mkdirSync(OUT, { recursive: true });
  /**
   * The stand-in photo goes into `dist/`, not `public/`, and that is not a
   * shortcut: a page served over http cannot fetch a `file://` URL, so the image
   * has to come from the same origin as the app. `dist/` is generated and
   * git-ignored, so a temporary file there ships nowhere — putting it in
   * `public/` would commit a fake portrait and then serve it to real visitors.
   */
  const photo = join(DIST, '__sample-photo.jpg');
  await samplePhoto(photo);

  const server = serveDist();
  try {
    await withBrowser(async ({ cdp }) => {
      for (const locale of locales) {
        await shootLocale(cdp, locale, `${ORIGIN}/__sample-photo.jpg`, plans);
      }
    });
  } finally {
    server.close();
    rmSync(photo, { force: true });
  }
}

await main();
