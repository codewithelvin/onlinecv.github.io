import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useResumeStore } from '../../state/store';
import { createEmptyResume } from '../../utils/empty-resume';
import { listTemplates } from '../../templates/_core/registry';
import { TemplatePicker } from './TemplatePicker';

/**
 * The shared test `matchMedia` answers `false` to everything, so the app runs in
 * its `< lg` (mobile) mode unless a test opts out — see `ModalForm.test.tsx`.
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

/**
 * Renders a picker and opens its gallery. Scoped to the render's own container:
 * there is no auto-cleanup between these tests, so `document.getElementById`
 * would hand back the FIRST picker ever mounted rather than this one's.
 */
function openGallery(): void {
  const { container } = renderWithProviders(<TemplatePicker />);
  fireEvent.click(container.querySelector('#template-picker') as HTMLElement);
}

function card(id: string): HTMLElement {
  return document.getElementById(`template-option-${id}`) as HTMLElement;
}

beforeEach(() => {
  useResumeStore.setState({
    resume: createEmptyResume('az'),
    uiLocale: 'az',
    hydrated: true,
    persistenceError: false,
  });
});

afterEach(() => {
  window.matchMedia = mobileMatchMedia;
});

describe('TemplatePicker gallery', () => {
  it('renders a card per registered template and selects the one clicked', () => {
    openGallery();
    const ids = listTemplates().map(({ manifest }) => manifest.id);
    expect(ids.length).toBeGreaterThan(1);
    ids.forEach((id) => expect(card(id)).toBeTruthy());

    const other = ids.find((id) => id !== useResumeStore.getState().resume.templateId) as string;
    fireEvent.click(card(other));
    expect(useResumeStore.getState().resume.templateId).toBe(other);
  });

  /**
   * The whole point of the ring: a thicker border on the selected card is drawn
   * at HALF width along its top and sides, because antd pulls the cover image
   * 1px out over the border with a hard-coded margin. Nothing here may set a
   * border width inline — the even perimeter is `index.css`'s job.
   */
  it('marks the selected card with a ring, never with a thicker border', () => {
    openGallery();
    const selectedId = useResumeStore.getState().resume.templateId;
    const selected = card(selectedId);

    expect(selected.classList.contains('template-card-selected')).toBe(true);
    expect(selected.style.borderWidth).toBe('');
    expect(selected.style.boxShadow).toMatch(/^0 0 0 1px /);
    expect(selected.style.borderColor).not.toBe('');

    listTemplates()
      .filter(({ manifest }) => manifest.id !== selectedId)
      .forEach(({ manifest }) => {
        const el = card(manifest.id);
        expect(el.classList.contains('template-card')).toBe(true);
        expect(el.classList.contains('template-card-selected')).toBe(false);
        // An unselected card carries no inline border or shadow at all, so the
        // stable hover border in `index.css` can win.
        expect(el.style.boxShadow).toBe('');
        expect(el.style.borderColor).toBe('');
      });
  });

  /**
   * Every card must opt into the `.template-card` rules (`overflow: hidden` plus
   * the zeroed cover margin) — that is the contract that makes the border go all
   * the way round. Vitest runs with `css: false`, so only the opt-in is testable.
   */
  it('opts every card into the gallery card rules and squares up the body padding', () => {
    openGallery();
    listTemplates().forEach(({ manifest }) => {
      expect(card(manifest.id).classList.contains('template-card')).toBe(true);
    });
    const modal = document.querySelector('.ant-modal') as HTMLElement;
    expect(modal.classList.contains('template-gallery')).toBe(true);
    // The shared modal chrome must survive being extended.
    expect(modal.classList.contains('app-modal')).toBe(true);
  });

  /**
   * A thumbnail cropped to a fixed height in the middle of the shot showed a
   * band of body text and no page. It is a card-shaped crop anchored to the top
   * of the image now, so the header (and any accent column) always survives.
   */
  it('shows the top of each thumbnail at a card-shaped aspect ratio', () => {
    openGallery();
    listTemplates().forEach(({ manifest }) => {
      const img = card(manifest.id).querySelector('img') as HTMLImageElement;
      expect(img.getAttribute('src')).toBe(manifest.thumbnail);
      expect(img.style.aspectRatio).toBe('4 / 3');
      expect(img.style.objectFit).toBe('cover');
      expect(img.style.objectPosition).toBe('top center');
      // A fixed pixel height would fight the aspect ratio.
      expect(img.style.height).toBe('');
    });
  });

  it('opens the full-size preview without choosing that template', async () => {
    openGallery();
    const before = useResumeStore.getState().resume.templateId;
    const other = listTemplates().find(({ manifest }) => manifest.id !== before)?.manifest
      .id as string;

    fireEvent.click(document.getElementById(`template-zoom-${other}`) as HTMLElement);

    await waitFor(() => {
      expect(document.querySelector('.ant-image-preview-root')).toBeTruthy();
    });
    // The magnifier stops the click from reaching the card.
    expect(useResumeStore.getState().resume.templateId).toBe(before);
    // The gallery is still open behind the lightbox.
    expect(card(other)).toBeTruthy();
  });

  it('keeps a windowed dialog on desktop and a Close button on mobile', () => {
    openGallery();
    expect(document.getElementById('template-picker-close')).toBeTruthy();

    atViewport(1280);
    openGallery();
    const dialogs = [...document.querySelectorAll('.ant-modal')];
    const desktop = dialogs[dialogs.length - 1];
    expect(desktop.classList.contains('modal-fullscreen')).toBe(false);
    expect(desktop.classList.contains('template-gallery')).toBe(true);
  });
});
