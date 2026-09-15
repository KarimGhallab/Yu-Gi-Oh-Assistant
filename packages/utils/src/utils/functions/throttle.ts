/* eslint-disable @typescript-eslint/no-explicit-any */
import { Function } from './Function.js';

/**
 * Represents a type for a throttled function.
 * @template F - The type of the original function.
 */
export type ThrottledFunction<F extends Function<unknown[], unknown>> =
  Function<Parameters<F>, ReturnType<F> | undefined>;

/**
 * Represents an asynchronous throttled function.
 * @template F - The type of the original function.
 */
export type AsyncThrottledFunction<
  F extends Function<unknown[], Promise<unknown>>
> = Function<Parameters<F>, Promise<ReturnType<F> | undefined>>;

/**
 * Throttles the execution of a function.
 *
 * @template F - The type of the function to throttle.
 * @param {F} fn - The function to throttle.
 * @param {number} [delay=300] - The delay in milliseconds.
 * @returns {ThrottledFunction<F>} - The throttled function.
 */
export const throttle = <F extends Function<any, any>>(
  fn: F,
  delay: number = 300
): ThrottledFunction<F> => {
  let wait = false;

  return (...args: Parameters<F>): ReturnType<ThrottledFunction<F>> => {
    if (wait) return undefined;

    const val = fn(...args);
    wait = true;

    setTimeout(() => {
      wait = false;
    }, delay);

    return val;
  };
};

/**
 * Throttles the execution of an asynchronous function.
 *
 * @template F - The type of the original function.
 * @param {F} fn - The original function to be throttled.
 * @param {number} [delay=300] - The delay in milliseconds between function invocations.
 * @returns {AsyncThrottledFunction<F>} - The throttled function.
 */
export const throttleAsync = <F extends Function<any, Promise<any>>>(
  fn: F,
  delay: number = 300
): AsyncThrottledFunction<F> => {
  let wait = false;

  return async (...args: Parameters<F>) => {
    if (wait) return undefined;

    wait = true;
    try {
      return await fn(...args);
    } finally {
      setTimeout(() => {
        wait = false;
      }, delay);
    }
  };
};
