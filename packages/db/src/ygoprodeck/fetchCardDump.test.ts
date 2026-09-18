import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { Language } from '@ygo-assistant/cards';

import {
  DumpIntegrityError,
  DumpTooLargeError,
  fetchCardDump
} from './fetchCardDump.js';

const BODY = JSON.stringify({ data: [{ id: 46986414 }] });

interface FakeDumpServer {
  baseUrl: string;
  stop: () => Promise<void>;
}

const startServer = async (body: string): Promise<FakeDumpServer> => {
  const server = createServer((request, response) => {
    request.resume();
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.end(body);
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
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }
  };
};

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

describe('fetchCardDump', () => {
  let server: FakeDumpServer | undefined;
  let dataDir: string | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
    if (dataDir !== undefined) {
      await rm(dataDir, { recursive: true, force: true });
      dataDir = undefined;
    }
  });

  const fetchDump = (options: {
    maxBytes?: number;
    expectedSha256?: string;
  }) => {
    if (server === undefined || dataDir === undefined) {
      throw new Error('The test fixtures were not set up');
    }
    return fetchCardDump({
      dataDir,
      language: Language.English,
      baseUrl: server.baseUrl,
      ...options
    });
  };

  it('saves the raw dump and returns the payload', async () => {
    server = await startServer(BODY);
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-dump-'));

    const payload = await fetchDump({});

    expect(payload).toEqual(JSON.parse(BODY));
    expect(await readFile(join(dataDir, 'raw', 'cards.en.json'), 'utf8')).toBe(
      BODY
    );
  });

  it('accepts a dump whose digest matches the pin', async () => {
    server = await startServer(BODY);
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-dump-'));

    await expect(
      fetchDump({ expectedSha256: sha256(BODY) })
    ).resolves.toBeDefined();
  });

  it('refuses a dump whose digest does not match the pin', async () => {
    server = await startServer(BODY);
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-dump-'));

    await expect(
      fetchDump({ expectedSha256: 'a'.repeat(64) })
    ).rejects.toBeInstanceOf(DumpIntegrityError);
  });

  it('refuses a dump larger than the limit', async () => {
    server = await startServer(BODY);
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-dump-'));

    await expect(fetchDump({ maxBytes: 4 })).rejects.toBeInstanceOf(
      DumpTooLargeError
    );
  });
});
