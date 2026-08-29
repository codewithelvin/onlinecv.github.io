/**
 * Analytics boundary (spec §20/§22, BR-3). The ONLY permitted network calls.
 * Both integrations are no-ops unless their `VITE_*` id is set at build time,
 * and both fail silently offline (§19.1).
 *
 * Dev/prod gating is done by the ENV FILE, not by a check here: the ids live in
 * `.env.production`, which Vite loads for `vite build`/`vite preview` but not for
 * `npm run dev` or `vitest run`. So development and tests read `undefined` and
 * initialize nothing.
 *
 * ⚠️ `initAnalytics` has exactly ONE caller — `services/consent`. Nothing is
 * loaded until the user has agreed to it, so calling it from anywhere else would
 * start collecting without consent. This module deliberately knows nothing about
 * the decision itself (that would be an import cycle); it only offers the two
 * switches consent flips.
 */

/** The queueing stub Clarity's tag drains once it loads (`clarity.q`). */
type ClarityQueue = {
  (...args: unknown[]): void;
  q?: unknown[];
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: ClarityQueue;
  }
}

let initialized = false;

/**
 * Spread onto any element whose text is the USER'S OWN CV data.
 *
 * Clarity records session replays, and the app's promise — on the landing page
 * and in §18/BR-3 — is that the CV never leaves the device. Clarity masks
 * `<input>`/`<textarea>` values by default, but the live preview renders the very
 * same data as ordinary DOM text, so without this the replay would ship the
 * user's name, phone, e-mail, date of birth and whole employment history to
 * Microsoft. A no-op when Clarity is not initialized.
 *
 * Scope, since 2026-08-29: this is now the SHEET, not the form. The editor's
 * fields are deliberately recorded (see `CLARITY_UNMASK`); what stays masked is
 * the rendered CV — the preview page and the avatar — because that is one frame
 * holding the whole document rather than the keystroke being studied.
 */
export const CLARITY_MASK = { 'data-clarity-mask': 'true' } as const;

/**
 * Spread onto a container whose form fields SHOULD be recorded verbatim.
 *
 * Clarity masks `<input>`/`<textarea>` values by default (its `Balanced` mode),
 * so a replay showed every field as dots and could not answer the only question
 * worth recording one for: where does a person stall, retype, or give up. This
 * attribute switches that off for the subtree it sits on. Live on
 * `VerticalFields`, which is the single wrapper around every form field in the
 * app — the editor panel, all nine item modals and the first-run wizard — so a
 * field added later is covered without anyone remembering this file.
 *
 * Two things it depends on, both easy to break from outside the code:
 * - The dashboard's masking mode must NOT be `Strict`. Strict ignores unmask
 *   attributes entirely, and the replay goes back to dots with nothing in the
 *   repo to explain why. It is off by decision — see `journal/2026-08-04-analytics.md`.
 * - A `CLARITY_MASK` INSIDE this subtree still wins (nearest declaration does),
 *   which is what keeps the avatar out of replays while its own form records.
 *
 * This is a deliberate privacy trade, taken by the product owner on 2026-08-29:
 * the CV still never leaves the device as a FILE, but with consent granted the
 * typed values now reach Microsoft. The consent drawer (§20.1) is what makes it
 * a choice rather than a surprise.
 */
export const CLARITY_UNMASK = { 'data-clarity-unmask': 'true' } as const;

function injectScript(src: string, async = true): void {
  const el = document.createElement('script');
  el.async = async;
  el.src = src;
  document.head.appendChild(el);
}

