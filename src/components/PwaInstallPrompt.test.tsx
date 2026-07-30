import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import { useResumeStore } from '../state/store';
import { createEmptyResume } from '../utils/empty-resume';
import type { Resume } from '../types/resume';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { TelegramButton, TELEGRAM_URL } from './TelegramButton';

/** A resume that has cleared the first-run wizard. */
function filledResume(): Resume {
  const resume = createEmptyResume('az');
  resume.basics.firstName = 'Elvin';
  resume.basics.lastName = 'Huseynov';
  resume.basics.headline = 'Frontend Developer';
  resume.contact.email = 'elvin@example.az';
  return resume;
}

/** The Chromium event the install screen is driven by. */
function fireBeforeInstallPrompt(): { prompt: ReturnType<typeof vi.fn> } {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return { prompt };
}

describe('PwaInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    useResumeStore.setState({
      resume: filledResume(),
      uiLocale: 'az',
      hydrated: true,
      persistenceError: false,
    });
  });

  it('stays hidden until the browser says the app is installable', () => {
    renderWithProviders(<PwaInstallPrompt />);
    expect(screen.queryByText('OnlineCV-ni cihazınıza quraşdırın')).toBeNull();

    fireBeforeInstallPrompt();
    expect(screen.getByText('OnlineCV-ni cihazınıza quraşdırın')).toBeTruthy();
  });

  /**
   * Without `preventDefault()` the browser shows (and then throws away) its own
   * mini-infobar, and the deferred event can never be prompted later — the
   * Install button would silently do nothing.
   */
  it('defers the browser’s own prompt so it can be replayed on the button', () => {
    renderWithProviders(<PwaInstallPrompt />);
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  /** A modal over the first-run wizard reads as the app being broken. */
  it('never covers the first-run wizard', () => {
    useResumeStore.setState({ resume: createEmptyResume('az') });
    renderWithProviders(<PwaInstallPrompt />);
    fireBeforeInstallPrompt();
    expect(screen.queryByText('OnlineCV-ni cihazınıza quraşdırın')).toBeNull();
  });

  it('is offered once — dismissing it keeps it away on the next visit', () => {
    const first = renderWithProviders(<PwaInstallPrompt />);
    fireBeforeInstallPrompt();
    act(() => {
      screen.getByText('Sonra').closest('button')?.click();
    });
    expect(screen.queryByText('OnlineCV-ni cihazınıza quraşdırın')).toBeNull();

    first.unmount();
    renderWithProviders(<PwaInstallPrompt />);
    fireBeforeInstallPrompt();
    expect(screen.queryByText('OnlineCV-ni cihazınıza quraşdırın')).toBeNull();
  });
});

describe('TelegramButton', () => {
  it('links to the community group in a safely-opened tab', () => {
    const { container } = renderWithProviders(<TelegramButton />);
    const link = container.querySelector('#telegram-community') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe(TELEGRAM_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    // Icon-only on a narrow screen, so the invitation has to reach a screen
    // reader some other way.
    expect(link.getAttribute('aria-label')).toBe('Telegram icmamıza qoşulun');
  });
});
