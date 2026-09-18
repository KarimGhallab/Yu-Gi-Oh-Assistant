import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type Card, CardType, FrameType, Language } from '@ygo-assistant/cards';
import { archetypeListSchema } from '@ygo-assistant/contracts';
import { type IAppStore, databasePath, openAppStore } from '@ygo-assistant/db';
import { InMemoryCardCatalog } from '@ygo-assistant/db/testing';
import type { ILogger } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';
import { FakeOllamaClient } from '@ygo-assistant/test-support';

import { loadConfig } from '../../config/index.js';
import { createServer } from '../createServer.js';

const BASE_URL = 'http://127.0.0.1:11434';

const silentLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

const createCard = (id: number, archetype?: string): Card => ({
  id,
  name: `Card ${id}`,
  language: Language.English,
  type: CardType.NormalMonster,
  frameType: FrameType.Normal,
  typeLine: ['Spellcaster', 'Normal'],
  race: 'Spellcaster',
  attribute: undefined,
  level: 4,
  atk: 1000,
  def: 1000,
  linkMarkers: [],
  archetype,
  effect: 'A card the archetype listing never reads.',
  imageUrl: `https://images.ygoprodeck.com/images/cards/${id}.jpg`,
  sourceUrl: `https://ygoprodeck.com/card/card-${id}`
});

describe('the archetype routes', () => {
  let dataDir: string;
  let store: IAppStore;
  let catalog: InMemoryCardCatalog;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-assistant-archetypes-'));
    store = await openAppStore(databasePath(dataDir));
    catalog = new InMemoryCardCatalog({ rows: [] });
  });

  afterEach(async () => {
    await store.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  const app = (ollama: IOllamaClient) =>
    createServer({
      config: loadConfig({ OLLAMA_BASE_URL: BASE_URL, DATA_DIR: dataDir }),
      logger: silentLogger,
      ollama,
      store,
      catalog
    });

  const build = (cards: Card[]): void => {
    catalog = new InMemoryCardCatalog({
      rows: cards.map(card => ({ ...card, vector: [1, 0, 0] }))
    });
  };

  it('lists the archetypes the catalog carries, once each and sorted', async () => {
    build([
      createCard(1, 'Dark Magician'),
      createCard(2, 'Dark Magician'),
      createCard(3, 'Blue-Eyes'),
      createCard(4)
    ]);

    const response = await app(new FakeOllamaClient()).request(
      '/api/archetypes'
    );
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(archetypeListSchema.parse(body)).toEqual([
      'Blue-Eyes',
      'Dark Magician'
    ]);
  });

  it('answers with no archetype at all when the catalog carries none', async () => {
    build([createCard(1), createCard(2)]);

    const response = await app(new FakeOllamaClient()).request(
      '/api/archetypes'
    );
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(archetypeListSchema.parse(body)).toEqual([]);
  });
});
