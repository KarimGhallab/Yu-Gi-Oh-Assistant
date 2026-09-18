import type { NavigateFunction } from 'react-router';

import { runViewTransition } from './runViewTransition.js';

/**
 * Carries one screen into the next as a single movement, if the browser can.
 *
 * The router only applies its own `viewTransition` option in data mode, and this
 * app does not run in one: a `BrowserRouter` navigation goes to the history and
 * the option is dropped on the way. So the transition is opened here instead,
 * which means the navigation has to land inside the callback that opens it. The
 * router is configured to render a route change on the spot rather than as a
 * React transition, because a transition-lane update cannot be flushed, and the
 * browser would photograph the old screen as the new one and drop the movement.
 */
export const navigateWithTransition = (
  navigate: NavigateFunction,
  to: string,
  state: unknown
): void => {
  runViewTransition(() => {
    void navigate(to, { state });
  });
};
