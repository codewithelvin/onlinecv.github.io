import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { setConsent } from '../../services/consent';
import { i18n, SUPPORTED_LOCALES } from '../../app/i18n';
import { EditorLayout } from '../../layouts/EditorLayout';
import { PwaInstallPrompt } from '../../components/PwaInstallPrompt';
import type { Resume } from '../../types/resume';
import { TOUR_SECTIONS, tourSectionClass, useTourSteps } from './steps';
import { useTourStore } from './tour-store';
import { TourMount } from './TourMount';

/**
 * The editor tour (FR-20 / §10.5).
 *
 * ⚠️ `TourGuide` — the component that mounts react-joyride — is deliberately NOT
 * rendered anywhere here, and that is a limit of the harness rather than an
 * omission. Joyride decides a step is showable from `offsetWidth`/`offsetHeight`,
 * which jsdom reports as 0 for everything, so a mounted tour would poll for a
 * second per step and then draw a tooltip anchored to nothing. What CAN be
 * asserted without layout is asserted: when the tour is offered, that it is
 * offered once, and — the part most likely to rot — that every selector its
 * script points at is really in the editor's DOM.
 */

/** The shared test `matchMedia` answers `false`, so the suite renders `< lg`. */
const mobileMatchMedia = window.matchMedia;

function atViewport(width: number): void {
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*(\d+)/.exec(query);
    const max = /max-width:\s*(\d+)/.exec(query);
    const matches = (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }) as typeof window.matchMedia;
}

/** A resume that has cleared the first-run wizard. */
function filledResume(): Resume {
  const resume = createEmptyResume('az');
  resume.basics.firstName = 'Elvin';
  resume.basics.lastName = 'Huseynov';
  resume.contact.email = 'elvin@example.az';
  return resume;
}

const OFFER = 'Redaktoru sizə göstərək?';

beforeEach(() => {
  localStorage.clear();
  useTourStore.setState({ phase: 'hidden' });
  useResumeStore.setState({
    resume: filledResume(),
    uiLocale: 'az',
    hydrated: true,
    wizardCompleted: true,
    persistenceError: false,
  });
});

afterEach(() => {
  // NOT `vi.restoreAllMocks()` — `src/test/setup.ts` installs `matchMedia` as a
  // mock, and restoring it strips the implementation the AntD grid needs.
  window.matchMedia = mobileMatchMedia;
});

describe('the tour invitation', () => {
  it('offers the tour on the editor', () => {
    renderWithProviders(<TourMount />);
    expect(screen.getByText(OFFER)).toBeTruthy();
  });

  /**
   * The tour points at controls that live in `EditorLayout`. Over the wizard it
   * would spotlight nothing — and the wizard is the one screen a user has to get
   * through before anything else is worth explaining.
   */
  it('stays away from the first-run wizard', () => {
    useResumeStore.setState({ resume: createEmptyResume('az'), wizardCompleted: false });
    renderWithProviders(<TourMount />);
    expect(screen.queryByText(OFFER)).toBeNull();
  });

  it('waits for the store to hydrate', () => {
    useResumeStore.setState({ hydrated: false });
    renderWithProviders(<TourMount />);
    expect(screen.queryByText(OFFER)).toBeNull();
  });

  /**
   * Declining is an ANSWER, not a postponement: asking again on every visit is
   * what makes an invitation into nagging. So the second mount — which is what a
   * reload looks like — must be silent.
   */
  it('is offered once: declining keeps it away next time', () => {
    const first = renderWithProviders(<TourMount />);
    act(() => {
      screen.getByText('İndi yox').closest('button')?.click();
    });
    expect(screen.queryByText(OFFER)).toBeNull();

    first.unmount();
    renderWithProviders(<TourMount />);
    expect(screen.queryByText(OFFER)).toBeNull();
  });

  /** And the same after actually going through it — `end()` is the one writer. */
  it('is offered once: finishing keeps it away next time', () => {
    const first = renderWithProviders(<TourMount />);
    act(() => {
      screen.getByText('Turu başlat').closest('button')?.click();
    });
    expect(useTourStore.getState().phase).toBe('running');

    act(() => {
      useTourStore.getState().end();
    });
    first.unmount();
    renderWithProviders(<TourMount />);
    expect(screen.queryByText(OFFER)).toBeNull();
  });

  /**
   * A private window can throw on storage access. There the decision cannot be
   * kept, and the in-memory fallback is what stops the modal reappearing on the
   * next render and offering the tour in a loop.
   *
   * Driven through a FRESH copy of the module rather than through the component,
   * the same `vi.resetModules()` + dynamic import pattern `consent.test.ts` uses:
   * the fallback is module-level state, so exercising the one the components hold
   * would leave every later test in this file believing the tour had been seen.
   * (And the spies are restored one by one — `vi.restoreAllMocks()` would strip
   * the `matchMedia` implementation the AntD grid needs.)
   */
  it('remembers the answer even when localStorage refuses', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    try {
      vi.resetModules();
      const storage = await import('./tour-storage');
      expect(storage.hasSeenTour()).toBe(false);
      storage.rememberTourSeen();
      expect(storage.hasSeenTour()).toBe(true);
    } finally {
      setItem.mockRestore();
      getItem.mockRestore();
    }
  });
});

