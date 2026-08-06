import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Analytics consent (§20/§22 against the §18/BR-3 promise).
 *
 * The claim under test is the one that matters legally and cannot be seen by
 * looking at the drawer: NOTHING is loaded before the user agrees. Both modules
 * latch on module-level state (`initialized` in analytics, the storage fallback
 * here), so every test imports a FRESH graph after stubbing the env — the same
 * `vi.resetModules()` + dynamic import pattern as `analytics.test.ts`.
 */

const GA_ID = 'G-TESTID123';
const CLARITY_ID = 'testclarity';
const STORAGE_KEY = 'onlinecv-analytics-consent';

type Win = Window & typeof globalThis;

function configured(): void {
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', GA_ID);
  vi.stubEnv('VITE_CLARITY_PROJECT_ID', CLARITY_ID);
}

function unconfigured(): void {
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
  vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');
}

async function loadConsent(): Promise<typeof import('./consent')> {
  vi.resetModules();
  return import('./consent');
}

function injectedSrcs(): string[] {
  return [...document.head.querySelectorAll('script')].map((s) => s.getAttribute('src') ?? '');
}

beforeEach(() => {
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  localStorage.clear();
  delete (window as Partial<Win>).dataLayer;
  delete (window as Partial<Win>).gtag;
  delete (window as Partial<Win>).clarity;
  delete (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('analytics consent', () => {
  it('loads nothing on a first visit, because nothing has been agreed to yet', async () => {
    configured();
    const consent = await loadConsent();

    consent.applyStoredConsent();

    expect(injectedSrcs()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
    expect(window.clarity).toBeUndefined();
    expect(consent.isConsentRequired()).toBe(true);
  });

  it('asks nothing in a build with no analytics ids', async () => {
    // `npm run dev`, `vitest`, or a fork that added no ids of its own: there is
    // nothing to collect, so a consent prompt would be noise, not diligence.
    unconfigured();
    const consent = await loadConsent();

    expect(consent.isConsentRequired()).toBe(false);
    expect(consent.isConsentReviewable()).toBe(false);
  });

  it('starts both tags the moment consent is granted, and remembers it', async () => {
    configured();
    const consent = await loadConsent();

    consent.setConsent('granted');

    expect(injectedSrcs()).toEqual([
      `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
      `https://www.clarity.ms/tag/${CLARITY_ID}`,
    ]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('granted');
    expect(consent.isConsentRequired()).toBe(false);
  });

  it('acts on a grant from an earlier visit without asking again', async () => {
    configured();
    localStorage.setItem(STORAGE_KEY, 'granted');
    const consent = await loadConsent();

    consent.applyStoredConsent();

    expect(injectedSrcs()).toHaveLength(2);
    expect(consent.isConsentRequired()).toBe(false);
  });

  it('loads nothing at all when the answer was no — on this visit or an earlier one', async () => {
    configured();
    const consent = await loadConsent();

    consent.setConsent('denied');
    expect(injectedSrcs()).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('denied');

    // And on the next visit, from storage.
    const reloaded = await loadConsent();
    reloaded.applyStoredConsent();
    expect(injectedSrcs()).toHaveLength(0);
    expect(reloaded.isConsentRequired()).toBe(false);
  });

  /**
   * Withdrawal after the fact. Neither vendor can be unloaded once its script is
   * running, so the two documented off switches are what "off" means here: gtag's
   * own `ga-disable-<ID>` flag, which it checks before every hit, and Clarity's
   * `stop` command. A reload is what makes it absolute, and the drawer says so.
   */
  it('flips the vendors’ own off switches when consent is withdrawn', async () => {
    configured();
    const consent = await loadConsent();

    consent.setConsent('granted');
    const queuedBefore = window.clarity?.q?.length ?? 0;

    consent.setConsent('denied');

    expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`]).toBe(true);
    const queued = (window.clarity?.q ?? []) as IArguments[];
    expect(queued).toHaveLength(queuedBefore + 1);
    expect([...queued[queued.length - 1]]).toEqual(['stop']);
  });

  it('treats a junk stored value as "not asked yet"', async () => {
    configured();
    localStorage.setItem(STORAGE_KEY, 'yes-please');
    const consent = await loadConsent();

    expect(consent.readConsent()).toBeNull();
    expect(consent.isConsentRequired()).toBe(true);
  });

  /**
   * A private window can throw on `localStorage`. The decision must still hold
   * for the session, or the drawer reappears on the next render and asks in a
   * loop — while the tags it just started keep running.
   */
  it('keeps the answer for the session when storage refuses to hold it', async () => {
    configured();
    const consent = await loadConsent();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    consent.setConsent('denied');

    expect(consent.readConsent()).toBe('denied');
    expect(consent.isConsentRequired()).toBe(false);
  });

  /**
   * The invariant a comment cannot enforce, and the one whose breach is silent:
   * put `initAnalytics()` back into the app root — where it used to live — and the
   * tags load for everyone before they have agreed to anything, with every other
   * test here still passing. So the source itself is the assertion.
   *
   * Read through Vite's own `import.meta.glob(…, '?raw')` rather than `node:fs`,
   * because `@types/node` is deliberately not a dependency (§27) — the same
   * mechanism the template registry uses. Comment lines are stripped first, since
   * both `analytics.ts` and `App.tsx` name the function in prose *precisely* to
   * warn about this.
   */
  it('is the only module in the app that can start analytics', () => {
    // Rooted at the project, not at this file: a file-relative pattern comes back
    // normalized to the shortest path (`./analytics.ts`), which would silently
    // stop matching the moment this test moved.
    const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

    const allowed = ['/src/services/analytics.ts', '/src/services/consent.ts'];
    const offenders = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && !allowed.includes(path))
      .filter(([, code]) =>
        code
          .split('\n')
          .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
          .join('\n')
          .includes('initAnalytics('),
      )
      .map(([path]) => path);

    // The glob has to have found the app, or this asserts nothing at all.
    expect(Object.keys(sources).length).toBeGreaterThan(50);
    expect(offenders, 'analytics may only be started through services/consent').toEqual([]);
  });

  it('lets the footer link ask the drawer to reopen, and stops on unsubscribe', async () => {
    configured();
    const consent = await loadConsent();
    const listener = vi.fn();

    const unsubscribe = consent.onConsentReview(listener);
    consent.requestConsentReview();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    consent.requestConsentReview();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
