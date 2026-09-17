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
  archetype: 'Dark Magician',
  effect: "''Mage suprême en termes d'attaque et de défense.''",
  imageUrl: 'https://images.ygoprodeck.com/images/cards/46986414.jpg',
  sourceUrl: 'https://ygoprodeck.com/card/dark-magician-4003',
  ...overrides
});

describe('composeCardDocument', () => {
  it('lays out the name, the archetype, and the effect', () => {
    expect(composeCardDocument(createCard())).toBe(
      [
        'Magicien Sombre',
        'Archetype: Dark Magician',
        "''Mage suprême en termes d'attaque et de défense.''"
      ].join('\n')
    );
  });

  it('leaves the archetype out when the card has none', () => {
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
        archetype: undefined,
        effect: 'Draw 2 cards.'
      })
    );

    expect(document).toBe(['Pot of Greed', 'Draw 2 cards.'].join('\n'));
  });

  it('ignores every field retrieval filters on', () => {
    const name = 'Decode Talker';
    const archetype = 'Code Talker';
    const effect = 'Gains 500 ATK for each monster it points to.';

    const link = createCard({
      name,
      archetype,
      effect,
      type: CardType.LinkMonster,
      frameType: FrameType.Link,
      typeLine: ['Cyberse', 'Link', 'Effect'],
      race: 'Cyberse',
      level: undefined,
      atk: 2300,
      def: undefined,
      linkVal: 3,
      linkMarkers: [LinkMarker.Top]
    });
    const normal = createCard({ name, archetype, effect });

    expect(composeCardDocument(link)).toBe(composeCardDocument(normal));
  });

  it('normalizes Windows line endings in the effect text', () => {
    const document = composeCardDocument(
      createCard({ effect: 'Line one.\r\nLine two.' })
    );

    expect(document).toContain('Line one.\nLine two.');
  });
});
