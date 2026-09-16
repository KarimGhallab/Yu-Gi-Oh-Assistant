import { describe, expect, it } from 'vitest';

import {
  CardAttribute,
  CardType,
  FrameType,
  Language,
  LinkMarker
} from '../enums.js';
import type { Card } from '../types.js';
import {
  CardFilterField,
  FilterOperator,
  cardFilterSchema,
  cardFiltersSchema,
  cardMatchesFilters
} from './filters.js';

const createDarkMagician = (overrides: Partial<Card> = {}): Card => ({
  id: 46986414,
  name: 'Dark Magician',
  language: Language.English,
  type: CardType.NormalMonster,
  frameType: FrameType.Normal,
  typeLine: ['Spellcaster', 'Normal'],
  race: 'Spellcaster',
  attribute: CardAttribute.Dark,
  level: 7,
  atk: 2500,
  def: 2100,
  linkMarkers: [],
  archetype: 'Dark Magician',
  effect: 'The ultimate wizard in terms of attack and defense.',
  imageUrl: 'https://images.ygoprodeck.com/images/cards/46986414.jpg',
  sourceUrl: 'https://ygoprodeck.com/card/dark-magician-4003',
  ...overrides
});

const createPotOfGreed = (): Card =>
  createDarkMagician({
    id: 55144522,
    name: 'Pot of Greed',
    type: CardType.SpellCard,
    frameType: FrameType.Spell,
    typeLine: [],
    race: 'Normal',
    attribute: undefined,
    level: undefined,
    atk: undefined,
    def: undefined,
    archetype: 'Greed',
    effect: 'Draw 2 cards.',
    imageUrl: 'https://images.ygoprodeck.com/images/cards/55144522.jpg',
    sourceUrl: 'https://ygoprodeck.com/card/pot-of-greed-4698'
  });

const createDecodeTalker = (): Card =>
  createDarkMagician({
    id: 1861629,
    name: 'Decode Talker',
    type: CardType.LinkMonster,
    frameType: FrameType.Link,
    typeLine: ['Cyberse', 'Link', 'Effect'],
    race: 'Cyberse',
    level: undefined,
    def: undefined,
    linkVal: 3,
    linkMarkers: [
      LinkMarker.Top,
      LinkMarker.BottomLeft,
      LinkMarker.BottomRight
    ],
    archetype: 'Code Talker'
  });

const accept = (
  filter: unknown
): ReturnType<typeof cardFilterSchema.safeParse> =>
  cardFilterSchema.safeParse(filter);

const rejects = (filter: unknown): boolean =>
  !cardFilterSchema.safeParse(filter).success;

describe('cardFilterSchema', () => {
  it('accepts a numeric comparison and keeps its value a number', () => {
    const result = accept({
      field: CardFilterField.Level,
      operator: FilterOperator.Lte,
      value: 4
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      field: CardFilterField.Level,
      operator: FilterOperator.Lte,
      value: 4
    });
  });

  it('accepts a text comparison', () => {
    expect(
      accept({
        field: CardFilterField.Archetype,
        operator: FilterOperator.Contains,
        value: 'Magician'
      }).success
    ).toBe(true);
  });

  it('accepts an equality filter on an enumerated field', () => {
    expect(
      accept({
        field: CardFilterField.Attribute,
        operator: FilterOperator.Eq,
        value: CardAttribute.Dark
      }).success
    ).toBe(true);
  });

  it('accepts an inequality filter on an enumerated field', () => {
    expect(
      accept({
        field: CardFilterField.Type,
        operator: FilterOperator.Ne,
        value: CardType.TrapCard
      }).success
    ).toBe(true);
  });

  it('accepts containment of a link marker', () => {
    expect(
      accept({
        field: CardFilterField.LinkMarkers,
        operator: FilterOperator.Contains,
        value: LinkMarker.BottomLeft
      }).success
    ).toBe(true);
  });

  it('rejects an unknown field', () => {
    expect(
      rejects({ field: 'name', operator: FilterOperator.Eq, value: 'Greed' })
    ).toBe(true);
  });

  it('rejects an unknown operator', () => {
    expect(
      rejects({ field: CardFilterField.Level, operator: 'matches', value: 4 })
    ).toBe(true);
  });

  it('rejects an ordering operator on a text field', () => {
    expect(
      rejects({
        field: CardFilterField.Race,
        operator: FilterOperator.Gt,
        value: 'Dragon'
      })
    ).toBe(true);
  });

  it('rejects a text operator on a numeric field', () => {
    expect(
      rejects({
        field: CardFilterField.Level,
        operator: FilterOperator.Contains,
        value: 4
      })
    ).toBe(true);
  });

  it('rejects a value outside the field enumeration', () => {
    expect(
      rejects({
        field: CardFilterField.Attribute,
        operator: FilterOperator.Eq,
        value: 'PURPLE'
      })
    ).toBe(true);
  });

  it('rejects a text operator on an enumerated field', () => {
    expect(
      rejects({
        field: CardFilterField.Attribute,
        operator: FilterOperator.Contains,
        value: CardAttribute.Dark
      })
    ).toBe(true);
  });

  it('rejects an equality operator on link markers', () => {
    expect(
      rejects({
        field: CardFilterField.LinkMarkers,
        operator: FilterOperator.Eq,
        value: LinkMarker.Top
      })
    ).toBe(true);
  });

  it('rejects a value that is not a link marker', () => {
    expect(
      rejects({
        field: CardFilterField.LinkMarkers,
        operator: FilterOperator.Contains,
        value: 'Middle'
      })
    ).toBe(true);
  });

  it('rejects an empty text value', () => {
    expect(
      rejects({
        field: CardFilterField.Archetype,
        operator: FilterOperator.Eq,
        value: ''
      })
    ).toBe(true);
  });

  it('rejects a non-numeric value on a numeric field', () => {
    expect(
      rejects({
        field: CardFilterField.Atk,
        operator: FilterOperator.Gte,
        value: 'two thousand'
      })
    ).toBe(true);
  });

  it('rejects a fractional value on a numeric field', () => {
    expect(
      rejects({
        field: CardFilterField.Atk,
        operator: FilterOperator.Gte,
        value: 2500.5
      })
    ).toBe(true);
  });

  it('rejects a filter without a value', () => {
    expect(
      rejects({ field: CardFilterField.Level, operator: FilterOperator.Eq })
    ).toBe(true);
  });
});

