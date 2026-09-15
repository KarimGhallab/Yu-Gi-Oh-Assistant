import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  type Card,
  CardAttribute,
  CardType,
  FrameType,
  Language
} from '@ygo-assistant/cards';
import type { IOllamaClient } from '@ygo-assistant/ollama';

import { composeCardDocument } from '../ygoprodeck/composeCardDocument.js';
import { buildCardIndex, readCardIndex } from './cardIndex.js';

const DIMENSIONS = 3;
const EMBEDDING_MODEL = 'qwen3-embedding:0.6b';

const createEmbedder = (
  batches: string[][],
  dimensions: number = DIMENSIONS
): IOllamaClient => ({
  listModels: async () => [],
  embed: async inputs => {
    batches.push(inputs);
    return inputs.map((_, index) =>
      Array.from({ length: dimensions }, (_, dimension) => index + dimension)
    );
  },
  chat: () => {
    throw new Error('The card index never streams chat completions');
  }
});

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
  effect: "''The ultimate wizard in terms of attack and defense.''",
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

describe('card index', () => {
  let dataDir: string | undefined;

  afterEach(async () => {
    if (dataDir !== undefined) {
      await rm(dataDir, { recursive: true, force: true });
    }
    dataDir = undefined;
  });

  const createDataDir = async (): Promise<string> => {
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-card-index-'));
    return dataDir;
  };

  it('builds one row per card and reads the rows, count, and metadata back', async () => {
    const directory = await createDataDir();
    const cards = [createDarkMagician(), createPotOfGreed()];

    await buildCardIndex({
      dataDir: directory,
      cards,
      embedder: createEmbedder([]),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-15'
    });

    const { rows, count, metadata } = await readCardIndex(directory);

    expect(count).toBe(2);
    expect(rows).toHaveLength(2);
    expect(metadata).toEqual({
      datasetVersion: 'ygoprodeck-2026-09-15',
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS
    });

    const magician = rows.find(row => row.name === 'Dark Magician');
    expect(magician).toMatchObject({
      id: 46986414,
      language: Language.English,
      type: CardType.NormalMonster,
      frameType: FrameType.Normal,
      typeLine: ['Spellcaster', 'Normal'],
      attribute: CardAttribute.Dark,
      level: 7,
      atk: 2500,
      def: 2100,
      linkMarkers: [],
      archetype: 'Dark Magician'
    });
    expect(magician?.vector).toHaveLength(DIMENSIONS);

    const greed = rows.find(row => row.name === 'Pot of Greed');
    expect(greed?.attribute).toBeUndefined();
    expect(greed?.level).toBeUndefined();
    expect(greed?.typeLine).toEqual([]);
  });

  it('embeds every composed document in a single batch', async () => {
    const directory = await createDataDir();
    const cards = [createDarkMagician(), createPotOfGreed()];
    const batches: string[][] = [];

    await buildCardIndex({
      dataDir: directory,
      cards,
      embedder: createEmbedder(batches),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-15'
    });

    expect(batches).toHaveLength(1);
    expect(batches[0]).toEqual([
      composeCardDocument(cards[0]),
      composeCardDocument(cards[1])
    ]);
  });

  it('stores one row per card per language', async () => {
    const directory = await createDataDir();
    const english = createDarkMagician();
    const french = createDarkMagician({
      language: Language.French,
      name: 'Magicien Sombre'
    });

    await buildCardIndex({
      dataDir: directory,
      cards: [english, french],
      embedder: createEmbedder([]),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-15'
    });

    const { rows, count } = await readCardIndex(directory);

    expect(count).toBe(2);
    expect(rows.map(row => row.name).sort()).toEqual([
      'Dark Magician',
      'Magicien Sombre'
    ]);
    expect(rows.map(row => row.language).sort()).toEqual([
      Language.English,
      Language.French
    ]);
  });

  it('replaces an existing index on rebuild', async () => {
    const directory = await createDataDir();
    const embedder = createEmbedder([]);

    await buildCardIndex({
      dataDir: directory,
      cards: [createDarkMagician(), createPotOfGreed()],
      embedder,
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-15'
    });
    await buildCardIndex({
      dataDir: directory,
      cards: [createPotOfGreed()],
      embedder,
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-16'
    });

    const { rows, count, metadata } = await readCardIndex(directory);

    expect(count).toBe(1);
    expect(rows.map(row => row.name)).toEqual(['Pot of Greed']);
    expect(metadata.datasetVersion).toBe('ygoprodeck-2026-09-16');
  });
});
