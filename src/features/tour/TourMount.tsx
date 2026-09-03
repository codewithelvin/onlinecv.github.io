import { type JSX, Suspense, lazy, useEffect, useState } from 'react';
import { useResumeStore } from '../../state/store';
import { isConsentRequired, onConsentDecision } from '../../services/consent';
import { hasSeenTour } from './tour-storage';
import { useTourStore } from './tour-store';
import { TourWelcome } from './TourWelcome';

/**
 * Decides whether the editor tour is offered, and keeps the engine out of the
 * entry chunk until it is accepted (FR-20 / §10.5).
 *
 * The split is deliberately not the same as `HelpMount`'s. The invitation is a
 * plain AntD `Modal` and AntD is already in the bundle, so it is rendered
 * eagerly — lazily loading a dialog that first-time visitors are meant to see
 * would buy nothing and add a frame of nothing. react-joyride's runtime is the
 * part worth deferring: someone who declines never downloads it.
 *
 * `.then(m => ({ default: m.TourGuide }))` rather than a default export, because
 * §27 asks for named exports and `React.lazy` insists on a default.
 */
const TourGuide = lazy(() => import('./TourGuide').then((m) => ({ default: m.TourGuide })));

export function TourMount(): JSX.Element | null {
  const hydrated = useResumeStore((s) => s.hydrated);
  const wizardCompleted = useResumeStore((s) => s.wizardCompleted);
  const phase = useTourStore((s) => s.phase);
  const offer = useTourStore((s) => s.offer);

  /**
   * Whether the analytics question is still on screen.
   *
   * The tour must not be offered over it. The consent drawer is deliberately "a
   * notice, not a gate" — the app behind it stays usable — but it is the one thing
   * that must be answered on a first visit, and stacking a modal on top of it
   * turns two clear questions into one confusing screen.
   *
   * State plus a subscription rather than a bare `isConsentRequired()` call,
   * because that function reads `localStorage` and is not reactive: checked once
   * in an effect, a first-time visitor would be gated forever, and the tour — the
   * thing this whole feature exists for — would never appear for exactly the
   * people who need it.
   */
  const [consentPending, setConsentPending] = useState(isConsentRequired);
  useEffect(() => {
    if (!consentPending) return;
    return onConsentDecision(() => setConsentPending(false));
  }, [consentPending]);

  /**
   * The editor has to be the screen on show. Every target the tour points at is
   * in `EditorLayout`, so offering it over the first-run wizard would spotlight
   * nothing — and the wizard is the one screen a user must get through.
   */
  const ready = hydrated && wizardCompleted && !consentPending;

  useEffect(() => {
    if (!ready) return;
    if (hasSeenTour()) return;
    offer();
  }, [ready, offer]);

  /**
   * Fetch the engine while the invitation is being read, so accepting it starts
   * the tour instead of starting a download. It is a same-origin chunk that the
   * service worker precaches, so on a repeat visit this resolves from cache.
   */
  useEffect(() => {
    if (phase === 'welcome') void import('./TourGuide');
  }, [phase]);

  if (phase === 'welcome') return <TourWelcome />;
  if (phase === 'running') {
    // No fallback: there is nothing on screen to replace, and a spinner for a
    // chunk that is usually already cached would flash for one frame.
    return (
      <Suspense fallback={null}>
        <TourGuide />
      </Suspense>
    );
  }
  return null;
}