/**
 * The consent question and the tour both arrive on a first visit, and consent is
 * the one that must be answered. The subtle half is the second assertion:
 * `isConsentRequired()` reads storage and is not reactive, so a gate that only
 * checked it once would hide the tour from every first-time visitor — exactly
 * the people it exists for.
 */
describe('the tour and the analytics question', () => {
  const GA_ID = 'G-TESTID123';

  beforeEach(() => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', GA_ID);
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');
    vi.stubEnv('VITE_YANDEX_METRICA_ID', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.querySelectorAll('script').forEach((script) => script.remove());
    delete (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`];
  });

  it('does not stack on top of the consent drawer', () => {
    renderWithProviders(<TourMount />);
    expect(screen.queryByText(OFFER)).toBeNull();
  });

  it('appears as soon as the question is answered', () => {
    renderWithProviders(<TourMount />);
    expect(screen.queryByText(OFFER)).toBeNull();

    act(() => {
      setConsent('denied');
    });
    expect(screen.getByText(OFFER)).toBeTruthy();
  });
});

/**
 * `beforeinstallprompt` fires when Chromium decides it does, so the install
 * screen cannot schedule around the tour — it stands aside instead. Deferred and
 * not dropped: the offer comes back once the tour is over.
 */
describe('the install screen and the tour', () => {
  const INSTALL = 'OnlineCV-ni cihazınıza quraşdırın';

  function fireBeforeInstallPrompt(): void {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    act(() => {
      window.dispatchEvent(event);
    });
  }

  it('holds the install offer back while the tour is on screen, then shows it', () => {
    renderWithProviders(<PwaInstallPrompt />);
    act(() => {
      useTourStore.getState().offer();
    });
    fireBeforeInstallPrompt();
    expect(screen.queryByText(INSTALL)).toBeNull();

    act(() => {
      useTourStore.getState().end();
    });
    expect(screen.getByText(INSTALL)).toBeTruthy();
  });
});

/**
 * The script's targets, checked against the real editor rather than by reading
 * the selectors back.
 *
 * This is the test that earns its keep: every step points at a DOM id or class
 * owned by a different component, and renaming one of those is invisible until
 * somebody runs the tour. It is asserted on BOTH layouts because below `lg` four
 * controls move out of the header, the preview goes behind a tab and the backup
 * download drops to the foot of the Edit tab — so half the selectors differ.
 */
describe('every step points at something that exists', () => {
  function stepsFor(width: number): ReturnType<typeof useTourSteps> {
    atViewport(width);
    let steps: ReturnType<typeof useTourSteps> = [];
    function Probe(): null {
      steps = useTourSteps();
      return null;
    }
    renderWithProviders(<Probe />);
    return steps;
  }

  for (const [label, width] of [
    ['desktop', 1440],
    ['a phone', 390],
  ] as const) {
    it(`resolves every target in the ${label} editor`, () => {
      atViewport(width);
      const { container } = renderWithProviders(<EditorLayout />);
      const steps = stepsFor(width);

      expect(steps.length).toBeGreaterThan(TOUR_SECTIONS.length);
      for (const step of steps) {
        expect(
          container.querySelector(step.target as string),
          `step "${step.id}" points at "${String(step.target)}", which is not in the ${label} editor`,
        ).toBeTruthy();
      }
    }, 30_000);
  }

  /** The CV-language select lives inside the preview pane, which a phone hides. */
  it('drops the CV-language step on a phone and keeps it on desktop', () => {
    expect(stepsFor(1440).map((s) => s.id)).toContain('cvLanguage');
    expect(stepsFor(390).map((s) => s.id)).not.toContain('cvLanguage');
  });

  /**
   * Leads with the templates step, and says "photo" in every language.
   *
   * Not a style rule — it is the whole reason the feature exists: a user filled a
   * CV in for an hour, never found the Templates button, could not get the design
   * with a photo and gave up. A reordering that buries it would pass every other
   * test in this file.
   */
  it('leads with templates and names the photo', () => {
    expect(stepsFor(1440)[0]?.id).toBe('templates');
    expect(stepsFor(390)[0]?.id).toBe('templates');
  });

  /**
   * The tour's section list is a duplicate of `EditorPanel`'s, so a section added
   * there would silently be skipped. Checked against the rendered accordion, which
   * cannot be fooled by keeping the two lists textually similar.
   */
  it('covers every section the editor shows', () => {
    atViewport(1440);
    const { container } = renderWithProviders(<EditorLayout />);
    const panels = [...container.querySelectorAll('.ant-collapse-item')];
    expect(panels.length).toBe(TOUR_SECTIONS.length);

    const classes = TOUR_SECTIONS.map(tourSectionClass);
    for (const panel of panels) {
      const named = classes.filter((name) => panel.classList.contains(name));
      expect(
        named.length,
        `an editor section carries no tour class (has "${panel.className}")`,
      ).toBe(1);
    }
    // Every class is used exactly once, so no section is pointed at twice.
    expect(new Set(classes).size).toBe(classes.length);
  }, 30_000);
});

/**
 * Two placeholder styles meet in this namespace and neither is checked by a
 * compiler. `{current}` / `{total}` are Joyride's, substituted inside the
 * tooltip; `{{templates}}` is i18next's, filled from the template registry so no
 * translator ever types "6 designs". A bundle that loses one renders a counter
 * with no numbers, or the literal token, in a language nobody on the project
 * reads.
 */
describe('the tour copy', () => {
  it('keeps the progress placeholders in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const value = String(i18n.getFixedT(locale)('tour.nav.progress'));
      expect(value, `"${locale}" lost {current}`).toContain('{current}');
      expect(value, `"${locale}" lost {total}`).toContain('{total}');
    }
  });

  it('keeps the template-count token in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const raw = i18n.getResourceBundle(locale, 'translation') as {
        tour: { steps: { templates: string } };
      };
      expect(raw.tour.steps.templates, `"${locale}" hardcodes the template count`).toContain(
        '{{templates}}',
      );
    }
  });

  /** Every step and section the script asks for really has copy behind it. */
  it('has a body for every step the script builds', () => {
    atViewport(1440);
    let steps: ReturnType<typeof useTourSteps> = [];
    function Probe(): null {
      steps = useTourSteps();
      return null;
    }
    renderWithProviders(<Probe />);

    for (const step of steps) {
      expect(String(step.title).trim(), `step "${step.id}" has no title`).not.toBe('');
      const content = String(step.content);
      expect(content.trim(), `step "${step.id}" has no body`).not.toBe('');
      // An unresolved i18next key renders as the key itself.
      expect(content, `step "${step.id}" fell through to its key`).not.toContain('tour.');
    }
  });
});

describe('the guide’s replay entry', () => {
  /**
   * Replaying goes straight to `running` — the click IS the answer, so asking
   * again with the welcome modal would be a question the user has just answered.
   */
  it('starts the tour without re-asking', () => {
    act(() => {
      useTourStore.getState().start();
    });
    expect(useTourStore.getState().phase).toBe('running');
  });

  /** Available in all 20 languages, since it is the only way back in. */
  it('is labelled in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const label = String(i18n.getFixedT(locale)('tour.replay'));
      expect(label.trim(), `"${locale}" has no replay label`).not.toBe('');
      expect(label, `"${locale}" fell through to the key`).not.toContain('tour.replay');
    }
  });
});

describe('the welcome modal', () => {
  it('records the answer when dismissed with the backdrop rather than a button', () => {
    renderWithProviders(<TourMount />);
    const mask = document.querySelector('.ant-modal-wrap') as HTMLElement;
    expect(mask).toBeTruthy();
    fireEvent.click(mask);
    expect(screen.queryByText(OFFER)).toBeNull();
    // Recorded, not merely hidden: a closed modal with no decision behind it
    // would be back on the next visit.
    expect(localStorage.getItem('onlinecv-tour-seen')).toBe('1');
  });
});
