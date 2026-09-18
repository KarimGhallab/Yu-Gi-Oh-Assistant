import { describe, expect, it } from 'vitest';

import {
  CardAttribute,
  CardFilterField,
  CardRace,
  CardType,
  FilterOperator
} from '@ygo-assistant/cards';

import { dropContradictions } from './dropContradictions.js';

describe('dropContradictions', () => {
  it('drops equality filters on one field that disagree', () => {
    const filters = dropContradictions([
      {
        field: CardFilterField.Type,
        operator: FilterOperator.Eq,
        value: CardType.SpellCard
      },
      {
        field: CardFilterField.Type,
        operator: FilterOperator.Eq,
        value: CardType.TrapCard
      }
    ]);

    expect(filters).toEqual([]);
  });

  it('keeps a range on one field', () => {
    const filters = dropContradictions([
      {
        field: CardFilterField.Level,
        operator: FilterOperator.Gte,
        value: 4
      },
      {
        field: CardFilterField.Level,
        operator: FilterOperator.Lte,
        value: 6
      }
    ]);

    expect(filters).toHaveLength(2);
  });

  it('keeps disjoint fields untouched', () => {
    const filters = dropContradictions([
      {
        field: CardFilterField.Type,
        operator: FilterOperator.Eq,
        value: CardType.SpellCard
      },
      {
        field: CardFilterField.Attribute,
        operator: FilterOperator.Eq,
        value: CardAttribute.Dark
      }
    ]);

    expect(filters).toHaveLength(2);
  });

  it('keeps a repeated equality on the same value', () => {
    const filters = dropContradictions([
      {
        field: CardFilterField.Race,
        operator: FilterOperator.Eq,
        value: CardRace.Dragon
      },
      {
        field: CardFilterField.Race,
        operator: FilterOperator.Eq,
        value: CardRace.Dragon
      }
    ]);

    expect(filters).toHaveLength(2);
  });
});
