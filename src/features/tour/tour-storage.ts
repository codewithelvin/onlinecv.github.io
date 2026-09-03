/**
 * Whether this browser has already been offered the editor tour.
 *
 * `localStorage`, like the install prompt's dismissal and the analytics decision
 * — and for the same reason: this is a property of the DEVICE, not of the CV. It
 * must survive BR-8 "reset CV", because someone starting a second CV in the same
 * browser has already been shown where the buttons are, and re-running the tour
 * on them would read as the app forgetting.
 *
 * Written when the tour ENDS, whichever way it ended: finished, skipped, or the
 * welcome modal declined. A dismissal is an answer — the alternative is asking on
 * every visit, which is the definition of nagging.
 *
 * Business logic on purpose (§27): the components render and read, this decides.
 */

const STORAGE_KEY = 'onlinecv-tour-seen';

/**
 * The answer when `localStorage` refused to keep it — and ONLY then.
 *
 * A private window can throw on storage access, and there the write is lost;
 * without this the welcome modal would reappear on the next render and offer the
 * tour in a loop. Holding it for the session is the most a browser that refuses
 * to remember anything can offer. Deliberately not a cache of a successful
 * write — storage stays the single source of truth, so clearing storage really
 * does bring the tour back.
 */
let sessionSeen = false;

/** True once this browser has been through — or has declined — the tour. */
export function hasSeenTour(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') return true;
  } catch {
    /* storage unavailable — fall back to this session's answer */
  }
  return sessionSeen;
}

/** Remember that the tour has been dealt with, so it is never offered again. */
export function rememberTourSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
    sessionSeen = false;
  } catch {
    sessionSeen = true;
  }
}