const NUMERIC_OPERATORS = [
  FilterOperator.Eq,
  FilterOperator.Ne,
  FilterOperator.Gt,
  FilterOperator.Gte,
  FilterOperator.Lt,
  FilterOperator.Lte
];

const STRING_OPERATORS = [
  FilterOperator.Eq,
  FilterOperator.Ne,
  FilterOperator.Contains,
  FilterOperator.StartsWith,
  FilterOperator.EndsWith
];

const EQUALITY_OPERATORS = [FilterOperator.Eq, FilterOperator.Ne];

const OPERATORS_BY_FIELD: Record<CardFilterField, FilterOperator[]> = {
  [CardFilterField.Level]: NUMERIC_OPERATORS,
  [CardFilterField.Atk]: NUMERIC_OPERATORS,
  [CardFilterField.Def]: NUMERIC_OPERATORS,
  [CardFilterField.LinkVal]: NUMERIC_OPERATORS,
  [CardFilterField.Race]: STRING_OPERATORS,
  [CardFilterField.Archetype]: STRING_OPERATORS,
  [CardFilterField.Type]: EQUALITY_OPERATORS,
  [CardFilterField.FrameType]: EQUALITY_OPERATORS,
  [CardFilterField.Attribute]: EQUALITY_OPERATORS,
  [CardFilterField.LinkMarkers]: [FilterOperator.Contains]
};

const SAMPLE_VALUE: Record<CardFilterField, string | number> = {
  [CardFilterField.Level]: 4,
  [CardFilterField.Atk]: 2500,
  [CardFilterField.Def]: 2100,
  [CardFilterField.LinkVal]: 3,
  [CardFilterField.Race]: 'Spellcaster',
  [CardFilterField.Archetype]: 'Dark Magician',
  [CardFilterField.Type]: CardType.NormalMonster,
  [CardFilterField.FrameType]: FrameType.Normal,
  [CardFilterField.Attribute]: CardAttribute.Dark,
  [CardFilterField.LinkMarkers]: LinkMarker.Top
};

describe('cardFilterSchema operator vocabulary', () => {
  it('accepts exactly the operators that fit each field', () => {
    const accepted = Object.values(CardFilterField).flatMap(field =>
      Object.values(FilterOperator)
        .filter(
          operator =>
            accept({ field, operator, value: SAMPLE_VALUE[field] }).success
        )
        .map(operator => `${field} ${operator}`)
    );
    const expected = Object.values(CardFilterField).flatMap(field =>
      OPERATORS_BY_FIELD[field].map(operator => `${field} ${operator}`)
    );

    expect(accepted.sort()).toEqual(expected.sort());
  });
});

describe('cardFiltersSchema', () => {
  it('accepts an empty set', () => {
    expect(cardFiltersSchema.safeParse([]).success).toBe(true);
  });

  it('accepts a set of compatible filters', () => {
    const result = cardFiltersSchema.safeParse([
      {
        field: CardFilterField.Race,
        operator: FilterOperator.Eq,
        value: 'Dragon'
      },
      { field: CardFilterField.Level, operator: FilterOperator.Lte, value: 4 }
    ]);

    expect(result.success).toBe(true);
  });

  it('rejects a set with one incompatible filter', () => {
    const result = cardFiltersSchema.safeParse([
      {
        field: CardFilterField.Race,
        operator: FilterOperator.Eq,
        value: 'Dragon'
      },
      {
        field: CardFilterField.Level,
        operator: FilterOperator.Contains,
        value: 4
      }
    ]);

    expect(result.success).toBe(false);
  });
});

