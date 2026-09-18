import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  type Card,
  CardAttribute,
  CardFilterField,
  type CardFilters,
  CardRace,
  CardType,
  FilterOperator,
  FrameType,
  Language,
  LinkMarker,
  cardMatchesFilters
} from '@ygo-assistant/cards';
import type { IOllamaClient } from '@ygo-assistant/ollama';

import { InMemoryCardCatalog } from '../testing/InMemoryCardCatalog.js';
import { readCardIndex } from '../testing/readCardIndex.js';
import { openCardCatalog } from './cardCatalog.js';
import { buildCardIndex } from './index/cardIndex.js';
import type { CardCatalog } from './types.js';

const DIMENSIONS = 3;
const EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
const DATASET_VERSION = 'ygoprodeck-2026-09-18';

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
    effect: 'Draw 2 cards.'
  });

interface Adapter {
  name: string;
  catalog: CardCatalog;
}

describe('CardCatalog', () => {
  let dataDir: string | undefined;

  afterEach(async () => {
    if (dataDir !== undefined) {
      await rm(dataDir, { recursive: true, force: true });
    }
    dataDir = undefined;
  });

  const seed = async (
    cards: Card[],
    vectors: number[][] = cards.map(() => [1, 0, 0])
  ): Promise<Adapter[]> => {
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-catalog-'));
    await buildCardIndex({
      dataDir,
      cards,
      embedder: createScriptedEmbedder(vectors),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: DATASET_VERSION
    });
    const { rows, metadata } = await readCardIndex(dataDir);

    return [
      { name: 'the LanceDB adapter', catalog: openCardCatalog(dataDir) },
      {
        name: 'the in-memory adapter',
        catalog: new InMemoryCardCatalog({ rows, metadata })
      }
    ];
  };

  const forEachAdapter = async (
    adapters: Adapter[],
    assertions: (catalog: CardCatalog) => Promise<void>
  ): Promise<void> => {
    for (const adapter of adapters) {
      try {
        await assertions(adapter.catalog);
      } catch (error) {
        throw new Error(`${adapter.name} broke the contract`, {
          cause: error
        });
      }
    }
  };

  describe('search', () => {
    it('returns the nearest cards first, with their similarity', async () => {
      const adapters = await seed(
        [createCard(), createPotOfGreed()],
        [
          [1, 0, 0],
          [1, 1, 0]
        ]
      );

      await forEachAdapter(adapters, async catalog => {
        const results = await catalog.search({
          vector: [1, 0, 0],
          language: Language.English,
          filters: [],
          limit: 10
        });

        expect(results.map(result => result.card.name)).toEqual([
          'Dark Magician',
          'Pot of Greed'
        ]);
        expect(results[0].score).toBeCloseTo(1, 5);
        expect(results[1].score).toBeCloseTo(Math.SQRT1_2, 5);
      });
    });

    it('honors the limit', async () => {
      const adapters = await seed(
        [createCard(), createPotOfGreed()],
        [
          [1, 0, 0],
          [1, 1, 0]
        ]
      );

      await forEachAdapter(adapters, async catalog => {
        const results = await catalog.search({
          vector: [1, 0, 0],
          language: Language.English,
          filters: [],
          limit: 1
        });

        expect(results.map(result => result.card.name)).toEqual([
          'Dark Magician'
        ]);
      });
    });

    it('stays inside the language partition', async () => {
      const adapters = await seed([
        createCard(),
        createCard({ language: Language.French, name: 'Magicien Sombre' })
      ]);

      await forEachAdapter(adapters, async catalog => {
        const english = await catalog.search({
          vector: [1, 0, 0],
          language: Language.English,
          filters: [],
          limit: 10
        });
        const french = await catalog.search({
          vector: [1, 0, 0],
          language: Language.French,
          filters: [],
          limit: 10
        });

        expect(english.map(result => result.card.name)).toEqual([
          'Dark Magician'
        ]);
        expect(french.map(result => result.card.name)).toEqual([
          'Magicien Sombre'
        ]);
      });
    });

    it('narrows the search with the structured filters', async () => {
      const adapters = await seed(
        [createCard(), createPotOfGreed()],
        [
          [1, 0, 0],
          [1, 1, 0]
        ]
      );
      const filters: CardFilters = [
        {
          field: CardFilterField.Type,
          operator: FilterOperator.Eq,
          value: CardType.SpellCard
        }
      ];

      await forEachAdapter(adapters, async catalog => {
        const results = await catalog.search({
          vector: [1, 0, 0],
          language: Language.English,
          filters,
          limit: 10
        });

        expect(results.map(result => result.card.name)).toEqual([
          'Pot of Greed'
        ]);
      });
    });
  });

  describe('scan', () => {
    it('returns the filter matches in a stable identity order', async () => {
      const adapters = await seed([
        createPotOfGreed(),
        createCard(),
        createCard({ id: 1, name: 'Blue-Eyes White Dragon' })
      ]);

      await forEachAdapter(adapters, async catalog => {
        const first = await catalog.scan({
          language: Language.English,
          filters: [],
          limit: 100
        });
        const second = await catalog.scan({
          language: Language.English,
          filters: [],
          limit: 100
        });

        expect(first.map(card => card.id)).toEqual([1, 46986414, 55144522]);
        expect(second.map(card => card.name)).toEqual(
          first.map(card => card.name)
        );
      });
    });

    it('honors the limit', async () => {
      const adapters = await seed([
        createPotOfGreed(),
        createCard(),
        createCard({ id: 1, name: 'Blue-Eyes White Dragon' })
      ]);

      await forEachAdapter(adapters, async catalog => {
        const results = await catalog.scan({
          language: Language.English,
          filters: [],
          limit: 2
        });

        expect(results.map(card => card.name)).toEqual([
          'Blue-Eyes White Dragon',
          'Dark Magician'
        ]);
      });
    });

    it('stays inside the language partition', async () => {
      const adapters = await seed([
        createCard(),
        createCard({ language: Language.French, name: 'Magicien Sombre' })
      ]);

      await forEachAdapter(adapters, async catalog => {
        const french = await catalog.scan({
          language: Language.French,
          filters: [],
          limit: 10
        });

        expect(french.map(card => card.name)).toEqual(['Magicien Sombre']);
      });
    });
  });

  describe('predicate agreement', () => {
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

    const createDecodeTalker = (): Card =>
      createCard({
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
      createCard({
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
      createCard({
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
      createCard({
        id: 97590747,
        name: 'La Jinn the Mystical Genie of the Lamp',
        attribute: CardAttribute.Dark,
        race: 'Fiend',
        level: 4,
        atk: 1800,
        def: 1000,
        archetype: undefined
      });

    it('agrees with the in-process predicate over a battery of filters', async () => {
      const cards = [
        createCard(),
        createPotOfGreed(),
        createBlueEyes(),
        createDecodeTalker(),
        createGravekeepersSpy(),
        createPercentDragon(),
        createLaJinn()
      ];
      const adapters = await seed(cards);

      const cases: CardFilters[] = [
        [],
        [
          {
            field: CardFilterField.Level,
            operator: FilterOperator.Lte,
            value: 4
          }
        ],
        [
          {
            field: CardFilterField.Level,
            operator: FilterOperator.Gte,
            value: 7
          }
        ],
        [
          {
            field: CardFilterField.Level,
            operator: FilterOperator.Ne,
            value: 7
          }
        ],
        [
          {
            field: CardFilterField.Atk,
            operator: FilterOperator.Gt,
            value: 2000
          }
        ],
        [
          {
            field: CardFilterField.Attribute,
            operator: FilterOperator.Eq,
            value: CardAttribute.Dark
          }
        ],
        [
          {
            field: CardFilterField.Attribute,
            operator: FilterOperator.Ne,
            value: CardAttribute.Dark
          }
        ],
        [
          {
            field: CardFilterField.Type,
            operator: FilterOperator.Eq,
            value: CardType.SpellCard
          }
        ],
        [
          {
            field: CardFilterField.Archetype,
            operator: FilterOperator.Ne,
            value: 'Greed'
          }
        ],
        [
          {
            field: CardFilterField.Race,
            operator: FilterOperator.Eq,
            value: CardRace.Spellcaster
          }
        ],
        [
          {
            field: CardFilterField.Archetype,
            operator: FilterOperator.Contains,
            value: 'MAGICIAN'
          }
        ],
        [
          {
            field: CardFilterField.Archetype,
            operator: FilterOperator.StartsWith,
            value: 'code'
          }
        ],
        [
          {
            field: CardFilterField.Archetype,
            operator: FilterOperator.EndsWith,
            value: 'TALKER'
          }
        ],
        [
          {
            field: CardFilterField.LinkMarkers,
            operator: FilterOperator.Contains,
            value: LinkMarker.Top
          }
        ],
        [
          {
            field: CardFilterField.LinkMarkers,
            operator: FilterOperator.Contains,
            value: LinkMarker.Right
          }
        ],
        [
          {
            field: CardFilterField.Race,
            operator: FilterOperator.Eq,
            value: CardRace.Dragon
          },
          {
            field: CardFilterField.Level,
            operator: FilterOperator.Lte,
            value: 4
          }
        ]
      ];

      const observed = await Promise.all(
        adapters.map(async adapter => {
          const byFilter: Record<string, string[]> = {};
          for (const filters of cases) {
            const rows = await adapter.catalog.scan({
              language: Language.English,
              filters,
              limit: 100
            });
            byFilter[JSON.stringify(filters)] = rows
              .map(card => card.name)
              .sort();
          }
          return byFilter;
        })
      );

      const expected: Record<string, string[]> = {};
      for (const filters of cases) {
        expected[JSON.stringify(filters)] = cards
          .filter(card => cardMatchesFilters(card, filters))
          .map(card => card.name)
          .sort();
      }

      expect(observed[0]).toEqual(observed[1]);
      expect(observed[0]).toEqual(expected);
    });
  });

  describe('readByIds', () => {
    const magicianId = 100;
    const greedId = 200;

    const seedTranslations = (): Promise<Adapter[]> =>
      seed([
        createCard({ id: magicianId, name: 'Dark Magician' }),
        createCard({
          id: magicianId,
          name: 'Magicien Sombre',
          language: Language.French
        }),
        createCard({ id: greedId, name: 'Pot of Greed' })
      ]);

    it('reads the cards in the order they were asked for', async () => {
      const adapters = await seedTranslations();

      await forEachAdapter(adapters, async catalog => {
        const cards = await catalog.readByIds({
          ids: [greedId, magicianId],
          language: Language.English
        });

        expect(cards.map(card => card.name)).toEqual([
          'Pot of Greed',
          'Dark Magician'
        ]);
      });
    });

    it('prefers the asked language and falls back to the one that has the card', async () => {
      const adapters = await seedTranslations();

      await forEachAdapter(adapters, async catalog => {
        const preferred = await catalog.readByIds({
          ids: [magicianId],
          language: Language.French
        });
        const fallback = await catalog.readByIds({
          ids: [greedId],
          language: Language.French
        });

        expect(preferred.map(card => card.name)).toEqual(['Magicien Sombre']);
        expect(fallback.map(card => card.name)).toEqual(['Pot of Greed']);
      });
    });

    it('leaves out an id no language has', async () => {
      const adapters = await seedTranslations();

      await forEachAdapter(adapters, async catalog => {
        const cards = await catalog.readByIds({
          ids: [magicianId, 999999999],
          language: Language.English
        });

        expect(cards.map(card => card.name)).toEqual(['Dark Magician']);
      });
    });

    it('reads nothing when it was asked for nothing', async () => {
      const adapters = await seedTranslations();

      await forEachAdapter(adapters, async catalog => {
        await expect(
          catalog.readByIds({ ids: [], language: Language.English })
        ).resolves.toEqual([]);
      });
    });
  });

  describe('archetypes', () => {
    it('lists what the catalog carries, once each and sorted', async () => {
      const adapters = await seed([
        createCard(),
        createCard({ id: 2, name: 'Dark Magician Girl' }),
        createCard({
          id: 3,
          name: 'Blue-Eyes White Dragon',
          archetype: 'Blue-Eyes'
        }),
        createCard({ id: 4, name: 'Kuriboh', archetype: undefined })
      ]);

      await forEachAdapter(adapters, async catalog => {
        await expect(catalog.archetypes()).resolves.toEqual([
          'Blue-Eyes',
          'Dark Magician'
        ]);
      });
    });

    it('lists nothing when the catalog carries none', async () => {
      const adapters = await seed([
        createCard({ id: 4, name: 'Kuriboh', archetype: undefined })
      ]);

      await forEachAdapter(adapters, async catalog => {
        await expect(catalog.archetypes()).resolves.toEqual([]);
      });
    });
  });

  describe('metadata', () => {
    it('reports what the index was built with', async () => {
      const adapters = await seed([createCard()]);

      await forEachAdapter(adapters, async catalog => {
        await expect(catalog.metadata()).resolves.toEqual({
          datasetVersion: DATASET_VERSION,
          embeddingModel: EMBEDDING_MODEL,
          dimensions: DIMENSIONS
        });
      });
    });

    it('reports no metadata when the index was never built', async () => {
      dataDir = await mkdtemp(join(tmpdir(), 'ygo-catalog-'));
      const adapters: Adapter[] = [
        { name: 'the LanceDB adapter', catalog: openCardCatalog(dataDir) },
        {
          name: 'the in-memory adapter',
          catalog: new InMemoryCardCatalog({ rows: [] })
        }
      ];

      await forEachAdapter(adapters, async catalog => {
        await expect(catalog.metadata()).resolves.toBeUndefined();
      });
    });
  });
});
