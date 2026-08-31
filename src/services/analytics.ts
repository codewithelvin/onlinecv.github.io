/**
 * Analytics boundary (spec §20/§22, BR-3). The ONLY permitted network calls.
 * Every integration is a no-op unless its `VITE_*` id is set at build time,
 * and all of them fail silently offline (§19.1).
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

/**
 * The queueing stub Yandex Metrica's tag drains once it loads.
 *
 * `a` is the queue (the same Arguments-object convention as gtag and Clarity);
 * `l` is the load timestamp the tag reads back to measure its own load time, and
 * the official snippet sets it as `m[i].l = 1*new Date()`.
 */
type MetricaQueue = {
  (...args: unknown[]): void;
  a?: unknown[];
  l?: number;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: ClarityQueue;
    ym?: MetricaQueue;
  }
}

let initialized = false;

/**
 * ⚠️ WEBVISOR IS DELIBERATELY UNRESTRICTED (user's decision, 2026-08-31).
 *
 * Yandex Metrica's Session Replay is the one recorder in this app that CAN show
 * what a user types, and it is switched on and left alone: no `ym-hide-content`
 * on the preview, no `ym-disable-keys` on the fields, nowhere in the app. Its
 * replays therefore include the CV as it is being written — names, contact
 * details, employment history — and that is the point of having it, after two
 * days spent establishing that Clarity can never do it.
 *
 * The masking that IS in place is Clarity's alone (`CLARITY_MASK`), and it stays
 * because it costs nothing: Clarity would mask the inputs regardless.
 *
 * What this obliges the rest of the app to do — the consent drawer's `consent.*`
 * strings say so in all 20 locales — is to stop claiming the CV is masked in the
 * replay, because it is not. The CV still never leaves the device as a FILE
 * (§18/BR-3: no upload, no backend, IndexedDB only), and nothing is recorded at
 * all until the user has agreed; what changed is that "agreed" now means agreed
 * to a recording that can contain their details.
 *
 * If this is ever reversed, the switches are Metrica's HTML-markup classes,
 * applied to an element and all its children: `ym-hide-content` ("Disables
 * recording of user interface elements" — text comes back blurred, images
 * greyed) and `ym-disable-keys` ("Disables recording the data entered in
 * fields"). They hold whatever the counter's *Record all fields* setting is, so
 * they would close the hole in code rather than on a dashboard. The natural
 * places are this module's `CLARITY_MASK` sites and `VerticalFields`.
 */

/**
 * Spread onto any element whose text is the USER'S OWN CV data.
 *
 * Clarity records session replays, and Clarity masks `<input>`/`<textarea>`
 * values by default — but the live preview renders the very same data as
 * ordinary DOM text, so without this the replay would ship the user's name,
 * phone, e-mail, date of birth and whole employment history to Microsoft. A
 * no-op when Clarity is not initialized.
 *
 * Applied to the rendered CV — the preview sheet (`A4Frame`) and the avatar.
 * Everything else that holds the user's data is a form control, which Clarity
 * masks on its own and cannot be told not to (see below).
 *
 * ⚠️ This is CLARITY'S mask and only Clarity's. It does not restrain Yandex
 * Metrica's Webvisor, which by decision records everything (see the note at the
 * top of this file) — so an element carrying it is hidden from one replay and
 * visible in the other. That asymmetry is intentional; do not "fix" it by adding
 * `ym-hide-content` here without changing the consent copy back.
 *
 * ⚠️ There is no `CLARITY_UNMASK` counterpart, and adding one back would be a
 * privacy regression for nothing. It existed between 2026-08-29 and 2026-08-31
 * to make replays show typed values instead of dots, and Clarity documents twice
 * over that this is impossible: *"Content in the input boxes is masked in all
 * modes and can't be customized"*, and drop-downs likewise — the FAQ's answer to
 * "Can I unmask input text boxes?" is that same sentence. Not a mode, not an
 * attribute, not a per-element rule on the dashboard. What `data-clarity-unmask`
 * DID reach was the ordinary text around the fields, which in the editor is the
 * item lists (employer, school, phone number, e-mail) — so it uploaded CV
 * content and still recorded not one keystroke. That question is now answered by
 * the other tag instead, which is what Metrica was added for.
 */
export const CLARITY_MASK = { 'data-clarity-mask': 'true' } as const;

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

