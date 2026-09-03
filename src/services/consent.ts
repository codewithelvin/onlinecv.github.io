import { disableAnalytics, initAnalytics, isAnalyticsConfigured } from './analytics';

/**
 * Analytics consent (spec §20/§22 against the §18/BR-3 privacy promise).
 *
 * The app has no backend and the CV never leaves the device — but it does load
 * Google Analytics and Microsoft Clarity, and Clarity records session replays.
 * That is data collection by anyone's definition, and in the EU/UK/EEA (and
 * increasingly elsewhere) it needs consent BEFORE the tags load, not a notice
 * afterwards. So nothing analytics-related is initialized until this module says
 * so: `initAnalytics` is called from here and nowhere else.
 *
 * The decision is a property of the DEVICE, not of the CV, so it lives in
 * `localStorage` like the install prompt's — not in the IndexedDB record, which
 * BR-8 "reset CV" wipes. Asked exactly once per browser profile: a stored
 * decision, either way, is never re-asked.
 *
 * Business logic on purpose (§27): the drawer renders and reads, this decides.
 */

export type ConsentDecision = 'granted' | 'denied';

const STORAGE_KEY = 'onlinecv-analytics-consent';

/**
 * The answer when `localStorage` refused to keep it — and ONLY then.
 *
 * A private window can throw on storage access, and there the write is lost;
 * without this fallback the drawer would reappear on the next render and ask in
 * a loop. Holding it for the session is the most a browser that refuses to
 * remember anything can offer. It is deliberately not a cache of a successful
 * write: storage stays the single source of truth, so clearing storage really
 * does clear the decision.
 */
let sessionDecision: ConsentDecision | null = null;

/** Listeners waiting to be told the user wants to revisit the decision. */
const reviewListeners = new Set<() => void>();

/**
 * Listeners waiting to be told the question has been ANSWERED, either way.
 *
 * Separate from `reviewListeners` because they are opposites: that set is "the
 * user wants to be asked again", this one is "the user has just decided". It
 * exists because `isConsentRequired()` reads storage and is therefore not
 * reactive, and something else on a first visit has to wait its turn — see
 * `features/tour/TourMount`. Not a store, for the same reason the review set is
 * not one: this is a property of the device, and the app's store is persisted
 * alongside the resume.
 */
const decisionListeners = new Set<(decision: ConsentDecision) => void>();

function isDecision(value: unknown): value is ConsentDecision {
  return value === 'granted' || value === 'denied';
}

/** The stored decision, or `null` when the user has not been asked yet. */
export function readConsent(): ConsentDecision | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isDecision(stored)) return stored;
  } catch {
    /* storage unavailable — fall back to this session's answer */
  }
  return sessionDecision;
}

function applyConsent(decision: ConsentDecision): void {
  if (decision === 'granted') initAnalytics();
  else disableAnalytics();
}

/** Record a decision, remember it for this device, and act on it immediately. */
export function setConsent(decision: ConsentDecision): void {
  try {
    localStorage.setItem(STORAGE_KEY, decision);
    sessionDecision = null;
  } catch {
    sessionDecision = decision;
  }
  applyConsent(decision);
  // After the decision has been applied, so a listener that reads back
  // `readConsent()` sees the answer rather than the question.
  for (const listener of [...decisionListeners]) listener(decision);
}

/**
 * Subscribe to the analytics question being answered. Returns the unsubscribe
 * function.
 *
 * Fires on a fresh decision only — not on `applyStoredConsent`, which acts on an
 * answer given on an earlier visit and is not news to anybody.
 */
export function onConsentDecision(listener: (decision: ConsentDecision) => void): () => void {
  decisionListeners.add(listener);
  return () => {
    decisionListeners.delete(listener);
  };
}

/**
 * Act on a decision made on an earlier visit. Called once at startup, and it is
 * the ONLY thing that can start analytics without the user clicking: no stored
 * decision means no analytics and no network call.
 */
export function applyStoredConsent(): void {
  const decision = readConsent();
  if (decision) applyConsent(decision);
}

/** The user has not been asked yet, and this build has something to ask about. */
export function isConsentRequired(): boolean {
  return isAnalyticsConfigured() && readConsent() === null;
}

/**
 * Whether the consent UI is worth showing at all — false in a build with no
 * analytics ids, where there is nothing to consent to or withdraw.
 */
export function isConsentReviewable(): boolean {
  return isAnalyticsConfigured();
}

/**
 * Ask the drawer to reopen so the decision can be changed.
 *
 * Withdrawing consent has to be as easy as giving it, so the choice cannot be a
 * one-time prompt that disappears forever. A listener set rather than the Zustand
 * store because the store is persisted alongside the resume, and this is neither
 * resume data nor something a CV reset should touch.
 */
export function requestConsentReview(): void {
  for (const listener of [...reviewListeners]) listener();
}

/** Subscribe to review requests. Returns the unsubscribe function. */
export function onConsentReview(listener: () => void): () => void {
  reviewListeners.add(listener);
  return () => {
    reviewListeners.delete(listener);
  };
}
