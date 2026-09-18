import { describe, expect, it } from 'vitest';

import {
  CardAttribute,
  CardFilterField,
  type CardFilters,
  CardRace,
  CardType,
  FilterOperator,
  Language,
  LinkMarker
} from '@ygo-assistant/cards';

import { buildIdClause, buildWhereClause } from './cardPredicates.js';

const english = (filters: CardFilters): string =>
  buildWhereClause(Language.English, filters);

describe('buildWhereClause', () => {
  it('scopes every predicate to the language partition', () => {
    expect(buildWhereClause(Language.English, [])).toBe("language = 'en'");
    expect(buildWhereClause(Language.French, [])).toBe("language = 'fr'");
  });

  it('AND-combines the filters after the language', () => {
    expect(
      english([
        {
          field: CardFilterField.Level,
          operator: FilterOperator.Gte,
          value: 7
        },
        {
          field: CardFilterField.Attribute,
          operator: FilterOperator.Eq,
          value: CardAttribute.Light
        }
      ])
    ).toBe("language = 'en' AND level >= 7 AND attribute = 'LIGHT'");
  });

  it('renders every numeric comparator', () => {
    const comparators = [
      [FilterOperator.Eq, '='],
      [FilterOperator.Ne, '<>'],
      [FilterOperator.Gt, '>'],
      [FilterOperator.Gte, '>='],
      [FilterOperator.Lt, '<'],
      [FilterOperator.Lte, '<=']
    ] as const;

    for (const [operator, sql] of comparators) {
      expect(
        english([{ field: CardFilterField.Level, operator, value: 7 }])
      ).toBe(`language = 'en' AND level ${sql} 7`);
    }
  });

  it('compares an enumerated field exactly, without lowering it', () => {
    expect(
      english([
        {
          field: CardFilterField.Type,
          operator: FilterOperator.Eq,
          value: CardType.SpellCard
        }
      ])
    ).toBe("language = 'en' AND type = 'Spell Card'");

    expect(
      english([
        {
          field: CardFilterField.Attribute,
          operator: FilterOperator.Ne,
          value: CardAttribute.Dark
        }
      ])
    ).toBe("language = 'en' AND attribute <> 'DARK'");

    expect(
      english([
        {
          field: CardFilterField.Race,
          operator: FilterOperator.Eq,
          value: CardRace.Dragon
        }
      ])
    ).toBe("language = 'en' AND race = 'Dragon'");
  });

  it('compares a text field case-insensitively on both sides', () => {
    expect(
      english([
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.Contains,
          value: 'magician'
        }
      ])
    ).toBe(
      "language = 'en' AND strpos(lower(archetype), lower('magician')) > 0"
    );

    expect(
      english([
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.StartsWith,
          value: 'code'
        }
      ])
    ).toBe("language = 'en' AND starts_with(lower(archetype), lower('code'))");

    expect(
      english([
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.EndsWith,
          value: 'talker'
        }
      ])
    ).toBe("language = 'en' AND ends_with(lower(archetype), lower('talker'))");

    expect(
      english([
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.Ne,
          value: 'Greed'
        }
      ])
    ).toBe("language = 'en' AND lower(archetype) <> lower('Greed')");
  });

  it('matches a link marker by containment', () => {
    expect(
      english([
        {
          field: CardFilterField.LinkMarkers,
          operator: FilterOperator.Contains,
          value: LinkMarker.BottomLeft
        }
      ])
    ).toBe("language = 'en' AND array_contains(linkMarkers, 'Bottom-Left')");
  });

  it('doubles a quote inside a value and leaves percent signs alone', () => {
    expect(
      english([
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.Eq,
          value: "Gravekeeper's"
        }
      ])
    ).toBe("language = 'en' AND lower(archetype) = lower('Gravekeeper''s')");

    expect(
      english([
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.Contains,
          value: '%'
        }
      ])
    ).toBe("language = 'en' AND strpos(lower(archetype), lower('%')) > 0");
  });

  it('refuses a non-integer numeric value', () => {
    expect(() =>
      english([
        {
          field: CardFilterField.Atk,
          operator: FilterOperator.Gte,
          value: 2000.5
        }
      ])
    ).toThrow(/integer/);
  });
});

describe('buildIdClause', () => {
  it('renders the ids as numbers', () => {
    expect(buildIdClause([46986414, 55144522])).toBe(
      'id IN (46986414, 55144522)'
    );
  });

  it('renders an empty id list as an empty list', () => {
    expect(buildIdClause([])).toBe('id IN ()');
  });
});
