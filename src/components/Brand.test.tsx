import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { Brand } from './Brand';

/**
 * The two logo files are different artwork, not two encodings of one image:
 * `logo.svg` is the square mark, `logo.png` the wide wordmark. Phones get the
 * mark so the header still fits the Telegram button and the language switch.
 */
describe('Brand', () => {
  it('serves the square mark by default and the wordmark from the tablet width up', () => {
    const { container } = renderWithProviders(<Brand />);

    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toContain('logo.svg');

    const source = container.querySelector('picture > source');
    expect(source, 'no <source>, so every viewport would get the same logo').toBeTruthy();
    expect(source?.getAttribute('srcset')).toContain('logo.png');
    // Ant Design's `md` — the narrow edge of a portrait tablet.
    expect(source?.getAttribute('media')).toBe('(min-width: 768px)');
  });

  it('keeps the app name reachable without a text label', () => {
    const { container } = renderWithProviders(<Brand />);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('OnlineCV');
  });

  /**
   * Height is CSS, not a prop: the two shapes need different heights (42 for the
   * square mark, 30 for the wordmark) and the swap has to happen at the same
   * breakpoint as the `<source>`, which only a media query can guarantee.
   */
  it('leaves sizing to the stylesheet', () => {
    const { container } = renderWithProviders(<Brand />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.classList.contains('brand-logo')).toBe(true);
    expect(img.style.height, 'an inline height would pin one size for both shapes').toBe('');
  });
});
