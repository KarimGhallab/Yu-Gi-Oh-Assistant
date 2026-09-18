/**
 * Checks if two arrays of primitives are similar.
 *
 * @template T - The type of the array elements (boolean, number, or string).
 * @param a - The first array.
 * @param b - The second array.
 * @returns A boolean indicating whether the arrays are similar.
 */
export const arrayOfPrimitivesAreSimilar = <
  T extends boolean | number | string
>(
  a: T[],
  b: T[]
): boolean => a.length === b.length && a.every(value => b.includes(value));

/**
 * Groupe elements of a list by a given key.
 *
 * @param list The list to group.
 * @param keyGetter A getter on the key used for the grouping.
 * @returns A map that groups elements of the list by the given key.
 */
export const groupBy = <T, K>(
  list: T[],
  keyGetter: (item: T) => K
): Map<K, T[]> => {
  const map = new Map<K, T[]>();
  list.forEach(item => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
};

/**
 * Compute the intersections of the given sets.
 *
 * @param sets The sets to intersect.
 * @returns The intersection of the given sets.
 */
export const setIntersection = <T>(sets: Set<T>[]): Set<T> => {
  const _setIntersection = (setA: Set<T>, setB: Set<T>): Set<T> => {
    const intersection = new Set<T>();
    for (const elem of setA) {
      if (setB.has(elem)) {
        intersection.add(elem);
      }
    }
    return intersection;
  };

  if (sets.length === 0) {
    return new Set<T>();
  }
  return sets.length <= 1
    ? new Set()
    : sets.reduce((setA, setB) => _setIntersection(setA, setB));
};

export const shuffle = ([...arr]) => {
  let m = arr.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
};
