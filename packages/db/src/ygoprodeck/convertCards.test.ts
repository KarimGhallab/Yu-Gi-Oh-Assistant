import { describe, expect, it } from 'vitest';

import {
  CardAttribute,
  CardType,
  FrameType,
  Language,
  LinkMarker
} from '@ygo-assistant/cards';

import { convertCardInfoResponse } from './convertCards.js';

const createRawCard = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 46986414,
  name: 'Dark Magician',
  desc: "''The ultimate wizard in terms of attack and defense.''",
  typeline: ['Spellcaster', 'Normal'],
  type: 'Normal Monster',
  frameType: 'normal',
  race: 'Spellcaster',
  attribute: 'DARK',
  level: 7,
  atk: 2500,
  def: 2100,
  archetype: 'Dark Magician',
  ygoprodeck_url: 'https://ygoprodeck.com/card/dark-magician-4003',
  card_images: [
    { image_url: 'https://images.ygoprodeck.com/images/cards/46986414.jpg' }
  ],
  ...overrides
});

const convert = (
  card: Record<string, unknown>,
  language: Language = Language.English
): ReturnType<typeof convertCardInfoResponse> =>
  convertCardInfoResponse({ data: [card] }, language);

describe('convertCardInfoResponse', () => {
  it('converts an English monster into a card record', () => {
    const [card] = convert(createRawCard());

    expect(card).toEqual({
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
      effect: "''The ultimate wizard in terms of attack and defense.''",
      imageUrl: 'https://images.ygoprodeck.com/images/cards/46986414.jpg',
      sourceUrl: 'https://ygoprodeck.com/card/dark-magician-4003'
    });
  });

  it('keeps the localized text and still maps the shared enums for French', () => {
    const [card] = convert(
      createRawCard({
        name: 'Magicien Sombre',
        desc: "Mage suprême en termes d'attaque et de défense."
      }),
      Language.French
    );

    expect(card.name).toBe('Magicien Sombre');
    expect(card.effect).toBe("Mage suprême en termes d'attaque et de défense.");
    expect(card.language).toBe(Language.French);
    expect(card.type).toBe(CardType.NormalMonster);
    expect(card.attribute).toBe(CardAttribute.Dark);
  });

  it('drops link monsters to their link data, without a level or DEF', () => {
    const [card] = convert(
      createRawCard({
        id: 1861629,
        name: 'Decode Talker',
        typeline: ['Cyberse', 'Link', 'Effect'],
        type: 'Link Monster',
        frameType: 'link',
        race: 'Cyberse',
        attribute: 'DARK',
        level: 0,
        atk: 2300,
        def: null,
        linkval: 3,
        linkmarkers: ['Top', 'Bottom-Left', 'Bottom-Right'],
        archetype: 'Code Talker',
        desc: '2+ Effect Monsters'
      })
    );

    expect(card.level).toBeUndefined();
    expect(card.def).toBeUndefined();
    expect(card.linkVal).toBe(3);
    expect(card.linkMarkers).toEqual([
      LinkMarker.Top,
      LinkMarker.BottomLeft,
      LinkMarker.BottomRight
    ]);
    expect(card.typeLine).toEqual(['Cyberse', 'Link', 'Effect']);
  });

  it('leaves a spell without attribute, level, stats, or a type line', () => {
    const [card] = convert(
      createRawCard({
        id: 55144522,
        name: 'Pot of Greed',
        typeline: undefined,
        type: 'Spell Card',
        frameType: 'spell',
        race: 'Normal',
        attribute: undefined,
        level: undefined,
        atk: undefined,
        def: undefined,
        archetype: 'Greed',
        desc: 'Draw 2 cards.'
      })
    );

    expect(card.type).toBe(CardType.SpellCard);
    expect(card.typeLine).toEqual([]);
    expect(card.attribute).toBeUndefined();
    expect(card.level).toBeUndefined();
    expect(card.atk).toBeUndefined();
    expect(card.def).toBeUndefined();
    expect(card.effect).toBe('Draw 2 cards.');
  });

  it('drops tokens and Skill Cards', () => {
    const cards = convertCardInfoResponse(
      {
        data: [
          createRawCard({
            name: 'Ojama Token',
            typeline: undefined,
            type: 'Token',
            frameType: 'token',
            attribute: undefined,
            level: undefined,
            atk: undefined,
            def: undefined
          }),
          createRawCard({
            name: 'Draw Sense: DARK',
            typeline: undefined,
            type: 'Skill Card',
            frameType: 'skill',
            attribute: undefined,
            level: undefined,
            atk: undefined,
            def: undefined
          })
        ]
      },
      Language.English
    );

    expect(cards).toEqual([]);
  });
});
