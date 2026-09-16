import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  type Card,
  CardAttribute,
  CardFilterField,
  type CardFilters,
  CardType,
  FilterOperator,
  FrameType,
  Language
} from '@ygo-assistant/cards';
import { buildCardIndex } from '@ygo-assistant/db';
import type { IOllamaClient } from '@ygo-assistant/ollama';

import { retrieveCards } from './retrieval.js';
import type { RetrievalQuery, RetrievalRanking } from './types.js';

const DIMENSIONS = 3;
const EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
const QUERY_VECTOR = [1, 0, 0];

const createCard = (overrides: Partial<Card> = {}): Card => ({
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
  createCard({
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

const createBlueEyes = (): Card =>
  createCard({
    id: 89631139,
    name: 'Blue-Eyes White Dragon',
    attribute: CardAttribute.Light,
    race: 'Dragon',
    level: 8,
    atk: 3000,
    def: 2500,
    archetype: 'Blue-Eyes'
  });

const createMagicienSombre = (): Card =>
  createCard({ language: Language.French, name: 'Magicien Sombre' });

const createScriptedEmbedder = (vectors: number[][]): IOllamaClient => {
  let cursor = 0;
  return {
    listModels: async () => [],
    embed: async inputs => {
      const batch = vectors.slice(cursor, cursor + inputs.length);
      cursor += inputs.length;
      return batch;
    },
    chat: () => {
      throw new Error('Retrieval never streams chat completions');
    }
  };
};

interface QueryEmbedder {
  embedder: IOllamaClient;
  texts: string[];
}

const createQueryEmbedder = (vector: number[]): QueryEmbedder => {
  const texts: string[] = [];
  return {
    texts,
    embedder: {
      listModels: async () => [],
      embed: async inputs => {
        texts.push(...inputs);
        return inputs.map(() => vector);
      },
      chat: () => {
        throw new Error('Retrieval never streams chat completions');
      }
    }
  };
};

describe('retrieveCards', () => {
  let dataDir: string | undefined;

  afterEach(async () => {
    if (dataDir !== undefined) {
      await rm(dataDir, { recursive: true, force: true });
    }
    dataDir = undefined;
  });

  const createDataDir = async (): Promise<string> => {
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-retrieval-'));
    return dataDir;
  };

  const seed = async (
    directory: string,
    cards: Card[],
    vectors: number[][]
  ): Promise<void> => {
    await buildCardIndex({
      dataDir: directory,
      cards,
      embedder: createScriptedEmbedder(vectors),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-16'
    });
  };

  const retrieve = (
    directory: string,
    embedder: IOllamaClient,
    language: Language = Language.English,
    topK: number = 25,
    minScore: number = 0
  ) =>
    retrieveCards({
      dataDir: directory,
      embedder,
      query: { text: 'cards that banish monsters', language },
      ranking: { topK, minScore }
    });

  const retrieveWith = (
    directory: string,
    embedder: IOllamaClient,
    query: Partial<RetrievalQuery>,
    ranking: Partial<RetrievalRanking> = {}
  ) =>
    retrieveCards({
      dataDir: directory,
      embedder,
      query: { language: Language.English, ...query },
      ranking: { topK: 25, minScore: 0, ...ranking }
    });

  const levelAtLeast = (level: number): CardFilters => [
    {
      field: CardFilterField.Level,
      operator: FilterOperator.Gte,
      value: level
    }
  ];

  it('returns the nearest cards ordered by score', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [createCard(), createPotOfGreed(), createBlueEyes()],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    );
    const { embedder } = createQueryEmbedder(QUERY_VECTOR);

    const results = await retrieve(directory, embedder);

    expect(results.map(result => result.card.name)).toEqual([
      'Dark Magician',
      'Pot of Greed',
      'Blue-Eyes White Dragon'
    ]);
    expect(results[0].score).toBeCloseTo(1, 5);
    expect(results[1].score).toBeCloseTo(Math.SQRT1_2, 5);
    expect(results[2].score).toBeCloseTo(0, 5);
    expect(results[0].card.effect).toContain('wizard');
  });

  it('embeds the free-text request', async () => {
    const directory = await createDataDir();
    await seed(directory, [createCard()], [[1, 0, 0]]);
    const { embedder, texts } = createQueryEmbedder(QUERY_VECTOR);

    await retrieve(directory, embedder);

    expect(texts).toEqual(['cards that banish monsters']);
  });

  it('scopes the retrieval to the active language', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [createCard(), createMagicienSombre()],
      [
        [1, 0, 0],
        [1, 0, 0]
      ]
    );

    const english = await retrieve(
      directory,
      createQueryEmbedder(QUERY_VECTOR).embedder
    );
    const french = await retrieve(
      directory,
      createQueryEmbedder(QUERY_VECTOR).embedder,
      Language.French
    );

    expect(english.map(result => result.card.name)).toEqual(['Dark Magician']);
    expect(french.map(result => result.card.name)).toEqual(['Magicien Sombre']);
  });

  it('drops candidates below the similarity floor', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [createCard(), createPotOfGreed(), createBlueEyes()],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    );
    const { embedder } = createQueryEmbedder(QUERY_VECTOR);

    const results = await retrieve(
      directory,
      embedder,
      Language.English,
      25,
      0.9
    );

    expect(results.map(result => result.card.name)).toEqual(['Dark Magician']);
  });

  it('returns nothing when no candidate clears the floor', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [createCard(), createPotOfGreed(), createBlueEyes()],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    );
    const { embedder } = createQueryEmbedder([0, 0, 1]);

    const results = await retrieve(
      directory,
      embedder,
      Language.English,
      25,
      0.5
    );

    expect(results).toEqual([]);
  });

  it('limits the candidates to the requested count', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [createCard(), createPotOfGreed(), createBlueEyes()],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    );
    const { embedder } = createQueryEmbedder(QUERY_VECTOR);

    const results = await retrieve(directory, embedder, Language.English, 2);

    expect(results.map(result => result.card.name)).toEqual([
      'Dark Magician',
      'Pot of Greed'
    ]);
  });

  it('deduplicates candidates that share a card identity', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [
        createCard({ id: 46986414, name: 'Dark Magician' }),
        createCard({ id: 46986414, name: 'Dark Magician (alternate)' })
      ],
      [
        [1, 1, 0],
        [1, 0, 0]
      ]
    );
    const { embedder } = createQueryEmbedder(QUERY_VECTOR);

    const results = await retrieve(directory, embedder);

    expect(results).toHaveLength(1);
    expect(results[0].card.name).toBe('Dark Magician (alternate)');
    expect(results[0].score).toBeCloseTo(1, 5);
  });

  it('pre-filters on the structured fields before ranking semantically', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [createCard(), createPotOfGreed(), createBlueEyes()],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    );
    const { embedder } = createQueryEmbedder(QUERY_VECTOR);

    const results = await retrieveWith(directory, embedder, {
      text: 'draw cards',
      filters: [
        {
          field: CardFilterField.Type,
          operator: FilterOperator.Eq,
          value: CardType.SpellCard
        }
      ]
    });

    expect(results.map(result => result.card.name)).toEqual(['Pot of Greed']);
    expect(results[0].score).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it('returns every match of a filter-only request in a stable order', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [createCard(), createPotOfGreed(), createBlueEyes()],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    );
    const { embedder, texts } = createQueryEmbedder(QUERY_VECTOR);

    const results = await retrieveWith(directory, embedder, {
      filters: levelAtLeast(7)
    });

    expect(results.map(result => result.card.name)).toEqual([
      'Dark Magician',
      'Blue-Eyes White Dragon'
    ]);
    expect(results.map(result => result.score)).toEqual([1, 1]);
    expect(texts).toEqual([]);
  });

  it('AND-combines several filters while ranking by intent', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [createCard(), createPotOfGreed(), createBlueEyes()],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    );
    const { embedder } = createQueryEmbedder(QUERY_VECTOR);

    const results = await retrieveWith(directory, embedder, {
      text: 'a powerful monster',
      filters: [
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
      ]
    });

    expect(results.map(result => result.card.name)).toEqual([
      'Blue-Eyes White Dragon'
    ]);
  });

  it('scopes a filter-only request to the active language', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [createCard(), createMagicienSombre()],
      [
        [1, 0, 0],
        [1, 0, 0]
      ]
    );
    const { embedder } = createQueryEmbedder(QUERY_VECTOR);

    const french = await retrieveWith(directory, embedder, {
      language: Language.French,
      filters: levelAtLeast(7)
    });

    expect(french.map(result => result.card.name)).toEqual(['Magicien Sombre']);
  });

  it('returns nothing when no card matches the filters', async () => {
    const directory = await createDataDir();
    await seed(
      directory,
      [createCard(), createPotOfGreed(), createBlueEyes()],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    );
    const { embedder } = createQueryEmbedder(QUERY_VECTOR);

    const results = await retrieveWith(directory, embedder, {
      filters: levelAtLeast(11)
    });

    expect(results).toEqual([]);
  });
});