function initGoogleAnalytics(measurementId: string): void {
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  window.dataLayer = window.dataLayer ?? [];

  /**
   * ⚠️ MUST push `arguments`, never a rest array — this is not a style choice.
   *
   * gtag.js brands a dataLayer entry as a COMMAND with
   * `toString.call(x) === '[object Arguments]' || hasOwnProperty(x, 'callee')`,
   * and its processing loop tests `Array.isArray` FIRST: a real array is read as
   * the unrelated `["some.global.fn", ...args]` form, where the failed lookup is
   * swallowed by an empty `catch`. A rest array therefore drops `js` and `config`
   * in complete silence — gtag.js loads, the network tab looks healthy, and not
   * one hit is ever recorded. (Verified against the live tag: the `IE()` command
   * predicate gates `config`/`event`/`js`/`get` behind that same brand check.)
   *
   * This is why the official snippet is `function gtag(){dataLayer.push(arguments)}`.
   */
  window.gtag = function gtag(): void {
    // eslint-disable-next-line prefer-rest-params -- an Arguments object is the wire format gtag.js brands on; a rest array is silently discarded. See above.
    window.dataLayer?.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId);
}

function initClarity(projectId: string): void {
  /**
   * Clarity's published snippet is an inline bootstrapper that queues calls made
   * before the tag arrives and then appends the tag. Both halves are done here in
   * TypeScript rather than as an injected `<script>` body: identical behaviour,
   * but no inline script — so it keeps working if a CSP is ever added, and the
   * tag URL is assertable in a test instead of being buried in a JS string.
   */
  const queue: ClarityQueue = function clarity(): void {
    // eslint-disable-next-line prefer-rest-params -- parity with Clarity's own stub, which the tag drains as Arguments objects.
    (queue.q = queue.q ?? []).push(arguments);
  };
  window.clarity = window.clarity ?? queue;
  injectScript(`https://www.clarity.ms/tag/${projectId}`);
}

/**
 * The configured ids, trimmed — so a blank or whitespace-only value from CI
 * counts as "not set" rather than building a `gtag/js?id=` request that can
 * never resolve. Read at call time, not at module load, which is what lets a
 * test stub the env without resetting the module.
 */
function configuredIds(): { ga?: string; clarity?: string } {
  return {
    ga: import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || undefined,
    clarity: import.meta.env.VITE_CLARITY_PROJECT_ID?.trim() || undefined,
  };
}

/**
 * Whether this build carries any analytics at all.
 *
 * `services/consent` gates the consent drawer on it: a build with no ids —
 * `npm run dev`, `vitest`, or a fork that did not add its own — collects
 * nothing, and asking permission to collect nothing is noise, not diligence.
 */
export function isAnalyticsConfigured(): boolean {
  const { ga, clarity } = configuredIds();
  return Boolean(ga || clarity);
}

/** Initialize analytics once, if ids are configured. Safe to call in any environment. */
export function initAnalytics(): void {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;

  const { ga, clarity } = configuredIds();

  try {
    if (ga) initGoogleAnalytics(ga);
    if (clarity) initClarity(clarity);
  } catch {
    // Analytics must never break the app (§17).
  }
}

/**
 * Stop collecting, for consent WITHDRAWN after the tags were already loaded.
 *
 * Neither vendor can be unloaded once its script is running, so this uses the
 * two documented off switches instead of pretending otherwise:
 *
 *  - `window['ga-disable-<ID>'] = true` is gtag.js's own opt-out flag, checked
 *    before every hit — it is what Google's published opt-out snippet sets.
 *  - `clarity('stop')` stops the recorder and its upload queue.
 *
 * Both are best-effort by nature, which is why the drawer also says a reload
 * makes it absolute: on the next page load nothing is registered at all. Also
 * called for a stored `denied` on startup, where it costs nothing and stops a
 * stray `initAnalytics` from ever reporting a hit.
 */
export function disableAnalytics(): void {
  if (typeof window === 'undefined') return;
  const { ga, clarity } = configuredIds();

  try {
    if (ga) (window as unknown as Record<string, boolean>)[`ga-disable-${ga}`] = true;
    if (clarity) window.clarity?.('stop');
  } catch {
    // Same rule as init: analytics must never break the app (§17).
  }
}
