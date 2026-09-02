import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// This setup file also runs for tests that opt into the `node` environment (the
// PDF render smoke test), where there is no `window` to patch at all.
const hasDom = typeof window !== 'undefined';

// jsdom lacks matchMedia (used by Ant Design responsive hooks).
if (hasDom && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/**
 * jsdom lacks `Blob.text()` (used to read a picked backup file, and to inspect
 * the one the editor hands the browser).
 *
 * Implemented over `FileReader`, which jsdom DOES have, so a test still reads
 * the real bytes rather than a value a stub was told to return. Every browser
 * the app supports has the real method — this gap is jsdom's alone, which is
 * why the fix belongs here rather than in the feature.
 */
if (hasDom && typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function text(this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('could not read the blob'));
      reader.readAsText(this);
    });
  };
}

// jsdom lacks ResizeObserver (used by the A4 preview frame).
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}
