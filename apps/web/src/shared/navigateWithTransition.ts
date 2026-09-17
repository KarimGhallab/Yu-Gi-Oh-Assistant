import { flushSync } from 'react-dom';
import type { NavigateFunction } from 'react-router';

/**
 * Carries one screen into the next as a single movement, if the browser can.
 *
 * The router only applies its own `viewTransition` option in data mode, and this
 * app does not run in one: a `BrowserRouter` navigation goes to the history and
 * the option is dropped on the way. So the transition is opened here instead,
 * which means the navigation has to land inside the callback that opens it.
 * `flushSync` is what makes it land, and it is why the router is configured to
 * render a route change on the spot rather than as a React transition: a
 * transition-lane update cannot be flushed, and the browser would photograph the
 * old screen as the new one and drop the movement.
 *
 * A browser without the API, and jsdom under the tests, get the navigation and no
 * movement. Reduced motion is the stylesheet's business rather than this
 * function's: the transition still runs there, at a length that amounts to none,
 * so the prompt is simply where it lands.
 */
export const navigateWithTransition = (
  navigate: NavigateFunction,
  to: string,
  state: unknown
): void => {
  if (typeof document.startViewTransition !== 'function') {
    void navigate(to, { state });
    return;
  }

  document.startViewTransition(() => {
    flushSync(() => {
      void navigate(to, { state });
    });
  });
};
