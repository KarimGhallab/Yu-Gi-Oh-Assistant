import type { ZodType } from 'zod';

/**
 * A value read out of a row that is not what the schema promised. A column that
 * does not hold what it should means the store is corrupt, so the read raises
 * rather than coercing, and the error names where it happened.
 */
export class StoredValueError extends Error {
  constructor(
    public readonly source: string,
    public readonly field: string,
    public readonly value: unknown,
    options?: ErrorOptions
  ) {
    super(
      `Unexpected value for "${field}" in ${source}: ${String(value)}`,
      options
    );
    this.name = new.target.name;
  }
}

/**
 * Builds the membership test for a stored enum from the set of allowed values.
 * The predicate is what narrows a loose value to the enum type, so an enum read
 * needs no type assertion.
 */
export function enumGuard<T extends string>(
  allowed: ReadonlySet<string>
): (value: unknown) => value is T {
  return (value): value is T => typeof value === 'string' && allowed.has(value);
}

const isIterable = (value: unknown): value is Iterable<unknown> =>
  value !== null && typeof value === 'object' && Symbol.iterator in value;

/**
 * The reads a stored row is read with, bound to the source the row came from.
 * One rule runs through every read: a column must hold what the schema
 * promised, or the row is corrupt and the read raises. A scalar is read by its
 * type, a list by its items, an enum by the guard that knows its members, and a
 * JSON column through the schema that describes it.
 */
export interface StoredValueReader {
  toString(value: unknown, field: string): string;
  toOptionalString(value: unknown, field: string): string | undefined;
  toNumber(value: unknown, field: string): number;
  toOptionalNumber(value: unknown, field: string): number | undefined;
  toList(value: unknown, field: string): unknown[];
  toStringArray(value: unknown, field: string): string[];
  toNumberArray(value: unknown, field: string): number[];
  toEnum<T extends string>(
    value: unknown,
    isAllowed: (candidate: unknown) => candidate is T,
    field: string
  ): T;
  toOptionalEnum<T extends string>(
    value: unknown,
    isAllowed: (candidate: unknown) => candidate is T,
    field: string
  ): T | undefined;
  readJson<T>(value: unknown, schema: ZodType<T>, field: string): T | undefined;
  writeJson(value: unknown): string | null;
}

/**
 * Binds a source name and returns the reads for it. The source is bound once,
 * so a call site names only the value and the field it came from, and the error
 * still says which store the row was in.
 */
export function createStoredValueReader(source: string): StoredValueReader {
  const unexpected = (field: string, value: unknown): StoredValueError =>
    new StoredValueError(source, field, value);

  const toString = (value: unknown, field: string): string => {
    if (typeof value === 'string') {
      return value;
    }

    throw unexpected(field, value);
  };

  const toOptionalString = (
    value: unknown,
    field: string
  ): string | undefined => {
    if (value === null || value === undefined) {
      return undefined;
    }

    return toString(value, field);
  };

  const toNumber = (value: unknown, field: string): number => {
    if (typeof value === 'number') {
      return value;
    }

    throw unexpected(field, value);
  };

  const toOptionalNumber = (
    value: unknown,
    field: string
  ): number | undefined => {
    if (value === null || value === undefined) {
      return undefined;
    }

    return toNumber(value, field);
  };

  const toList = (value: unknown, field: string): unknown[] => {
    if (Array.isArray(value)) {
      return value;
    }

    if (isIterable(value)) {
      return Array.from(value);
    }

    throw unexpected(field, value);
  };

  const toStringArray = (value: unknown, field: string): string[] =>
    toList(value, field).map(item => toString(item, field));

  const toNumberArray = (value: unknown, field: string): number[] =>
    toList(value, field).map(item => toNumber(item, field));

  const toEnum = <T extends string>(
    value: unknown,
    isAllowed: (candidate: unknown) => candidate is T,
    field: string
  ): T => {
    if (isAllowed(value)) {
      return value;
    }

    throw unexpected(field, value);
  };

  const toOptionalEnum = <T extends string>(
    value: unknown,
    isAllowed: (candidate: unknown) => candidate is T,
    field: string
  ): T | undefined => {
    if (value === null || value === undefined) {
      return undefined;
    }

    return toEnum(value, isAllowed, field);
  };

  const readJson = <T>(
    value: unknown,
    schema: ZodType<T>,
    field: string
  ): T | undefined => {
    const stored = toOptionalString(value, field);

    if (stored === undefined) {
      return undefined;
    }

    try {
      const parsed: unknown = JSON.parse(stored);
      return schema.parse(parsed);
    } catch (error) {
      throw new StoredValueError(source, field, value, { cause: error });
    }
  };

  const writeJson = (value: unknown): string | null =>
    value === undefined ? null : JSON.stringify(value);

  return {
    toString,
    toOptionalString,
    toNumber,
    toOptionalNumber,
    toList,
    toStringArray,
    toNumberArray,
    toEnum,
    toOptionalEnum,
    readJson,
    writeJson
  };
}
