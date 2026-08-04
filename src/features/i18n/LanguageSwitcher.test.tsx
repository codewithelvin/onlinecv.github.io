import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { LOCALES, REGION_ORDER, SUPPORTED_LOCALES, applyLocale, i18n } from '../../app/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * One trigger, whatever the language count, opening a picker DIALOG — the registry
 * decides what is on offer, never the markup.
 *
 * The dialog is portalled (`getContainer`), so everything inside it is queried off
 * `document` rather than the render container.
 */
/**
 * The shared test `matchMedia` mock answers `false` to everything, so the suite
 * runs in MOBILE mode unless a case opts out — `atViewport` is the only way to
 * exercise the desktop branch (same helper as `ModalForm.test.tsx`).
 */
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

describe('LanguageSwitcher', () => {
  afterEach(() => {
    window.matchMedia = mobileMatchMedia;
  });

  beforeEach(() => {
    // These cases SWITCH the language, and `i18n` is a module-level singleton, so
    // without this reset a later case renders in whatever the previous one picked.
    applyLocale('az');
    useResumeStore.setState({
      resume: createEmptyResume('az'),
      uiLocale: 'az',
      hydrated: true,
      persistenceError: false,
    });
  });

  const openPicker = (container: HTMLElement): void => {
    fireEvent.click(container.querySelector('#ui-language') as HTMLElement);
  };

  it('shows the current locale on one trigger, whatever the language count', () => {
    const { container } = renderWithProviders(<LanguageSwitcher />);
    const trigger = container.querySelector('#ui-language') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain(LOCALES.az.short);
    // One control, not one per language — the tiles live in the dialog.
    expect(container.querySelectorAll('button')).toHaveLength(1);
    // It opens a dialog, and says so.
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('offers every registered locale by its own name and ISO code, and switches to it', async () => {
    const { container } = renderWithProviders(<LanguageSwitcher />);
    openPicker(container);

    await waitFor(() => {
      expect(document.getElementById('ui-language-modal')).toBeTruthy();
    });
    for (const code of SUPPORTED_LOCALES) {
      const tile = document.getElementById(`ui-language-${code}`);
      expect(tile, `no tile for "${code}"`).toBeTruthy();
      expect(tile?.textContent).toContain(LOCALES[code].nativeName);
      expect(tile?.textContent, `"${code}" shows no ISO code`).toContain(`(${LOCALES[code].short})`);
      // The flag is drawn per locale, and is decorative.
      const flag = tile?.querySelector(`svg[data-flag="${code}"]`);
      expect(flag, `no flag for "${code}"`).toBeTruthy();
      expect(flag?.getAttribute('aria-hidden')).toBe('true');
    }

    fireEvent.click(document.getElementById('ui-language-ka') as HTMLElement);
    expect(useResumeStore.getState().uiLocale).toBe('ka');
  });

  it('closes the picker once a language is chosen', async () => {
    const { container } = renderWithProviders(<LanguageSwitcher />);
    openPicker(container);
    await waitFor(() => expect(document.getElementById('ui-language-modal')).toBeTruthy());

    fireEvent.click(document.getElementById('ui-language-en') as HTMLElement);
    await waitFor(() => {
      expect(container.querySelector('#ui-language')?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  /**
   * Titleless in the sense that matters — nothing is drawn — but still NAMED: a
   * dialog with no accessible name is a real defect for a screen-reader user, and
   * antd's own mechanism is the header it points `aria-labelledby` at, so the
   * header exists and `index.css` hides it. Never draw conclusions about the CSS
   * here: `?raw` returns '' under vitest, so this asserts the JS-side contract.
   */
  it('is drawn without a title but is still named for assistive technology', async () => {
    const { container } = renderWithProviders(<LanguageSwitcher />);
    openPicker(container);
    await waitFor(() => expect(document.getElementById('ui-language-modal')).toBeTruthy());

    expect(document.querySelector('.language-picker .ant-modal-close')).toBeNull();

    const dialog = document.querySelector('[role="dialog"]');
    const namedBy = dialog?.getAttribute('aria-labelledby');
    expect(namedBy, 'the dialog has no accessible name').toBeTruthy();
    expect(document.getElementById(namedBy as string)?.textContent).toBe(
      i18n.getFixedT('az')('header.language'),
    );
  });

  /**
   * The exit. On desktop there is deliberately no footer: every tile closes the
   * dialog — including the CURRENT language, drawn as selected, so tapping it
   * leaves without changing anything — and the mask and Escape work as well.
   *
   * On a phone the dialog is full-screen, so there is no mask to tap and no close
   * cross anywhere in this app; that is exactly the case `useModalChrome`'s
   * footer-button rule exists for, so the footer appears at that size only.
   */
  describe('closing it', () => {
    it('offers a full-width Close button when it is full-screen', async () => {
      const { container } = renderWithProviders(<LanguageSwitcher />);
      openPicker(container);
      await waitFor(() => expect(document.getElementById('ui-language-modal')).toBeTruthy());

      const close = document.getElementById('ui-language-close');
      expect(close, 'a full-screen dialog with no mask and no × has no way out').toBeTruthy();
      expect(close?.className, 'the button should span the width').toContain('ant-btn-block');
      // The only exit at this size, so it takes the 44px touch target (§10.3).
      expect(close?.className, 'the sole exit is under the touch target').toContain('ant-btn-lg');

      fireEvent.click(close as HTMLElement);
      await waitFor(() => {
        expect(container.querySelector('#ui-language')?.getAttribute('aria-expanded')).toBe('false');
      });
      // Left without switching.
      expect(useResumeStore.getState().uiLocale).toBe('az');
    });

    it('drops the footer on desktop, where the mask and Escape close it', async () => {
      atViewport(1280);
      const { container } = renderWithProviders(<LanguageSwitcher />);
      openPicker(container);
      await waitFor(() => expect(document.getElementById('ui-language-modal')).toBeTruthy());

      expect(document.querySelector('.language-picker')?.className).not.toContain(
        'modal-fullscreen',
      );
      expect(document.querySelector('.language-picker .ant-modal-footer')).toBeNull();
      expect(document.getElementById('ui-language-close')).toBeNull();
    });

    it('lets the current language be re-picked as a no-op exit', async () => {
      const { container } = renderWithProviders(<LanguageSwitcher />);
      openPicker(container);
      await waitFor(() => expect(document.getElementById('ui-language-modal')).toBeTruthy());

      const currentTile = document.getElementById('ui-language-az');
      expect(currentTile?.getAttribute('aria-pressed')).toBe('true');
      fireEvent.click(currentTile as HTMLElement);

      await waitFor(() => {
        expect(container.querySelector('#ui-language')?.getAttribute('aria-expanded')).toBe('false');
      });
      expect(useResumeStore.getState().uiLocale).toBe('az');
    });
  });

  it('groups the languages by region, in REGION_ORDER, skipping empty regions', async () => {
    const { container } = renderWithProviders(<LanguageSwitcher />);
    openPicker(container);
    await waitFor(() => expect(document.getElementById('ui-language-modal')).toBeTruthy());

    const t = i18n.getFixedT('az');
    const inUse = REGION_ORDER.filter((region) =>
      SUPPORTED_LOCALES.some((code) => LOCALES[code].region === region),
    );
    const empty = REGION_ORDER.filter((region) => !inUse.includes(region));
    expect(inUse.length, 'no region holds a language').toBeGreaterThan(1);
    expect(empty.length, 'every region is in use — the skip cannot be observed').toBeGreaterThan(0);

    const headings = [...document.querySelectorAll('#ui-language-modal section')].map(
      (section) => section.firstElementChild?.textContent ?? '',
    );
    expect(headings).toEqual(inUse.map((region) => t(`regions.${region}`)));
    for (const region of empty) {
      expect(headings, `"${region}" is rendered while empty`).not.toContain(t(`regions.${region}`));
    }

    // Every tile sits under its own region's heading.
    for (const region of inUse) {
      const section = [...document.querySelectorAll('#ui-language-modal section')].find(
        (s) => s.firstElementChild?.textContent === t(`regions.${region}`),
      );
      for (const code of SUPPORTED_LOCALES.filter((c) => LOCALES[c].region === region)) {
        expect(section?.querySelector(`#ui-language-${code}`), `${code} is in the wrong group`).toBeTruthy();
      }
    }
  });

  /** The default locale's region leads, as it does in `SUPPORTED_LOCALES` itself. */
  it('puts the default locale’s region first', async () => {
    const { container } = renderWithProviders(<LanguageSwitcher />);
    openPicker(container);
    await waitFor(() => expect(document.getElementById('ui-language-modal')).toBeTruthy());

    const first = document.querySelector('#ui-language-modal section');
    expect(first?.querySelector('#ui-language-az')).toBeTruthy();
  });
});
