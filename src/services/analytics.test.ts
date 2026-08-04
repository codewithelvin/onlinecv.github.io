import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The analytics boundary (§20/§22, and one of the layers §21 names explicitly).
 *
 * `initAnalytics` latches on a module-level `initialized`, so every test imports
 * a FRESH module after stubbing the env — `vi.resetModules()` plus a dynamic
 * import, not a top-level one.
 */

const GA_ID = 'G-TESTID123';
const CLARITY_ID = 'testclarity';

type Win = Window & typeof globalThis;

async function loadAndInit(): Promise<void> {
  vi.resetModules();
  const mod = await import('./analytics');
  mod.initAnalytics();
}

function injectedSrcs(): string[] {
  return [...document.head.querySelectorAll('script')].map((s) => s.getAttribute('src') ?? '');
}

beforeEach(() => {
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  delete (window as Partial<Win>).dataLayer;
  delete (window as Partial<Win>).gtag;
  delete (window as Partial<Win>).clarity;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('initAnalytics', () => {
  it('initializes nothing when no ids are configured', async () => {
    // The real state of `npm run dev` and `vitest run`: the ids live in
    // `.env.production`, which neither mode loads.
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');

    await loadAndInit();

    expect(injectedSrcs()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
    expect(window.clarity).toBeUndefined();
  });

  it('treats a whitespace-only id as not configured', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '   ');
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');

    await loadAndInit();

    expect(injectedSrcs()).toHaveLength(0);
  });

  it('loads the gtag tag for the configured measurement id', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', GA_ID);
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');

    await loadAndInit();

    expect(injectedSrcs()).toEqual([`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`]);
    expect(document.head.querySelector('script')?.async).toBe(true);
  });

  it('queues the js and config commands on the dataLayer', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', GA_ID);
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');

    await loadAndInit();

    const entries = (window.dataLayer ?? []) as IArguments[];
    expect(entries).toHaveLength(2);
    expect([...entries[0]][0]).toBe('js');
    expect([...entries[0]][1]).toBeInstanceOf(Date);
    expect([...entries[1]]).toEqual(['config', GA_ID]);
  });

  /**
   * The regression guard for a bug that made GA record NOTHING while looking
   * perfectly healthy in the network tab.
   *
   * gtag.js decides an entry is a command with
   * `toString.call(x) === '[object Arguments]' || hasOwnProperty(x, 'callee')`,
   * and its dataLayer loop tests `Array.isArray` FIRST — so pushing a rest array
   * lands in the unrelated `["some.global.fn", ...args]` branch, whose failed
   * lookup is swallowed by an empty `catch`. `js`/`config` then vanish silently.
   */
  it('pushes Arguments objects, not arrays, so gtag.js reads them as commands', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', GA_ID);
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');

    await loadAndInit();

    for (const entry of window.dataLayer ?? []) {
      expect(Array.isArray(entry)).toBe(false);
      expect(Object.prototype.toString.call(entry)).toBe('[object Arguments]');
    }
  });

  it('loads the Clarity tag and installs its queueing stub', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', CLARITY_ID);

    await loadAndInit();

    expect(injectedSrcs()).toEqual([`https://www.clarity.ms/tag/${CLARITY_ID}`]);
    expect(typeof window.clarity).toBe('function');

    // Calls made before the tag arrives are queued on `clarity.q`, which is what
    // the tag drains on load.
    window.clarity?.('set', 'key', 'value');
    expect(window.clarity?.q).toHaveLength(1);
  });

  it('loads both tags when both ids are configured', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', GA_ID);
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', CLARITY_ID);

    await loadAndInit();

    expect(injectedSrcs()).toEqual([
      `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
      `https://www.clarity.ms/tag/${CLARITY_ID}`,
    ]);
  });

  it('is idempotent, so React StrictMode double-invoking the effect loads one tag', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', GA_ID);
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', CLARITY_ID);

    vi.resetModules();
    const mod = await import('./analytics');
    mod.initAnalytics();
    mod.initAnalytics();
    mod.initAnalytics();

    expect(injectedSrcs()).toHaveLength(2);
    expect(window.dataLayer).toHaveLength(2);
  });

  it('never lets an analytics failure reach the app (§17)', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', GA_ID);
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', CLARITY_ID);
    vi.spyOn(document.head, 'appendChild').mockImplementation(() => {
      throw new Error('blocked by an extension');
    });

    await expect(loadAndInit()).resolves.toBeUndefined();
  });
});
