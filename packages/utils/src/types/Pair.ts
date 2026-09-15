/**
 * Represents a pair of values.
 *
 * @template T1 - The type of the first value.
 * @template T2 - The type of the second value.
 */
export type Pair<T1, T2> = { first: T1; second: T2 };

/**
 * Represents a type pair where both elements have the same type.
 *
 * @template T - The type of the elements in the pair.
 */
export type OneTypePair<T> = Pair<T, T>;
