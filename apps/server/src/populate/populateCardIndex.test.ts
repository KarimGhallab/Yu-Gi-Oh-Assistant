import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { populateCardIndex } from '@ygo-assistant/db';
import { readCardIndex } from '@ygo-assistant/db/testing';
import type { ILogger } from '@ygo-assistant/logger';
import { FakeOllamaClient, TempDataDir } from '@ygo-assistant/test-support';

const EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
const EMBEDDING_DIMENSIONS = 1024;

const silentLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

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

const englishDump = { data: [createRawCard()] };
const frenchDump = {
  data: [
    createRawCard({
      name: 'Magicien Sombre',
      desc: "Mage suprême en termes d'attaque et de défense."
    })
  ]
};

interface FakeDumpServer {
  baseUrl: string;
  requests: string[];
  stop: () => Promise<void>;
}

const startDumpServer = async (status = 200): Promise<FakeDumpServer> => {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    request.on('end', () => {
      const url = request.url ?? '/';
      requests.push(url);
      response.statusCode = status;
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify(url.includes('language=fr') ? frenchDump : englishDump)
      );
    });
    request.resume();
  });

  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('The fake dump server did not bind to a TCP port');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }
  };
};

describe('populateCardIndex', () => {
  let server: FakeDumpServer | undefined;
  let dataDir: TempDataDir | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
    await dataDir?.cleanup();
    dataDir = undefined;
  });

  const populate = (embedder: FakeOllamaClient) => {
    if (server === undefined || dataDir === undefined) {
      throw new Error('The test fixtures were not set up');
    }
    return populateCardIndex({
      dataDir: dataDir.path,
      logger: silentLogger,
      embedder,
      embeddingModel: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      baseUrl: server.baseUrl
    });
  };

  it('fetches both dumps, saves the raw JSON, and writes the index', async () => {
    server = await startDumpServer();
    dataDir = await TempDataDir.create();
    const embedder = new FakeOllamaClient();

    const summary = await populate(embedder);

    expect(server.requests).toEqual([
      '/api/v7/cardinfo.php',
      '/api/v7/cardinfo.php?language=fr'
    ]);
    expect(summary.cards).toBe(2);
    expect(summary.datasetVersion).toMatch(/^ygoprodeck-[0-9a-f]{16}$/);

    const englishRaw = await readFile(
      join(dataDir.path, 'raw', 'cards.en.json'),
      'utf8'
    );
    expect(JSON.parse(englishRaw)).toEqual(englishDump);
    const frenchRaw = await readFile(
      join(dataDir.path, 'raw', 'cards.fr.json'),
      'utf8'
    );
    expect(JSON.parse(frenchRaw)).toEqual(frenchDump);

    const { rows, count, metadata } = await readCardIndex(dataDir.path);
    expect(count).toBe(2);
    expect(rows.map(row => row.name).sort()).toEqual([
      'Dark Magician',
      'Magicien Sombre'
    ]);
    expect(metadata).toEqual({
      datasetVersion: summary.datasetVersion,
      embeddingModel: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS
    });

    expect(embedder.embeddedInputs).toHaveLength(1);
    expect(embedder.embeddedInputs[0]).toHaveLength(2);
  });

  it('fails when a dump request fails', async () => {
    server = await startDumpServer(500);
    dataDir = await TempDataDir.create();

    await expect(populate(new FakeOllamaClient())).rejects.toThrow(/HTTP 500/);
  });
});
