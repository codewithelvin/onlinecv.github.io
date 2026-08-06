import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import { useResumeStore } from '../state/store';
import { createEmptyResume } from '../utils/empty-resume';
import { ConsentDrawer, ConsentFooter } from './ConsentDrawer';

/**
 * The consent drawer's side of §20/§22 — the service (`consent.test.ts`) owns the
 * claim that nothing loads before an answer; this owns the claim that an answer
 * is actually asked for, exactly once, and can be revisited afterwards.
 *
 * The env is stubbed with ids because a build without them has nothing to ask
 * about, and `localStorage.clear()` is a full reset of the decision by design:
 * the service keeps no cache of a successful write.
 */

const STORAGE_KEY = 'onlinecv-analytics-consent';

function withAnalyticsIds(): void {
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TESTID123');
  vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'testclarity');
}

function withoutAnalyticsIds(): void {
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
  vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');
}

function click(id: string): void {
  const button = document.querySelector<HTMLElement>(id);
  expect(button, `no ${id} to click`).toBeTruthy();
  act(() => button?.click());
}

const drawer = (): HTMLElement | null => document.querySelector('#consent-drawer');

beforeEach(() => {
  localStorage.clear();
  withAnalyticsIds();
  useResumeStore.setState({
    resume: createEmptyResume('az'),
    uiLocale: 'az',
    hydrated: true,
    wizardCompleted: false,
    persistenceError: false,
  });
});

/**
 * Envs only — deliberately NOT `vi.restoreAllMocks()`. `test/setup.ts` installs
 * `window.matchMedia` as a `vi.fn()`, and restoring it strips the implementation,
 * so AntD's responsive observer (`useResponsive` here) destructures `undefined`
 * on the next mount and every test after the first one dies.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ConsentDrawer', () => {
  it('asks on a first visit', () => {
    renderWithProviders(<ConsentDrawer />);

    expect(drawer()).toBeTruthy();
    expect(screen.getByText('Anonim istifadə statistikası')).toBeTruthy();
    // Both vendors named, since "some usage data" is not informed consent.
    expect(screen.getByText(/Google Analytics/)).toBeTruthy();
    expect(screen.getByText(/Microsoft Clarity/)).toBeTruthy();
    expect(document.querySelector('#consent-accept')).toBeTruthy();
    expect(document.querySelector('#consent-decline')).toBeTruthy();
  });

  /** A notice, not a gate: the editor behind it stays usable, so there is no mask. */
  it('does not block the app behind it', () => {
    renderWithProviders(<ConsentDrawer />);
    expect(document.querySelector('.ant-drawer-mask')).toBeNull();
  });

  /**
   * Dismissing is not deciding. With a close button the drawer could be waved
   * away unanswered, and "asked once per device" would either re-ask forever or
   * silently mean "no" — so until an answer is given there is nothing to press
   * but the two buttons.
   */
  it('cannot be dismissed without an answer', () => {
    renderWithProviders(<ConsentDrawer />);
    expect(document.querySelector('.ant-drawer-close')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('stays away in a build with no analytics ids', () => {
    withoutAnalyticsIds();
    renderWithProviders(<ConsentDrawer />);
    expect(drawer()).toBeNull();
  });

  /** A drawer over the loading spinner reads as a broken page load. */
  it('waits for the app to appear behind it', () => {
    useResumeStore.setState({ hydrated: false });
    renderWithProviders(<ConsentDrawer />);
    expect(drawer()).toBeNull();
  });

  it('records agreement and gets out of the way', () => {
    renderWithProviders(<ConsentDrawer />);

    click('#consent-accept');

    expect(localStorage.getItem(STORAGE_KEY)).toBe('granted');
    expect(drawer()).toBeNull();
  });

  /**
   * The other half of the user's ask: a refusal is honoured, and it is spelled
   * out that nothing then reports back — so problems cannot be found and fixed.
   */
  it('spells out the risk when consent is refused, and stays on screen to do it', () => {
    renderWithProviders(<ConsentDrawer />);

    click('#consent-decline');

    expect(localStorage.getItem(STORAGE_KEY)).toBe('denied');
    expect(drawer()).toBeTruthy();
    expect(document.querySelector('#consent-declined-notice')).toBeTruthy();
    expect(screen.getByText(/öz riskinizlə/)).toBeTruthy();
    // No "reload to finish" line: a first-visit refusal loaded nothing at all.
    expect(screen.queryByText(/səhifəni yeniləyin/)).toBeNull();
  });

  it('asks once per device, whichever way it was answered', () => {
    const first = renderWithProviders(<ConsentDrawer />);
    click('#consent-decline');
    click('#consent-close');
    first.unmount();

    renderWithProviders(<ConsentDrawer />);
    expect(drawer()).toBeNull();
  });

  it('never re-asks a decision made on an earlier visit', () => {
    localStorage.setItem(STORAGE_KEY, 'granted');
    renderWithProviders(<ConsentDrawer />);
    expect(drawer()).toBeNull();
  });
});

describe('ConsentFooter', () => {
  /** Withdrawing has to be as easy as agreeing, or the one-time prompt is a trap. */
  it('reopens the drawer so consent can be withdrawn', () => {
    localStorage.setItem(STORAGE_KEY, 'granted');
    renderWithProviders(
      <>
        <ConsentFooter />
        <ConsentDrawer />
      </>,
    );
    expect(drawer()).toBeNull();

    click('#consent-review');

    expect(drawer()).toBeTruthy();
    expect(screen.getByText(/icazə vermisiniz/)).toBeTruthy();

    click('#consent-revoke');

    expect(localStorage.getItem(STORAGE_KEY)).toBe('denied');
    expect(document.querySelector('#consent-declined-notice')).toBeTruthy();
    // Withdrawn while the tags were already running, so the reload line applies.
    expect(screen.getByText(/səhifəni yeniləyin/)).toBeTruthy();
  });

  it('renders nothing when the build has no analytics to talk about', () => {
    withoutAnalyticsIds();
    renderWithProviders(<ConsentFooter />);
    expect(document.querySelector('#consent-review')).toBeNull();
  });
});
