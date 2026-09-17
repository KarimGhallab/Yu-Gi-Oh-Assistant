import { createServer } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import type { ChatChunk } from '@ygo-assistant/ollama';

import { loadConfig } from '../config/index.js';
import { createOllamaClient } from './createOllamaClient.js';

interface FakeOllama {
  baseUrl: string;
  requests: string[];
  stop: () => Promise<void>;
}

/**
 * A minimal HTTP stand-in for Ollama, answering the four endpoints the client
 * calls. It lets the composition root be tested over a real socket with no
 * Ollama installed and no network access.
 */
const startFakeOllama = async (): Promise<FakeOllama> => {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    request.on('end', () => {
      requests.push(`${request.method ?? 'GET'} ${request.url ?? '/'}`);
      response.statusCode = 200;
      if (request.url === '/api/tags') {
        response.end(JSON.stringify({ models: [{ name: 'qwen3:4b' }] }));
        return;
      }
      if (request.url === '/api/show') {
        response.end(JSON.stringify({ capabilities: ['completion'] }));
        return;
      }
      if (request.url === '/api/embed') {
        response.end(JSON.stringify({ embeddings: [[3, 4, 0]] }));
        return;
      }
      response.end('{"message":{"content":"hello"},"done":true}\n');
    });
    request.resume();
  });

  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('The fake Ollama server did not bind to a TCP port');
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

const collectChunks = async (
  chunks: AsyncIterable<ChatChunk>
): Promise<ChatChunk[]> => {
  const items: ChatChunk[] = [];
  for await (const chunk of chunks) {
    items.push(chunk);
  }
  return items;
};

describe('createOllamaClient', () => {
  const servers: FakeOllama[] = [];

  afterEach(async () => {
    await Promise.all(servers.map(server => server.stop()));
    servers.length = 0;
  });

  const startServer = async (): Promise<FakeOllama> => {
    const server = await startFakeOllama();
    servers.push(server);
    return server;
  };

  it('builds a client from configuration that lists, embeds, and streams chat', async () => {
    const server = await startServer();
    const config = loadConfig({
      OLLAMA_BASE_URL: server.baseUrl,
      OLLAMA_EMBEDDING_BASE_URL: server.baseUrl,
      OLLAMA_EMBEDDING_DIMENSIONS: '3'
    });

    const client = createOllamaClient(config.ollama);

    await expect(client.listModels()).resolves.toEqual([
      {
        name: 'qwen3:4b',
        supportsCompletion: true,
        supportsStructuredOutput: true
      }
    ]);
    await expect(client.embed(['a card'])).resolves.toEqual([[3, 4, 0]]);
    await expect(
      collectChunks(client.chat({ model: 'llama3.1:8b', messages: [] }))
    ).resolves.toEqual([{ content: 'hello', done: true }]);
    expect(server.requests).toEqual(
      expect.arrayContaining([
        'GET /api/tags',
        'POST /api/show',
        'POST /api/embed',
        'POST /api/chat'
      ])
    );
  });

  it('uses the embedding endpoint override for embeddings', async () => {
    const baseServer = await startServer();
    const embeddingServer = await startServer();
    const config = loadConfig({
      OLLAMA_BASE_URL: baseServer.baseUrl,
      OLLAMA_EMBEDDING_BASE_URL: embeddingServer.baseUrl,
      OLLAMA_EMBEDDING_DIMENSIONS: '3'
    });

    const client = createOllamaClient(config.ollama);

    await client.embed(['a card']);

    expect(embeddingServer.requests).toContain('POST /api/embed');
    expect(baseServer.requests).not.toContain('POST /api/embed');
  });
});
