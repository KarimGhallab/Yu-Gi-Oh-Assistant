import { describe, expect, it } from 'vitest';

import {
  type Card,
  CardAttribute,
  CardType,
  FrameType,
  Language,
  LinkMarker
} from '@ygo-assistant/cards';

import { composeCardDocument } from './composeCardDocument.js';

const createCard = (overrides: Partial<Card> = {}): Card => ({
  id: 46986414,
  name: 'Magicien Sombre',
  language: Language.French,
  type: CardType.NormalMonster,
  frameType: FrameType.Normal,
  typeLine: ['Spellcaster', 'Normal'],
  race: 'Spellcaster',
  attribute: CardAttribute.Dark,
  level: 7,
  atk: 2500,
  def: 2100,
  linkMarkers: [],
  effect: "''Mage suprême en termes d'attaque et de défense.''",
  imageUrl: 'https://images.ygoprodeck.com/images/cards/46986414.jpg',
  sourceUrl: 'https://ygoprodeck.com/card/dark-magician-4003',
  ...overrides
});

describe('composeCardDocument', () => {
  it('lays out the name, type, attribute, race, level, stats, and effect', () => {
    expect(composeCardDocument(createCard())).toBe(
      [
        'Magicien Sombre',
        'Type: Spellcaster / Normal',
        'Attribute: DARK',
        'Race: Spellcaster',
        'Level: 7',
        'ATK: 2500',
        'DEF: 2100',
        "Effect: ''Mage suprême en termes d'attaque et de défense.''"
      ].join('\n')
    );
  });

  it('falls back to the card type when there is no type line, and omits absent stats', () => {
    const document = composeCardDocument(
      createCard({
        name: 'Pot of Greed',
        type: CardType.SpellCard,
        frameType: FrameType.Spell,
        typeLine: [],
        race: 'Normal',
        attribute: undefined,
        level: undefined,
        atk: undefined,
        def: undefined,
        effect: 'Draw 2 cards.'
      })
    );

    expect(document).toBe(
      [
        'Pot of Greed',
        'Type: Spell Card',
        'Race: Normal',
        'Effect: Draw 2 cards.'
      ].join('\n')
    );
  });

  it('adds the link rating and markers for a link monster', () => {
    const document = composeCardDocument(
      createCard({
        name: 'Decode Talker',
        type: CardType.LinkMonster,
        frameType: FrameType.Link,
        typeLine: ['Cyberse', 'Link', 'Effect'],
        race: 'Cyberse',
        level: undefined,
        atk: 2300,
        def: undefined,
        linkVal: 3,
        linkMarkers: [
          LinkMarker.Top,
          LinkMarker.BottomLeft,
          LinkMarker.BottomRight
        ],
        effect: 'Gains 500 ATK for each monster it points to.'
      })
    );

    expect(document).toBe(
      [
        'Decode Talker',
        'Type: Cyberse / Link / Effect',
        'Attribute: DARK',
        'Race: Cyberse',
        'Link Rating: 3',
        'Link Markers: Top, Bottom-Left, Bottom-Right',
        'ATK: 2300',
        'Effect: Gains 500 ATK for each monster it points to.'
      ].join('\n')
    );
  });

  it('normalizes Windows line endings in the effect text', () => {
    const document = composeCardDocument(
      createCard({ effect: 'Line one.\r\nLine two.' })
    );

    expect(document).toContain('Effect: Line one.\nLine two.');
  });
});
