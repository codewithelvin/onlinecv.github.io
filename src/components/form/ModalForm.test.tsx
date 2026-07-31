import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ModalForm } from './ModalForm';

/**
 * The shared test `matchMedia` mock answers `false` to everything, so Ant
 * Design's breakpoints all read as unmatched and the app is in its `< lg`
 * (mobile) mode by default. `atViewport` swaps in a mock that answers real
 * width questions, which is the only way to exercise the desktop branch.
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

function modal(): HTMLElement | null {
  return document.querySelector('.ant-modal');
}

function renderModal(): void {
  renderWithProviders(
    <ModalForm open title="Test" onCancel={vi.fn()} onOk={vi.fn()}>
      <div>body</div>
    </ModalForm>,
  );
}

afterEach(() => {
  window.matchMedia = mobileMatchMedia;
});

describe('ModalForm chrome', () => {
  it('goes full-screen below lg', () => {
    renderModal();
    expect(modal()?.classList.contains('modal-fullscreen')).toBe(true);
    expect(document.querySelector('.ant-modal-footer .ant-btn')).toBeTruthy();
  });

  it('keeps a windowed dialog on desktop', () => {
    atViewport(1280);
    renderModal();
    expect(modal()?.classList.contains('modal-fullscreen')).toBe(false);
  });

  /**
   * No close cross at ANY size: the footer holds the exit, next to the other
   * decisions. On a phone the × is under the 44px touch target with no mask left
   * around the dialog; on desktop it is a second unlabelled way out sitting
   * diagonally opposite Cancel. So the footer button is not optional — a modal
   * without one would have no visible way out.
   */
  it('draws no close cross, and always a footer button', () => {
    for (const width of [360, 1280]) {
      atViewport(width);
      renderModal();
      const dialogs = [...document.querySelectorAll('.ant-modal')];
      const dialog = dialogs[dialogs.length - 1];
      expect(dialog.querySelector('.ant-modal-close'), `× at ${width}px`).toBeNull();
      expect(dialog.querySelector('.ant-modal-footer .ant-btn'), `no exit at ${width}px`).toBeTruthy();
    }
  });

  /**
   * `app-modal` is the whole contract with `index.css`, which caps the dialog to
   * the viewport, pins the title and the buttons, and gives the scrolling body
   * the gutter that keeps the scrollbar off the right edge of the inputs. It
   * must be there at BOTH sizes — a windowed dialog can outgrow the screen just
   * as easily as a full-screen one. (Vitest runs with `css: false`, so the rules
   * themselves cannot be observed here — only that the dialog asks for them.)
   */
  it('opts into the pinned-footer layout at every size', () => {
    renderModal();
    expect(modal()?.classList.contains('app-modal')).toBe(true);

    atViewport(1280);
    renderModal();
    // Both dialogs are still mounted; the desktop one is the last rendered.
    const dialogs = [...document.querySelectorAll('.ant-modal')];
    expect(dialogs[dialogs.length - 1].classList.contains('app-modal')).toBe(true);
  });

  /** Nothing may re-state the height inline, or it would fight that layout. */
  it('leaves the body height to CSS', () => {
    renderModal();
    expect((document.querySelector('.ant-modal-body') as HTMLElement).style.maxHeight).toBe('');
  });
});
