import { type JSX, useEffect } from 'react';
import { EVENTS, Joyride } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { LOCALES } from '../../app/i18n';
import { useResumeStore } from '../../state/store';
import { useResponsive } from '../../hooks/useResponsive';
import { BRAND_ACCESSIBLE } from '../../app/theme';
import { useTourStore } from './tour-store';
import { useTourSteps } from './steps';

/**
 * The tour engine (FR-20 / §10.5) — the only module that imports react-joyride's
 * runtime, so it is the only thing `TourMount` has to load lazily.
 *
 * Everything configured below is a decision rather than a default, and the ones
 * worth knowing are marked. In short: the tour EXPLAINS, it does not let you
 * operate the app through it, and it never ends by accident.
 */

/**
 * AntD's own text and mask colours, restated because Joyride is not an AntD
 * component and cannot read the theme's tokens. Kept as constants so the two
 * places that need them agree.
 */
const TEXT = 'rgba(0, 0, 0, 0.88)';
const TEXT_MUTED = 'rgba(0, 0, 0, 0.45)';
const MASK = 'rgba(0, 0, 0, 0.45)';
const RADIUS = 8;

/**
 * Above AntD's whole stacking range (drawers 1000, notifications 1010).
 *
 * The tour has to own the screen while it runs: it points at the editor's own
 * sticky bars, and the PWA update banner can appear on any tick without being
 * asked. Anything lower and the thing being pointed at could be covered by the
 * thing the tour is not talking about.
 */
const Z_INDEX = 1100;

