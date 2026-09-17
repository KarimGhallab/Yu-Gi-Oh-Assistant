import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * The tests are a desktop window, which is the layout the chat is written for:
 * every query the app asks is answered as if the viewport were wide, so the frame
 * draws the sidebar beside the chat. The one place that asks the viewport in
 * JavaScript is the frame itself; a test of the narrow window overrides this.
 */
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: !query.includes('max-width'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  })
});

afterEach(() => {
  cleanup();
});
