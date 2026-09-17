import { describe, expect, it } from 'vitest';

import {
  CardAttribute,
  CardType,
  FrameType,
  Language,
  LinkMarker
} from '../enums.js';
import { cardSchema } from './schema.js';

const darkMagician = {
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
};

describe('cardSchema', () => {
  it('accepts a card with every field the source provides', () => {
    expect(cardSchema.safeParse(darkMagician).success).toBe(true);
  });

  it('accepts a card without the fields its kind omits', () => {
    const link = {
      ...darkMagician,
      id: 1861629,
      name: 'Decode Talker',
      type: CardType.LinkMonster,
      frameType: FrameType.Link,
      race: 'Cyberse',
      attribute: undefined,
      level: undefined,
      atk: 2300,
      def: undefined,
      linkVal: 3,
      linkMarkers: [LinkMarker.Top, LinkMarker.BottomLeft],
      archetype: undefined
    };

    expect(cardSchema.safeParse(link).success).toBe(true);
  });

  it('refuses a card the catalog could not hold', () => {
    expect(cardSchema.safeParse({ ...darkMagician, id: 0 }).success).toBe(
      false
    );
    expect(cardSchema.safeParse({ ...darkMagician, name: '' }).success).toBe(
      false
    );
    expect(
      cardSchema.safeParse({ ...darkMagician, attribute: 'PLASMA' }).success
    ).toBe(false);
    expect(
      cardSchema.safeParse({ ...darkMagician, linkMarkers: ['Up'] }).success
    ).toBe(false);
  });

  it('refuses a card that does not say what it is', () => {
    const { name, ...nameless } = darkMagician;

    expect(name).toBe('Dark Magician');
    expect(cardSchema.safeParse(nameless).success).toBe(false);
  });
});
