import { useSyncExternalStore } from 'react';

/**
 * The one breakpoint the design record names, in the one place that has to ask it
 * in JavaScript. Everything else about the layout is settled by the stylesheet's
 * `md:` variants; the frame asks this because the sidebar is a different thing on
 * either side of the line, and one of them should not be in the document at all.
 */
const WIDE = '(min-width: 48rem)';

const subscribe = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', onChange);

  return () => query.removeEventListener('change', onChange);
};

const snapshot = (): boolean => window.matchMedia(WIDE).matches;

/**
 * Whether the window is wide enough for the sidebar to stand beside the chat.
 * The browser is the source of truth, in the same way the stylesheet is
 * everywhere else, so there is nothing to keep in step by hand.
 */
export function useWideViewport(): boolean {
  return useSyncExternalStore(subscribe, snapshot);
}
