import { describe, expect, it } from 'vitest';

import {
  CardAttribute,
  CardFilterField,
  CardType,
  FilterOperator,
  FrameType,
  LinkMarker
} from '@ygo-assistant/cards';

import {
  type FilterFieldVocabulary,
  describeFilterFields
} from './vocabulary.js';

const sorted = (values: readonly string[]): string[] => [...values].sort();

const byField = (): Map<string, FilterFieldVocabulary> =>
  new Map(describeFilterFields().map(entry => [entry.field, entry]));

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
