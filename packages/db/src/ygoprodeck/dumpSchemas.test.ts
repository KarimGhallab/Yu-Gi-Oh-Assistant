import { describe, expect, it } from 'vitest';

import { CardType, FrameType } from '@ygo-assistant/cards';

import { cardInfoResponseSchema } from './dumpSchemas.js';

const createRawCard = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 46986414,
  name: 'Dark Magician',
  desc: 'The ultimate wizard in terms of attack and defense.',
  type: CardType.NormalMonster,
  frameType: FrameType.Normal,
  race: 'Spellcaster',
  ygoprodeck_url: 'https://ygoprodeck.com/card/dark-magician-4003',
  card_images: [
    { image_url: 'https://images.ygoprodeck.com/images/cards/46986414.jpg' }
  ],
  ...overrides
});

const accepts = (overrides: Record<string, unknown> = {}): boolean =>
  cardInfoResponseSchema.safeParse({ data: [createRawCard(overrides)] })
    .success;

describe('cardInfoResponseSchema', () => {
  it('accepts a well-formed card', () => {
    expect(accepts()).toBe(true);
  });

  it('rejects an image URL that is not https', () => {
    expect(
      accepts({
        card_images: [
          { image_url: 'http://images.ygoprodeck.com/images/cards/1.jpg' }
        ]
      })
    ).toBe(false);
  });

  it('rejects a source URL on a host the source does not own', () => {
    expect(
      accepts({ ygoprodeck_url: 'https://evil.example/card/dark-magician' })
    ).toBe(false);
  });

  it('rejects an over-long name', () => {
    expect(accepts({ name: 'x'.repeat(301) })).toBe(false);
  });

  it('rejects an over-long effect', () => {
    expect(accepts({ desc: 'x'.repeat(20_001) })).toBe(false);
  });

  it('rejects an over-long type line', () => {
    expect(accepts({ typeline: ['x'.repeat(101)] })).toBe(false);
  });
});
