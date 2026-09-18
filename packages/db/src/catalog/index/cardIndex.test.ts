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
  Language,
  LinkMarker
} from '@ygo-assistant/cards';
import type { ILogger, LogContext } from '@ygo-assistant/logger';
import {
  type IOllamaClient,
  OllamaInvalidResponseError
} from '@ygo-assistant/ollama';

import { readCardIndex } from '../../testing/readCardIndex.js';
import { composeCardDocument } from '../../ygoprodeck/compose/composeCardDocument.js';
import { CardCatalog } from '../CardCatalog.js';
import { buildCardIndex } from './cardIndex.js';

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
      throw new Error('The card index never streams chat completions');
    }
  };
};

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

  it('lists the archetypes the index carries, once each and sorted', async () => {
    const directory = await createDataDir();
    const cards = [
      createDarkMagician(),
      createDarkMagician({
        id: 2,
        name: 'Dark Magician Girl',
        archetype: 'Dark Magician'
      }),
      createDarkMagician({
        id: 3,
        name: 'Blue-Eyes White Dragon',
        archetype: 'Blue-Eyes'
      }),
      createDarkMagician({ id: 4, name: 'Kuriboh', archetype: undefined })
    ];

    await buildCardIndex({
      dataDir: directory,
      cards,
      embedder: createEmbedder([]),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-15'
    });

    const catalog = await CardCatalog.getInstance(directory);
    expect(await catalog.archetypes()).toEqual(['Blue-Eyes', 'Dark Magician']);
  });

  it('lists no archetype at all when the index carries none', async () => {
    const directory = await createDataDir();

    await buildCardIndex({
      dataDir: directory,
      cards: [
        createDarkMagician({ id: 4, name: 'Kuriboh', archetype: undefined })
      ],
      embedder: createEmbedder([]),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-15'
    });

    const catalog = await CardCatalog.getInstance(directory);
    expect(await catalog.archetypes()).toEqual([]);
  });

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

  it('embeds documents in batches of the configured size', async () => {
    const directory = await createDataDir();
    const cards = [
      createDarkMagician(),
      createPotOfGreed(),
      createDarkMagician({ id: 89631139, name: 'Blue-Eyes White Dragon' })
    ];
    const batches: string[][] = [];

    await buildCardIndex({
      dataDir: directory,
      cards,
      embedder: createEmbedder(batches),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-15',
      batchSize: 2
    });

    expect(batches.map(batch => batch.length)).toEqual([2, 1]);
    expect(batches.flat()).toEqual(cards.map(composeCardDocument));
  });

  it('records the embedding progress batch by batch', async () => {
    const directory = await createDataDir();
    const cards = [
      createDarkMagician(),
      createPotOfGreed(),
      createDarkMagician({ id: 89631139, name: 'Blue-Eyes White Dragon' })
    ];
    const records: Array<{ message: string; context?: LogContext }> = [];
    const logger: ILogger = {
      debug: () => {},
      info: (message, context) => {
        records.push({ message, context });
      },
      warn: () => {},
      error: () => {}
    };

    await buildCardIndex({
      dataDir: directory,
      cards,
      embedder: createEmbedder([]),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-15',
      batchSize: 2,
      logger
    });

    expect(records).toEqual([
      {
        message: 'Embedded card batch',
        context: { batch: 1, batches: 2, embedded: 2, total: 3 }
      },
      {
        message: 'Embedded card batch',
        context: { batch: 2, batches: 2, embedded: 3, total: 3 }
      }
    ]);
  });

  it('retries a transient embedding failure', async () => {
    const directory = await createDataDir();
    let calls = 0;
    const embedder: IOllamaClient = {
      listModels: async () => [],
      embed: async inputs => {
        calls += 1;
        if (calls === 1) {
          throw new OllamaInvalidResponseError(
            'embed texts',
            'temporary upstream fault'
          );
        }
        return inputs.map(() => new Array<number>(DIMENSIONS).fill(0));
      },
      chat: () => {
        throw new Error('The card index never streams chat completions');
      }
    };

    await buildCardIndex({
      dataDir: directory,
      cards: [createDarkMagician()],
      embedder,
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-15'
    });

    expect(calls).toBe(2);
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

  describe('readByIds', () => {
    const buildIndex = async (
      directory: string,
      cards: Card[]
    ): Promise<void> => {
      await buildCardIndex({
        dataDir: directory,
        cards,
        embedder: createEmbedder([]),
        embeddingModel: EMBEDDING_MODEL,
        dimensions: DIMENSIONS,
        datasetVersion: 'ygoprodeck-2026-09-16'
      });
    };

    const DARK_MAGICIAN_ID = 46986414;

    it('reads the cards it was asked for, in the order it was asked', async () => {
      const directory = await createDataDir();
      const magician = createDarkMagician();
      const greed = createPotOfGreed();
      await buildIndex(directory, [magician, greed]);

      const catalog = await CardCatalog.getInstance(directory);
      const cards = await catalog.readByIds({
        ids: [greed.id, magician.id],
        language: Language.English
      });

      expect(cards.map(card => card.name)).toEqual([
        'Pot of Greed',
        'Dark Magician'
      ]);
    });

    it('reads a card in the language it was asked for when both have it', async () => {
      const directory = await createDataDir();
      await buildIndex(directory, [
        createDarkMagician(),
        createDarkMagician({
          language: Language.French,
          name: 'Magicien Sombre'
        })
      ]);

      const catalog = await CardCatalog.getInstance(directory);
      const cards = await catalog.readByIds({
        ids: [DARK_MAGICIAN_ID],
        language: Language.French
      });

      expect(cards.map(card => card.name)).toEqual(['Magicien Sombre']);
    });

    it('falls back to the language that has a card alone', async () => {
      const directory = await createDataDir();
      await buildIndex(directory, [createDarkMagician()]);

      const catalog = await CardCatalog.getInstance(directory);
      const cards = await catalog.readByIds({
        ids: [DARK_MAGICIAN_ID],
        language: Language.French
      });

      expect(cards.map(card => card.name)).toEqual(['Dark Magician']);
    });

    it('leaves out an id no language has', async () => {
      const directory = await createDataDir();
      await buildIndex(directory, [createDarkMagician()]);

      const catalog = await CardCatalog.getInstance(directory);
      const cards = await catalog.readByIds({
        ids: [DARK_MAGICIAN_ID, 999999999],
        language: Language.English
      });

      expect(cards.map(card => card.name)).toEqual(['Dark Magician']);
    });

    it('reads nothing, and opens nothing, when it was asked for nothing', async () => {
      const directory = await createDataDir();

      const catalog = await CardCatalog.getInstance(directory);
      const cards = await catalog.readByIds({
        ids: [],
        language: Language.English
      });

      expect(cards).toEqual([]);
    });
  });

  describe('search', () => {
    const QUERY = [1, 0, 0];
    const SEARCH_DIMENSIONS = 3;

    const buildIndex = async (
      directory: string,
      cards: Card[],
      vectors: number[][]
    ): Promise<void> => {
      await buildCardIndex({
        dataDir: directory,
        cards,
        embedder: createScriptedEmbedder(vectors),
        embeddingModel: EMBEDDING_MODEL,
        dimensions: SEARCH_DIMENSIONS,
        datasetVersion: 'ygoprodeck-2026-09-16'
      });
    };

    const createBlueEyes = (): Card =>
      createDarkMagician({ id: 89631139, name: 'Blue-Eyes White Dragon' });

    const createMagicienSombre = (): Card =>
      createDarkMagician({
        language: Language.French,
        name: 'Magicien Sombre'
      });

    it('returns the nearest cards ordered by similarity, with their score', async () => {
      const directory = await createDataDir();
      await buildIndex(
        directory,
        [createDarkMagician(), createPotOfGreed(), createBlueEyes()],
        [
          [1, 0, 0],
          [1, 1, 0],
          [0, 1, 0]
        ]
      );

      const catalog = await CardCatalog.getInstance(directory);
      const results = await catalog.search({
        vector: QUERY,
        language: Language.English,
        filters: [],
        limit: 10
      });

      expect(results.map(result => result.card.name)).toEqual([
        'Dark Magician',
        'Pot of Greed',
        'Blue-Eyes White Dragon'
      ]);
      expect(results[0].score).toBeCloseTo(1, 5);
      expect(results[1].score).toBeCloseTo(Math.SQRT1_2, 5);
      expect(results[2].score).toBeCloseTo(0, 5);
    });

    it('limits the number of rows it returns', async () => {
      const directory = await createDataDir();
      await buildIndex(
        directory,
        [createDarkMagician(), createPotOfGreed(), createBlueEyes()],
        [
          [1, 0, 0],
          [1, 1, 0],
          [0, 1, 0]
        ]
      );

      const catalog = await CardCatalog.getInstance(directory);
      const results = await catalog.search({
        vector: QUERY,
        language: Language.English,
        filters: [],
        limit: 2
      });

      expect(results.map(result => result.card.name)).toEqual([
        'Dark Magician',
        'Pot of Greed'
      ]);
    });

    it('scopes the search to the requested language', async () => {
      const directory = await createDataDir();
      await buildIndex(
        directory,
        [createDarkMagician(), createMagicienSombre()],
        [
          [0, 1, 0],
          [1, 0, 0]
        ]
      );

      const catalog = await CardCatalog.getInstance(directory);
      const english = await catalog.search({
        vector: QUERY,
        language: Language.English,
        filters: [],
        limit: 1
      });
      const french = await catalog.search({
        vector: QUERY,
        language: Language.French,
        filters: [],
        limit: 1
      });

      expect(english.map(result => result.card.name)).toEqual([
        'Dark Magician'
      ]);
      expect(french.map(result => result.card.name)).toEqual([
        'Magicien Sombre'
      ]);
    });

    it('returns nothing when the language has no cards', async () => {
      const directory = await createDataDir();
      await buildIndex(directory, [createDarkMagician()], [[1, 0, 0]]);

      const catalog = await CardCatalog.getInstance(directory);
      const results = await catalog.search({
        vector: QUERY,
        language: Language.French,
        filters: [],
        limit: 10
      });

      expect(results).toEqual([]);
    });
  });

  describe('structured filters', () => {
    const FILTER_DIMENSIONS = 3;

    const createBlueEyes = (): Card =>
      createDarkMagician({
        id: 89631139,
        name: 'Blue-Eyes White Dragon',
        attribute: CardAttribute.Light,
        race: 'Dragon',
        level: 8,
        atk: 3000,
        def: 2500,
        archetype: 'Blue-Eyes'
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

    const createGravekeepersSpy = (): Card =>
      createDarkMagician({
        id: 3050,
        name: "Gravekeeper's Spy",
        type: CardType.EffectMonster,
        frameType: FrameType.Effect,
        level: 4,
        atk: 1200,
        def: 2000,
        archetype: "Gravekeeper's"
      });

    const createPercentDragon = (): Card =>
      createDarkMagician({
        id: 4097,
        name: 'Percent Dragon',
        attribute: CardAttribute.Wind,
        race: 'Dragon',
        level: 4,
        atk: 1500,
        def: 1200,
        archetype: 'Dragon%'
      });

    const createLaJinn = (): Card =>
      createDarkMagician({
        id: 97590747,
        name: 'La Jinn the Mystical Genie of the Lamp',
        attribute: CardAttribute.Dark,
        race: 'Fiend',
        level: 4,
        atk: 1800,
        def: 1000,
        archetype: undefined
      });

    const englishCards = (): Card[] => [
      createDarkMagician(),
      createPotOfGreed(),
      createBlueEyes(),
      createDecodeTalker(),
      createGravekeepersSpy(),
      createPercentDragon(),
      createLaJinn()
    ];

    const seedIndex = async (
      directory: string,
      cards: Card[],
      vectors: number[][] = cards.map(() => [1, 0, 0])
    ): Promise<void> => {
      await buildCardIndex({
        dataDir: directory,
        cards,
        embedder: createScriptedEmbedder(vectors),
        embeddingModel: EMBEDDING_MODEL,
        dimensions: FILTER_DIMENSIONS,
        datasetVersion: 'ygoprodeck-2026-09-16'
      });
    };

    const scan = (
      directory: string,
      filters: CardFilters,
      language: Language = Language.English
    ) =>
      CardCatalog.getInstance(directory).then(catalog =>
        catalog.scan({ language, filters, limit: 100 })
      );

    it('returns filter matches in a stable identity order', async () => {
      const directory = await createDataDir();
      await seedIndex(directory, englishCards());
      const filters: CardFilters = [
        { field: CardFilterField.Level, operator: FilterOperator.Lte, value: 4 }
      ];

      const first = await scan(directory, filters);
      const second = await scan(directory, filters);

      expect(first.map(row => row.id)).toEqual([3050, 4097, 97590747]);
      expect(second.map(row => row.name)).toEqual(first.map(row => row.name));
    });

    it('scopes a filtered scan to the requested language', async () => {
      const directory = await createDataDir();
      await seedIndex(directory, [
        ...englishCards(),
        createDarkMagician({
          language: Language.French,
          name: 'Magicien Sombre'
        })
      ]);
      const filters: CardFilters = [
        {
          field: CardFilterField.Level,
          operator: FilterOperator.Gte,
          value: 7
        }
      ];

      const english = await scan(directory, filters);
      const french = await scan(directory, filters, Language.French);

      expect(english.map(row => row.name)).toEqual([
        'Dark Magician',
        'Blue-Eyes White Dragon'
      ]);
      expect(french.map(row => row.name)).toEqual(['Magicien Sombre']);
    });

    it('keeps quotes and percent signs inside a value literal', async () => {
      const directory = await createDataDir();
      await seedIndex(directory, englishCards());

      const quoted = await scan(directory, [
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.Eq,
          value: "Gravekeeper's"
        }
      ]);
      const containsQuote = await scan(directory, [
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.Contains,
          value: "'s"
        }
      ]);
      const percent = await scan(directory, [
        {
          field: CardFilterField.Archetype,
          operator: FilterOperator.Contains,
          value: '%'
        }
      ]);

      expect(quoted.map(row => row.name)).toEqual(["Gravekeeper's Spy"]);
      expect(containsQuote.map(row => row.name)).toEqual(["Gravekeeper's Spy"]);
      expect(percent.map(row => row.name)).toEqual(['Percent Dragon']);
    });

    it('narrows a vector search with the filters', async () => {
      const directory = await createDataDir();
      await seedIndex(
        directory,
        [createDarkMagician(), createPotOfGreed(), createBlueEyes()],
        [
          [1, 0, 0],
          [1, 1, 0],
          [0, 1, 0]
        ]
      );

      const catalog = await CardCatalog.getInstance(directory);
      const results = await catalog.search({
        vector: [1, 0, 0],
        language: Language.English,
        filters: [
          {
            field: CardFilterField.Type,
            operator: FilterOperator.Eq,
            value: CardType.SpellCard
          }
        ],
        limit: 10
      });

      expect(results.map(result => result.card.name)).toEqual(['Pot of Greed']);
      expect(results[0].score).toBeCloseTo(Math.SQRT1_2, 5);
    });
  });
});
