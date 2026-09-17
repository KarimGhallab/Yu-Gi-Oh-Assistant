/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Represents a generic function type.
 * @template P - The type of the function parameters.
 * @template R - The return type of the function.
 */
export type Function<P extends any[], R> = (...params: P) => R;
