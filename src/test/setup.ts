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

// jsdom lacks ResizeObserver (used by the A4 preview frame).
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}