describe('cardMatchesFilters', () => {
  it('matches every card when there is no filter', () => {
    expect(cardMatchesFilters(createDarkMagician(), [])).toBe(true);
    expect(cardMatchesFilters(createPotOfGreed(), [])).toBe(true);
  });

  it('honors numeric comparisons', () => {
    const magician = createDarkMagician();

    expect(
      cardMatchesFilters(magician, [
        { field: CardFilterField.Level, operator: FilterOperator.Lte, value: 7 }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(magician, [
        { field: CardFilterField.Level, operator: FilterOperator.Lt, value: 7 }
      ])
    ).toBe(false);
    expect(
      cardMatchesFilters(magician, [
        {
          field: CardFilterField.Atk,
          operator: FilterOperator.Gte,
          value: 2500
        }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(magician, [
        { field: CardFilterField.Def, operator: FilterOperator.Gt, value: 2100 }
      ])
    ).toBe(false);
    expect(
      cardMatchesFilters(magician, [
        { field: CardFilterField.Atk, operator: FilterOperator.Eq, value: 2500 }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(magician, [
        { field: CardFilterField.Atk, operator: FilterOperator.Ne, value: 2500 }
      ])
    ).toBe(false);
  });

  it('compares text case-insensitively', () => {
    const magician = createDarkMagician();

    expect(
      cardMatchesFilters(magician, [
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.Contains,
          value: 'magician'
        }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(magician, [
        {
          field: CardFilterField.Race,
          operator: FilterOperator.StartsWith,
          value: 'spellcaster'
        }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(magician, [
        {
          field: CardFilterField.Race,
          operator: FilterOperator.EndsWith,
          value: 'CASTER'
        }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(magician, [
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.Eq,
          value: 'dark magician'
        }
      ])
    ).toBe(true);
  });

  it('compares enumerated fields by equality', () => {
    const magician = createDarkMagician();

    expect(
      cardMatchesFilters(magician, [
        {
          field: CardFilterField.Type,
          operator: FilterOperator.Eq,
          value: CardType.NormalMonster
        }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(magician, [
        {
          field: CardFilterField.Attribute,
          operator: FilterOperator.Ne,
          value: CardAttribute.Light
        }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(magician, [
        {
          field: CardFilterField.Atk,
          operator: FilterOperator.Ne,
          value: 2500
        }
      ])
    ).toBe(false);
  });

  it('honors the link rating of a link monster', () => {
    const talker = createDecodeTalker();

    expect(
      cardMatchesFilters(talker, [
        {
          field: CardFilterField.LinkVal,
          operator: FilterOperator.Gte,
          value: 3
        }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(talker, [
        {
          field: CardFilterField.LinkVal,
          operator: FilterOperator.Gt,
          value: 3
        }
      ])
    ).toBe(false);
  });

  it('matches a card carrying the requested link marker', () => {
    const talker = createDecodeTalker();

    expect(
      cardMatchesFilters(talker, [
        {
          field: CardFilterField.LinkMarkers,
          operator: FilterOperator.Contains,
          value: LinkMarker.BottomLeft
        }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(talker, [
        {
          field: CardFilterField.LinkMarkers,
          operator: FilterOperator.Contains,
          value: LinkMarker.Right
        }
      ])
    ).toBe(false);
  });

  it('never matches a field the card does not have', () => {
    const greed = createPotOfGreed();

    expect(
      cardMatchesFilters(greed, [
        { field: CardFilterField.Level, operator: FilterOperator.Eq, value: 4 }
      ])
    ).toBe(false);
    expect(
      cardMatchesFilters(greed, [
        { field: CardFilterField.Level, operator: FilterOperator.Ne, value: 4 }
      ])
    ).toBe(false);
    expect(
      cardMatchesFilters(greed, [
        {
          field: CardFilterField.Attribute,
          operator: FilterOperator.Ne,
          value: CardAttribute.Dark
        }
      ])
    ).toBe(false);
  });

  it('requires every filter in the set to hold', () => {
    const magician = createDarkMagician();

    expect(
      cardMatchesFilters(magician, [
        {
          field: CardFilterField.Race,
          operator: FilterOperator.Eq,
          value: 'Spellcaster'
        },
        { field: CardFilterField.Level, operator: FilterOperator.Lte, value: 7 }
      ])
    ).toBe(true);
    expect(
      cardMatchesFilters(magician, [
        {
          field: CardFilterField.Race,
          operator: FilterOperator.Eq,
          value: 'Spellcaster'
        },
        { field: CardFilterField.Level, operator: FilterOperator.Lte, value: 4 }
      ])
    ).toBe(false);
  });
});