function initMetrica(tagId: string): void {
  /**
   * Yandex Metrica, published as an inline snippet and reproduced here in
   * TypeScript for the same two reasons as Clarity's: no inline script (so a CSP
   * added later needs no exception), and a tag URL a test can assert instead of
   * one buried in a JS string. Three details of the snippet are load bearing:
   *
   *  - the queue takes `arguments`, not a rest array — the same wire format
   *    gtag.js brands on, and the same bug class that once made GA a silent
   *    no-op here;
   *  - `ym.l` is the load timestamp (`m[i].l = 1*new Date()` in the original);
   *    the tag reads it back to report its own load time;
   *  - the original also walks `document.scripts` to avoid inserting the tag
   *    twice. That is what `initialized` already does for all three vendors, so
   *    it is left out rather than duplicated.
   */
  const queue: MetricaQueue = function ym(): void {
    // eslint-disable-next-line prefer-rest-params -- parity with Metrica's own stub, which the tag drains as Arguments objects.
    (queue.a = queue.a ?? []).push(arguments);
  };
  queue.l = Date.now();
  window.ym = window.ym ?? queue;
  injectScript('https://mc.yandex.ru/metrika/tag.js');

  /**
   * The four options are Metrica's own documented `init` parameters, and the id
   * is passed as a NUMBER because that is what the tag indexes its counters by.
   *
   * `webvisor` is Session Replay, switched on and — by decision — unrestricted:
   * see the ⚠️ note at the top of this file for what that records and what it
   * obliges the consent copy to say.
   * `defer` is deliberately NOT set — that one is for SPAs that change route and
   * have to send each view by hand; this app is a single route (§13), so the
   * automatic hit at initialization is exactly right and a manual `hit` would
   * double-count.
   *
   * The published snippet also carries `referrer: document.referrer` and
   * `url: location.href`. Those are `hit` options, not `init` options — they are
   * in no version of Metrica's parameter list — and the tag reads both values
   * itself on the automatic hit, so they are dropped rather than copied along.
   */
  window.ym(Number(tagId), 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
  });
}

/**
 * The configured ids, trimmed — so a blank or whitespace-only value from CI
 * counts as "not set" rather than building a `gtag/js?id=` request that can
 * never resolve. Read at call time, not at module load, which is what lets a
 * test stub the env without resetting the module.
 */
function configuredIds(): { ga?: string; clarity?: string; metrica?: string } {
  return {
    ga: import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || undefined,
    clarity: import.meta.env.VITE_CLARITY_PROJECT_ID?.trim() || undefined,
    metrica: import.meta.env.VITE_YANDEX_METRICA_ID?.trim() || undefined,
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
  const { ga, clarity, metrica } = configuredIds();
  return Boolean(ga || clarity || metrica);
}

/** Initialize analytics once, if ids are configured. Safe to call in any environment. */
export function initAnalytics(): void {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;

  const { ga, clarity, metrica } = configuredIds();

  try {
    if (ga) initGoogleAnalytics(ga);
    if (clarity) initClarity(clarity);
    if (metrica) initMetrica(metrica);
  } catch {
    // Analytics must never break the app (§17).
  }
}

/**
 * Stop collecting, for consent WITHDRAWN after the tags were already loaded.
 *
 * No vendor can be unloaded once its script is running, so this uses the three
 * documented off switches instead of pretending otherwise:
 *
 *  - `window['ga-disable-<ID>'] = true` is gtag.js's own opt-out flag, checked
 *    before every hit — it is what Google's published opt-out snippet sets.
 *  - `clarity('stop')` stops the recorder and its upload queue.
 *  - `window['disableYaCounter<ID>'] = true` is Metrica's documented opt-out:
 *    *"disables cookies and prevents data on website sessions from being
 *    collected and sent"*.
 *
 * All three are best-effort by nature, which is why the drawer also says a
 * reload makes it absolute: on the next page load nothing is registered at all.
 * ⚠️ Metrica's flag leans on that reload harder than the other two, and the
 * difference is documented: gtag re-reads its flag before every hit, while
 * Metrica's is read when the tag INITIALIZES ("before initializing the Yandex
 * Metrica code snippet"). Setting it after the tag has started does not stop the
 * session already being recorded — the reload does, and the flag is what makes
 * the next load collect nothing.
 *
 * Also called for a stored `denied` on startup, where it costs nothing and stops
 * a stray `initAnalytics` from ever reporting a hit — for Metrica that is the
 * case where the flag does its full job, because it is then set before init.
 */
export function disableAnalytics(): void {
  if (typeof window === 'undefined') return;
  const { ga, clarity, metrica } = configuredIds();

  try {
    const flags = window as unknown as Record<string, boolean>;
    if (ga) flags[`ga-disable-${ga}`] = true;
    if (clarity) window.clarity?.('stop');
    if (metrica) flags[`disableYaCounter${metrica}`] = true;
  } catch {
    // Same rule as init: analytics must never break the app (§17).
  }
}
