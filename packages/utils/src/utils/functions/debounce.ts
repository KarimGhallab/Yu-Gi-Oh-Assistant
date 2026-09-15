/* eslint-disable @typescript-eslint/no-explicit-any */
import { Function } from './Function.js';

/**
 * Represents a debounced function.
 * @template F - The type of the original function.
 */
export type DebouncedFunction<F extends Function<any, Promise<any>>> = Function<
  Parameters<F>,
  void
>;

/**
 * Represents a type for an asynchronous debounced function.
 * @template F - The type of the original function.
 */
export type AsyncDebouncedFunction<F extends Function<any, Promise<any>>> =
  Function<Parameters<F>, Promise<ReturnType<F>>>;

/**
 * Debounces a function, ensuring that it is only called after a specified delay has passed since the last invocation.
 *
 * @template F - The type of the function being debounced.
 * @param {F} fn - The function to be debounced.
 * @param {number} [wait=300] - The debounce wait time in milliseconds.
 * @returns {Function<Parameters<F>, void>} - The debounced function.
 */
export const debounce = <F extends Function<any, any>>(
  fn: F,
  wait: number = 300
): DebouncedFunction<F> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(args), wait);
  };
};

/**
 * Debounces an asynchronous function. Ensures that the function is not called more than once every `wait` milliseconds.
 * If the waiting time has passed and the asynchronous function is not terminated, we wait for it it terminate before calling that function again.
 *
 * @template F - The type of the function being debounced.
 * @param {F} fn - The function to be debounced.
 * @param {number} [wait=300] - The debounce wait time in milliseconds.
 * @returns {AsyncDebouncedFunction<F>} - The debounced function.
 */
export const debounceAsync = <F extends Function<any, Promise<any>>>(
  fn: F,
  wait: number = 300
): AsyncDebouncedFunction<F> => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<any> | null = null;

  return (...args: Parameters<F>): ReturnType<AsyncDebouncedFunction<F>> =>
    new Promise((resolve, reject) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(async () => {
        try {
          // If there is a pending promise, wait for it to complete
          if (pendingPromise) {
            await pendingPromise;
          }

          // Call the function and store the promise if it's async
          pendingPromise = Promise.resolve(fn(...args));
          const result = await pendingPromise;

          // Clear the pending promise
          pendingPromise = null;

          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
};
