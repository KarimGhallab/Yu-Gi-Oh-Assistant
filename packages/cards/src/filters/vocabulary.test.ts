import { describe, expect, it } from 'vitest';

import { CardAttribute, CardType, FrameType, LinkMarker } from '../enums.js';
import { CardFilterField, FilterOperator, cardFilterSchema } from './schema.js';
import {
  type FilterFieldVocabulary,
  describeFilterFields
} from './vocabulary.js';

const sorted = (values: readonly string[]): string[] => [...values].sort();

const byField = (): Map<string, FilterFieldVocabulary> =>
  new Map(describeFilterFields().map(entry => [entry.field, entry]));

/**
 * A value each field accepts, so a filter built from the vocabulary can be put
 * to the schema without the schema's answer depending on the value being wrong.
 */
const SAMPLE_VALUES: Record<CardFilterField, unknown> = {
  [CardFilterField.Type]: CardType.NormalMonster,
  [CardFilterField.FrameType]: FrameType.Normal,
  [CardFilterField.Race]: 'Warrior',
  [CardFilterField.Attribute]: CardAttribute.Dark,
  [CardFilterField.Level]: 4,
  [CardFilterField.Atk]: 1000,
  [CardFilterField.Def]: 1000,
  [CardFilterField.LinkVal]: 2,
  [CardFilterField.LinkMarkers]: LinkMarker.Top,
  [CardFilterField.Archetype]: 'Blue-Eyes'
};

describe('describeFilterFields', () => {
  it('describes every field the card domain defines and nothing else', () => {
    const fields = describeFilterFields().map(entry => entry.field);

    expect(sorted(fields)).toEqual(sorted(Object.values(CardFilterField)));
  });

  it('describes every field with the operators the card domain defines', () => {
    const known = new Set<string>(Object.values(FilterOperator));

    for (const entry of describeFilterFields()) {
      expect(entry.operators.length).toBeGreaterThan(0);
      expect(entry.operators.every(operator => known.has(operator))).toBe(true);
    }
  });

  it('gives each field the operators the card domain declares for it', () => {
    const operators = (field: CardFilterField): string[] =>
      sorted(byField().get(field)?.operators ?? []);

    expect(operators(CardFilterField.Level)).toEqual(
      sorted([
        FilterOperator.Eq,
        FilterOperator.Ne,
        FilterOperator.Gt,
        FilterOperator.Gte,
        FilterOperator.Lt,
        FilterOperator.Lte
      ])
    );
    expect(operators(CardFilterField.Type)).toEqual(
      sorted([FilterOperator.Eq, FilterOperator.Ne])
    );
    expect(operators(CardFilterField.LinkMarkers)).toEqual([
      FilterOperator.Contains
    ]);
  });

  it('offers a field exactly the operators the filter schema accepts for it', () => {
    for (const entry of describeFilterFields()) {
      for (const operator of Object.values(FilterOperator)) {
        const accepted = cardFilterSchema.safeParse({
          field: entry.field,
          operator,
          value: SAMPLE_VALUES[entry.field]
        }).success;

        expect({ field: entry.field, operator, accepted }).toEqual({
          field: entry.field,
          operator,
          accepted: entry.operators.includes(operator)
        });
      }
    }
  });

  it('enumerates the values the enumerated fields accept', () => {
    const values = (field: CardFilterField): string[] =>
      sorted(byField().get(field)?.values ?? []);

    expect(values(CardFilterField.Attribute)).toEqual(
      sorted(Object.values(CardAttribute))
    );
    expect(values(CardFilterField.Type)).toEqual(
      sorted(Object.values(CardType))
    );
    expect(values(CardFilterField.FrameType)).toEqual(
      sorted(Object.values(FrameType))
    );
    expect(values(CardFilterField.LinkMarkers)).toEqual(
      sorted(Object.values(LinkMarker))
    );
  });

  it('reports the kind of value a field takes', () => {
    expect(byField().get(CardFilterField.Level)?.valueType).toBe('integer');
    expect(byField().get(CardFilterField.Atk)?.valueType).toBe('integer');
    expect(byField().get(CardFilterField.Race)?.valueType).toBe('string');
    expect(byField().get(CardFilterField.Archetype)?.valueType).toBe('string');
  });

  it('leaves the free-text and numeric fields without enumerated values', () => {
    expect(byField().get(CardFilterField.Level)?.values).toBeUndefined();
    expect(byField().get(CardFilterField.Race)?.values).toBeUndefined();
  });

  it('gives the enumerated fields the values they accept rather than free text', () => {
    expect(byField().get(CardFilterField.Attribute)?.values).toBeDefined();
    expect(byField().get(CardFilterField.LinkMarkers)?.values).toBeDefined();
  });
});
