import { describe, expect, it } from 'vitest';

import {
  CardAttribute,
  CardType,
  FrameType,
  Language
} from '@ygo-assistant/cards';

import { StoredValueError } from '../storedValue.js';
import { normalizeCard, toArchetype } from './normalizeCard.js';

/**
 * A row as LanceDB hands it back for an Effect Monster: the enum columns as
 * plain strings, the list columns as arrays, and the absent columns as null.
 */
const createRow = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
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
  linkVal: null,
  linkMarkers: [],
  archetype: 'Dark Magician',
  effect: 'The ultimate wizard in terms of attack and defense.',
  imageUrl: 'https://images.ygoprodeck.com/images/cards/46986414.jpg',
  sourceUrl: 'https://ygoprodeck.com/card/dark-magician-4003',
  ...overrides
});

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

describe('the card row adapter', () => {
  it('reads a stored row back into a card', () => {
    expect(normalizeCard(createRow())).toEqual({
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
      sourceUrl: 'https://ygoprodeck.com/card/dark-magician-4003'
    });
  });

  it('raises when a column does not hold what the schema promised', () => {
    const raised = capture(() => normalizeCard(createRow({ level: 'seven' })));

    expect(raised.field).toBe('level');
    expect(raised.source).toBe('the card index');
    expect(raised.message).toBe(
      'Unexpected value for "level" in the card index: seven'
    );
  });

  it('raises when an enum column is not a member', () => {
    const raised = capture(() =>
      normalizeCard(createRow({ type: 'Nonsense' }))
    );

    expect(raised.field).toBe('type');
  });

  it('reads an archetype cell, skipping an absent or empty one', () => {
    expect(toArchetype('Dark Magician')).toBe('Dark Magician');
    expect(toArchetype(null)).toBeUndefined();
    expect(toArchetype(undefined)).toBeUndefined();
    expect(toArchetype('')).toBeUndefined();

    const raised = capture(() => toArchetype(7));

    expect(raised.field).toBe('archetype');
  });
});
