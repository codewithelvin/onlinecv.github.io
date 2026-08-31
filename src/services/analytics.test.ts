import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The analytics boundary (§20/§22, and one of the layers §21 names explicitly).
 *
 * `initAnalytics` latches on a module-level `initialized`, so every test imports
 * a FRESH module after stubbing the env — `vi.resetModules()` plus a dynamic
 * import, not a top-level one.
 *
 * All three ids are stubbed in every case, including the ones being switched
 * off. Under vitest they read `undefined` anyway (the real values live in
 * `.env.production`, which this mode does not load), but naming each one is what
 * makes a test say which tags it expects rather than which it forgot.
 */

const GA_ID = 'G-TESTID123';
const CLARITY_ID = 'testclarity';
const METRICA_ID = '98765432';

const GA_TAG = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
const CLARITY_TAG = `https://www.clarity.ms/tag/${CLARITY_ID}`;
const METRICA_TAG = 'https://mc.yandex.ru/metrika/tag.js';

type Win = Window & typeof globalThis;

function stubIds({ ga = '', clarity = '', metrica = '' } = {}): void {
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', ga);
  vi.stubEnv('VITE_CLARITY_PROJECT_ID', clarity);
  vi.stubEnv('VITE_YANDEX_METRICA_ID', metrica);
}

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
  delete (window as Partial<Win>).ym;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('initAnalytics', () => {
  it('initializes nothing when no ids are configured', async () => {
    // The real state of `npm run dev` and `vitest run`: the ids live in
    // `.env.production`, which neither mode loads.
    stubIds();

    await loadAndInit();

    expect(injectedSrcs()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
    expect(window.clarity).toBeUndefined();
    expect(window.ym).toBeUndefined();
  });

  it('treats a whitespace-only id as not configured', async () => {
    stubIds({ ga: '   ', metrica: '  ' });

    await loadAndInit();

    expect(injectedSrcs()).toHaveLength(0);
  });

  it('loads the gtag tag for the configured measurement id', async () => {
    stubIds({ ga: GA_ID });

    await loadAndInit();

    expect(injectedSrcs()).toEqual([GA_TAG]);
    expect(document.head.querySelector('script')?.async).toBe(true);
  });

  it('queues the js and config commands on the dataLayer', async () => {
    stubIds({ ga: GA_ID });

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
    stubIds({ ga: GA_ID });

    await loadAndInit();

    for (const entry of window.dataLayer ?? []) {
      expect(Array.isArray(entry)).toBe(false);
      expect(Object.prototype.toString.call(entry)).toBe('[object Arguments]');
    }
  });

  it('loads the Clarity tag and installs its queueing stub', async () => {
    stubIds({ clarity: CLARITY_ID });

    await loadAndInit();

    expect(injectedSrcs()).toEqual([CLARITY_TAG]);
    expect(typeof window.clarity).toBe('function');

    // Calls made before the tag arrives are queued on `clarity.q`, which is what
    // the tag drains on load.
    window.clarity?.('set', 'key', 'value');
    expect(window.clarity?.q).toHaveLength(1);
  });

  it('loads the Metrica tag and installs its queueing stub', async () => {
    stubIds({ metrica: METRICA_ID });

    await loadAndInit();

    expect(injectedSrcs()).toEqual([METRICA_TAG]);
    expect(typeof window.ym).toBe('function');
    // `ym.l` is the load timestamp the tag reads back to time its own load —
    // `m[i].l = 1*new Date()` in Metrica's published snippet.
    expect(window.ym?.l).toBeGreaterThan(0);
  });

  /**
   * The `init` command, asserted option by option rather than as "it was called".
   *
   * `webvisor: true` is Session Replay, and it is the one setting here with a
   * privacy consequence: it is deliberately UNRESTRICTED (no `ym-hide-content`,
   * no `ym-disable-keys` anywhere in the app), so its replays include the CV as
   * it is typed. The consent drawer's copy says exactly that in all 20 locales,
   * and this assertion is what ties the two together — if the flag is ever
   * turned off, the copy is overstating what is collected and should follow.
   *
   * The id goes over as a NUMBER, which is how the tag indexes its counters.
   */
  it('queues the documented init options, Session Replay included', async () => {
    stubIds({ metrica: METRICA_ID });

    await loadAndInit();

    const queued = (window.ym?.a ?? []) as IArguments[];
    expect(queued).toHaveLength(1);

    const [id, command, options] = [...queued[0]];
    expect(id).toBe(Number(METRICA_ID));
    expect(command).toBe('init');
    expect(options).toEqual({
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
    });
  });

  /** Same wire format, same trap as gtag's — Metrica's tag drains Arguments too. */
  it('queues Metrica commands as Arguments objects', async () => {
    stubIds({ metrica: METRICA_ID });

    await loadAndInit();

    for (const entry of window.ym?.a ?? []) {
      expect(Array.isArray(entry)).toBe(false);
      expect(Object.prototype.toString.call(entry)).toBe('[object Arguments]');
    }
  });

  it('loads all three tags when all three ids are configured', async () => {
    stubIds({ ga: GA_ID, clarity: CLARITY_ID, metrica: METRICA_ID });

    await loadAndInit();

    expect(injectedSrcs()).toEqual([GA_TAG, CLARITY_TAG, METRICA_TAG]);
  });

  it('is idempotent, so React StrictMode double-invoking the effect loads one tag', async () => {
    stubIds({ ga: GA_ID, clarity: CLARITY_ID, metrica: METRICA_ID });

    vi.resetModules();
    const mod = await import('./analytics');
    mod.initAnalytics();
    mod.initAnalytics();
    mod.initAnalytics();

    expect(injectedSrcs()).toHaveLength(3);
    expect(window.dataLayer).toHaveLength(2);
    expect(window.ym?.a).toHaveLength(1);
  });

  it('never lets an analytics failure reach the app (§17)', async () => {
    stubIds({ ga: GA_ID, clarity: CLARITY_ID, metrica: METRICA_ID });
    vi.spyOn(document.head, 'appendChild').mockImplementation(() => {
      throw new Error('blocked by an extension');
    });

    await expect(loadAndInit()).resolves.toBeUndefined();
  });
});
