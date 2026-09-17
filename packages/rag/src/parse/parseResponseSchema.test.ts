import { describe, expect, it } from 'vitest';

import { CardFilterField } from '@ygo-assistant/cards';

import {
  parseFormatSchema,
  parseResponseSchema
} from './parseResponseSchema.js';

describe('parseResponseSchema', () => {
  it('accepts a filters-only, a query-only, and an empty response', () => {
    const filter = { field: 'attribute', operator: 'eq', value: 'LIGHT' };

    expect(parseResponseSchema.safeParse({ filters: [filter] }).success).toBe(
      true
    );
    expect(parseResponseSchema.safeParse({ query: 'banish' }).success).toBe(
      true
    );
    expect(parseResponseSchema.safeParse({}).success).toBe(true);
  });

  it('rejects a field the card domain does not define', () => {
    const response = {
      filters: [{ field: 'banishes', operator: 'eq', value: 'yes' }]
    };

    expect(parseResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects a value the card domain does not allow', () => {
    const response = {
      filters: [{ field: 'attribute', operator: 'eq', value: 'PURPLE' }]
    };

    expect(parseResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects an operator the field does not take', () => {
    const response = {
      filters: [{ field: 'level', operator: 'contains', value: 4 }]
    };

    expect(parseResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects a number where the field takes text', () => {
    const response = { filters: [{ field: 'race', operator: 'eq', value: 7 }] };

    expect(parseResponseSchema.safeParse(response).success).toBe(false);
  });

  it("rejects an answer written under a key of the model's own invention", () => {
    expect(parseResponseSchema.safeParse({ filter: [] }).success).toBe(false);
    expect(parseResponseSchema.safeParse({ cards: [] }).success).toBe(false);
    expect(
      parseResponseSchema.safeParse({ filters: [], note: 'anything' }).success
    ).toBe(false);
  });
});

describe('parseFormatSchema', () => {
  it('constrains the response with every filter field the domain defines', () => {
    const format = JSON.stringify(parseFormatSchema());

    for (const field of Object.values(CardFilterField)) {
      expect(format).toContain(field);
    }
  });

  it('lets the model omit the filters and the query', () => {
    const format = parseFormatSchema();

    expect(format.type).toBe('object');
    expect(format.required ?? []).toEqual([]);
  });
});
