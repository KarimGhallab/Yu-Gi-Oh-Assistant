import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  StoredValueError,
  createStoredValueReader,
  enumGuard
} from './storedValue.js';

type Colour = 'red' | 'blue';

const isColour = enumGuard<Colour>(new Set(['red', 'blue']));

const recordSchema = z.object({ name: z.string(), count: z.number() });

const reader = createStoredValueReader('the test store');

/**
 * Runs a read expected to raise, returning the error for its fields. A read
 * that does not raise is a failed test rather than a silent pass.
 */
const capture = (run: () => unknown): StoredValueError => {
  try {
    run();
  } catch (error) {
    if (error instanceof StoredValueError) {
      return error;
    }

    throw error;
  }

  throw new Error('expected the read to raise');
};

describe('the stored value reader', () => {
  it('reads a string and refuses anything else', () => {
    expect(reader.toString('cards', 'name')).toBe('cards');

    expect(() => reader.toString(7, 'name')).toThrow(StoredValueError);
  });

  it('reads an optional string as undefined when it is absent', () => {
    expect(reader.toOptionalString(null, 'title')).toBeUndefined();
    expect(reader.toOptionalString(undefined, 'title')).toBeUndefined();
    expect(reader.toOptionalString('Deck', 'title')).toBe('Deck');

    expect(() => reader.toOptionalString(7, 'title')).toThrow(StoredValueError);
  });

  it('reads a number and an optional number', () => {
    expect(reader.toNumber(2100, 'atk')).toBe(2100);
    expect(reader.toOptionalNumber(null, 'atk')).toBeUndefined();
    expect(reader.toOptionalNumber(0, 'atk')).toBe(0);

    expect(() => reader.toNumber('2100', 'atk')).toThrow(StoredValueError);
    expect(() => reader.toOptionalNumber('2100', 'atk')).toThrow(
      StoredValueError
    );
  });

  it('reads a list from an array and from an iterable', () => {
    expect(reader.toList([1, 2], 'values')).toEqual([1, 2]);
    expect(reader.toList(new Set([1, 2]), 'values')).toEqual([1, 2]);

    expect(() => reader.toList('1,2', 'values')).toThrow(StoredValueError);
  });

  it('reads a list of strings or numbers, refusing a wrong item', () => {
    expect(reader.toStringArray(['a', 'b'], 'names')).toEqual(['a', 'b']);
    expect(reader.toNumberArray([1, 2], 'values')).toEqual([1, 2]);

    expect(() => reader.toStringArray(['a', 2], 'names')).toThrow(
      StoredValueError
    );
    expect(() => reader.toNumberArray(['a'], 'values')).toThrow(
      StoredValueError
    );
  });

  it('reads an enum member and refuses anything else', () => {
    expect(reader.toEnum('red', isColour, 'colour')).toBe('red');

    expect(() => reader.toEnum('green', isColour, 'colour')).toThrow(
      StoredValueError
    );
    expect(() => reader.toEnum(7, isColour, 'colour')).toThrow(
      StoredValueError
    );
  });

  it('reads an optional enum as undefined when it is absent', () => {
    expect(reader.toOptionalEnum(null, isColour, 'colour')).toBeUndefined();
    expect(reader.toOptionalEnum('blue', isColour, 'colour')).toBe('blue');

    expect(() => reader.toOptionalEnum('green', isColour, 'colour')).toThrow(
      StoredValueError
    );
  });

  it('reads a JSON value through its schema', () => {
    expect(
      reader.readJson('{"name":"a","count":2}', recordSchema, 'record')
    ).toEqual({ name: 'a', count: 2 });
    expect(reader.readJson(null, recordSchema, 'record')).toBeUndefined();
  });

  it('raises a JSON value that is not valid JSON', () => {
    const raised = capture(() =>
      reader.readJson('not json', recordSchema, 'record')
    );

    expect(raised.field).toBe('record');
    expect(raised.cause).toBeDefined();
  });

  it('raises a JSON value that does not satisfy the schema, keeping the cause', () => {
    const raised = capture(() =>
      reader.readJson('{"name":"a"}', recordSchema, 'record')
    );

    expect(raised.cause).toBeDefined();
  });

  it('names the source, the field, and the value on a mismatch', () => {
    const raised = capture(() => reader.toString(7, 'name'));

    expect(raised.source).toBe('the test store');
    expect(raised.field).toBe('name');
    expect(raised.value).toBe(7);
    expect(raised.message).toBe(
      'Unexpected value for "name" in the test store: 7'
    );
  });

  it('writes JSON, storing an absent value as null', () => {
    expect(reader.writeJson({ a: 1 })).toBe('{"a":1}');
    expect(reader.writeJson(undefined)).toBeNull();
  });
});
