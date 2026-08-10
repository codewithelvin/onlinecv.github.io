/**
 * Render HTML to an image file with headless Edge, over the DevTools Protocol.
 *
 * Shared by `make-thumbnails.ts` and `make-og-image.ts`. Node 24 has a global
 * `WebSocket`, so the CDP client below needs no dependency — which matters,
 * because spec §27 makes every added package a decision and a screenshot helper
 * is not worth one.
 *
 * Three things about headless Edge are worth knowing before changing this, all
 * learned the hard way in this repo:
 *
 *  - `--window-size` is IGNORED. The viewport comes from
 *    `Emulation.setDeviceMetricsOverride` or not at all.
 *  - `--screenshot` (the CLI flag) fires at the load event, which is before
 *    webfonts are applied — you get the page set in a fallback face. Hence the
 *    explicit `document.fonts.ready` wait below.
 *  - `--virtual-time-budget` deadlocks anything that touches pdf.js, so it is not
 *    used here even though it looks like the obvious way to wait.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const EDGE_CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const DEBUG_PORT = 9333;

export interface CaptureJob {
  /** A complete HTML document. */
  html: string;
  /** Absolute path of the image to write. */
  out: string;
  /** Viewport in CSS pixels — the region that ends up in the image. */
  width: number;
  height: number;
  /**
   * Device scale factor. The output is `width × scale` by `height × scale`
   * pixels, rendered at that density rather than resampled afterwards, so text
   * stays sharp.
   */
  scale?: number;
  format?: 'jpeg' | 'png';
  /** JPEG only. */
  quality?: number;
  /**
   * Capture the page's alpha channel instead of compositing it onto white.
   *
   * PNG only — a JPEG has no alpha, and Chromium silently gives you the white
   * again. Needed by `make-contact-icons.ts`, whose output has to sit on a
   * coloured band as well as on paper; everything else here wants the default
   * opaque sheet.
   */
  transparent?: boolean;
}

interface Cdp {
  send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  once: (event: string) => Promise<void>;
  close: () => void;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function connect(wsUrl: string): Promise<Cdp> {
  const ws = new WebSocket(wsUrl);
  await new Promise<void>((res, rej) => {
    ws.addEventListener('open', () => res(), { once: true });
    ws.addEventListener('error', () => rej(new Error(`cannot open ${wsUrl}`)), { once: true });
  });

  let nextId = 0;
  const pending = new Map<number, (msg: Record<string, unknown>) => void>();
  const waiters = new Map<string, Array<() => void>>();

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
    const id = msg.id as number | undefined;
    if (id !== undefined) {
      pending.get(id)?.(msg);
      pending.delete(id);
      return;
    }
    const method = msg.method as string;
    for (const resolve of waiters.get(method) ?? []) resolve();
    waiters.delete(method);
  });

  return {
    send: (method, params = {}) =>
      new Promise((res, rej) => {
        const id = (nextId += 1);
        pending.set(id, (msg) => {
          if (msg.error) rej(new Error(`${method}: ${JSON.stringify(msg.error)}`));
          else res((msg.result ?? {}) as Record<string, unknown>);
        });
        ws.send(JSON.stringify({ id, method, params }));
      }),
    once: (event) =>
      new Promise((res) => {
        waiters.set(event, [...(waiters.get(event) ?? []), () => res()]);
      }),
    close: () => ws.close(),
  };
}

/** Poll the DevTools endpoint until the browser is listening, then take its page. */
async function pageTarget(): Promise<string> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = (await res.json()) as Array<{ type: string; webSocketDebuggerUrl?: string }>;
      const page = targets.find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Not up yet.
    }
    await sleep(250);
  }
  throw new Error('Edge did not expose a DevTools page target');
}

/** Render every job in one browser session, writing each image to its `out` path. */
export async function capture(jobs: CaptureJob[], log = console.log): Promise<void> {
  const edgePath = EDGE_CANDIDATES.find((p) => existsSync(p));
  if (!edgePath) throw new Error(`Microsoft Edge not found (looked in ${EDGE_CANDIDATES[0]})`);

  const work = mkdtempSync(join(tmpdir(), 'onlinecv-capture-'));
  const files = jobs.map((job, i) => {
    const file = join(work, `page-${i}.html`);
    writeFileSync(file, job.html, 'utf8');
    return file;
  });

  const edge = spawn(
    edgePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--allow-file-access-from-files',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${join(work, 'profile')}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    const cdp = await connect(await pageTarget());
    await cdp.send('Page.enable');

    for (const [i, job] of jobs.entries()) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: job.width,
        height: job.height,
        deviceScaleFactor: job.scale ?? 1,
        mobile: false,
      });
      const loaded = cdp.once('Page.loadEventFired');
      await cdp.send('Page.navigate', { url: pathToFileURL(files[i]).href });
      await loaded;
      // The load event fires BEFORE webfonts are applied — see the header.
      await cdp.send('Runtime.evaluate', {
        expression: 'document.fonts.ready.then(() => true)',
        awaitPromise: true,
      });
      /**
       * The alpha channel is a per-page override and it does NOT reset itself,
       * so it is set on every job rather than once — a transparent job followed
       * by an opaque one would otherwise hand the second one a see-through
       * background.
       */
      await cdp.send('Emulation.setDefaultBackgroundColorOverride', {
        color: job.transparent
          ? { r: 0, g: 0, b: 0, a: 0 }
          : // Chromium's own default. Spelled out rather than cleared, because
            // `a: 0` on a previous job persists otherwise.
            { r: 255, g: 255, b: 255, a: 1 },
      });
      const shot = await cdp.send('Page.captureScreenshot', {
        format: job.format ?? 'jpeg',
        ...(job.format === 'png' ? {} : { quality: job.quality ?? 90 }),
      });
      writeFileSync(job.out, Buffer.from(shot.data as string, 'base64'));
      log(`✓ ${job.out}`);
    }
    cdp.close();
  } finally {
    edge.kill();
    await sleep(300);
    rmSync(work, { recursive: true, force: true });
  }
}
