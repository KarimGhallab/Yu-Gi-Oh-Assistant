import { flushSync } from 'react-dom';

interface TransitionLike {
  finished: Promise<void>;
}

/**
 * Runs one DOM update as a view transition, if the browser can.
 *
 * The transition is opened around the update rather than declared on it, because
 * the browser photographs the screen between two of its own frames and there is
 * no other seam at which to ask. `flushSync` is what makes the update land
 * inside that photograph rather than after it.
 *
 * A browser without the API, and jsdom under the tests, get the update and no
 * movement. Reduced motion is the stylesheet's business rather than this
 * function's: the transition still runs there, at a length that amounts to none,
 * so what changed is simply where it lands.
 */
export function runViewTransition(
  update: () => void
): TransitionLike | undefined {
  const start = (
    document as Document & {
      startViewTransition?: (callback: () => void) => TransitionLike;
    }
  ).startViewTransition;

  if (typeof start !== 'function') {
    update();
    return undefined;
  }

  return start.call(document, () => {
    flushSync(update);
  });
}