export function TourGuide(): JSX.Element {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();
  const uiLocale = useResumeStore((s) => s.uiLocale);
  const steps = useTourSteps();
  const end = useTourStore((s) => s.end);
  const rtl = LOCALES[uiLocale].dir === 'rtl';

  /**
   * Start from the top of the page.
   *
   * The tour opens on the top bar, and the invitation can be answered after the
   * user has already scrolled — from there the first spotlight would be pointing
   * off screen at a bar that is only sticky, not fixed. Instant rather than
   * smooth: a tour that begins by animating the page is a tour that begins by
   * making the reader wait, and `prefers-reduced-motion` would have to be honoured
   * anyway (§10.2).
   */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /**
   * Escape ends the tour.
   *
   * Joyride's own `dismissKeyAction` is switched off below because none of its
   * three settings is "leave" — the closest, `'close'`, ADVANCES to the next step
   * in continuous mode, so pressing Escape to get out would walk the tour forward
   * instead. Handled here so the key does the one thing every overlay in the app
   * has taught the user it does.
   *
   * Capture phase, because the tooltip runs a focus trap and the keydown is
   * handled inside it.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') end();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [end]);

  return (
    <Joyride
      run
      // Walked with a Next button rather than one beacon per step: the point is a
      // guided sequence, and a screen sprinkled with pulsing dots is the version
      // of this feature that gets ignored like the button row did.
      continuous
      steps={steps}
      /**
       * Fires when the status becomes FINISHED or SKIPPED — so this one handler
       * covers reaching the end, pressing Skip, and Joyride running out of steps.
       * `end` records "seen" whichever way it happened, which is the whole
       * requirement: once through, never again.
       */
      onEvent={(data) => {
        if (data.type === EVENTS.TOUR_END) end();
      }}
      /**
       * Three of the four button labels are the app's own words, not new ones.
       *
       * The wizard's Back/Finish and the shared Close are already translated in
       * twenty languages with the register each bundle uses, and the user has
       * just been through the wizard — so the tour navigates with the same words
       * rather than four synonyms somebody has to keep in step. Only the progress
       * counter needs a key of its own, because it carries placeholders and
       * because where the count sits in the sentence is a language's decision
       * (the CJK bundles put it in full-width parentheses).
       */
      locale={{
        back: t('wizard.back'),
        // Joyride's "skip" is the way OUT, on every step — so it is the app's
        // word for closing an overlay, not for skipping something optional.
        skip: t('common.close'),
        last: t('wizard.finish'),
        // `{current}` / `{total}` are Joyride's own placeholders, substituted by
        // the tooltip rather than by i18next.
        nextWithProgress: t('tour.nav.progress'),
      }}
      options={{
        primaryColor: BRAND_ACCESSIBLE,
        backgroundColor: '#ffffff',
        arrowColor: '#ffffff',
        textColor: TEXT,
        overlayColor: MASK,
        zIndex: Z_INDEX,
        /**
         * A NUMBER, deliberately: Joyride shrinks a numeric width to
         * `innerWidth - 30` on a viewport narrower than it, and a CSS string
         * would opt out of that and overflow a 320px phone.
         */
        width: 380,
        spotlightPadding: 6,
        spotlightRadius: RADIUS,
        /**
         * Clears the sticky 64px header, plus a margin. The same lesson as the
         * guide pages' `scroll-margin-top`: a sticky bar paints over whatever an
         * anchor lands on, and the reader arrives looking at the middle of the
         * thing that was supposed to be highlighted.
         */
        scrollOffset: 96,
        showProgress: true,
        /**
         * ⚠️ NOT redundant with `continuous`, and leaving it out is a real bug
         * rather than a cosmetic one.
         *
         * Joyride hides the beacon in continuous mode only when the action that
         * moved the tour was `PREV`/`NEXT` — on the FIRST step the action is
         * `START`, so it shows a pulsing dot and waits for a second click, and it
         * hides the overlay while doing so. Measured in a real browser: after
         * "Start the tour" the screen showed a lone dot next to the Templates
         * button and nothing else, which is the same "what am I meant to look
         * at?" failure this whole feature exists to fix. The click on the
         * invitation IS the beacon.
         */
        skipBeacon: true,
        /**
         * The spotlight is a window, not a door. Leaving the target clickable
         * sounds generous — click Templates while the tour is telling you about
         * it — but it opens an AntD modal underneath an overlay that is
         * deliberately above AntD's whole z-index range, and the tour carries on
         * pointing at a button nobody can see any more. The buttons still work the
         * moment the tour is over.
         */
        blockTargetInteraction: true,
        /**
         * A stray click on the backdrop must not move the tour. Joyride's default
         * treats it as "close", which in continuous mode means ADVANCE — so
         * clicking beside the tooltip would skip the step you were reading.
         */
        overlayClickAction: false,
        /** See the Escape handler above for why this is off rather than set. */
        dismissKeyAction: false,
        // Back and a way out on every step, and no close cross: the cross's
        // action ('close') advances in continuous mode, which is not what a cross
        // means anywhere else in this app.
        buttons: ['back', 'skip', 'primary'],
      }}
      styles={{
        tooltip: {
          borderRadius: RADIUS,
          // Tighter on a phone: 16px each side of a ~290px box is a third of the
          // reading width.
          padding: isDesktop ? 16 : 12,
          fontSize: 14,
          boxShadow:
            '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
        },
        /**
         * `textAlign: 'start'`, overriding Joyride's centred default.
         *
         * Two sentences of centred prose is hard to read in any language, and
         * `start` is what makes it land against the correct edge in Arabic and
         * Hebrew without a second rule.
         */
        tooltipContainer: { textAlign: 'start', lineHeight: 1.6 },
        tooltipTitle: { fontSize: 16, fontWeight: 600, margin: 0 },
        tooltipContent: { padding: '8px 0 12px' },
        buttonPrimary: { borderRadius: RADIUS, padding: '6px 16px', fontSize: 14 },
        /**
         * Joyride positions the Back button with PHYSICAL margins
         * (`marginLeft: auto`, `marginRight: 5`), so in a right-to-left locale its
         * gap lands on the wrong side of the button. Swapped rather than replaced
         * with logical properties, because the defaults are deep-merged and a
         * physical value cannot be deleted from the merge — only overridden.
         */
        buttonBack: {
          borderRadius: RADIUS,
          padding: '6px 16px',
          fontSize: 14,
          color: TEXT,
          ...(rtl ? { marginLeft: 5, marginRight: 'auto' } : {}),
        },
        buttonSkip: { padding: '6px 8px', fontSize: 14, color: TEXT_MUTED },
      }}
    />
  );
}
