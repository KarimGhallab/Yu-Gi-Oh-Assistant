import { afterEach, describe, expect, it } from 'vitest';

import { OllamaClient } from './OllamaClient.js';
import {
  OllamaInvalidResponseError,
  OllamaModelNotFoundError,
  OllamaUnreachableError
} from './errors.js';
import {
  type FakeOllamaHandler,
  type FakeOllamaRequest,
  FakeOllamaServer
} from './testing/FakeOllamaServer.js';
import { ChatRole } from './types.js';

const CHAT_MODEL = 'qwen3:4b';
const EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
const EMBEDDING_DIMENSIONS = 3;

const buildClient = (baseUrl: string, embeddingBaseUrl: string): OllamaClient =>
  new OllamaClient({
    baseUrl,
    embeddingBaseUrl,
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimensions: EMBEDDING_DIMENSIONS
  });

const captureError = async (operation: Promise<unknown>): Promise<Error> => {
  try {
    await operation;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the operation to reject');
};

const readModel = (body: unknown): string => {
  if (typeof body !== 'object' || body === null || !('model' in body)) {
    return '';
  }
  const model = body.model;
  return typeof model === 'string' ? model : '';
};

const collect = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
};

describe('OllamaClient', () => {
  const servers: FakeOllamaServer[] = [];

  afterEach(async () => {
    await Promise.all(servers.map(server => server.stop()));
    servers.length = 0;
  });

  const startServer = async (handler: FakeOllamaHandler): Promise<string> => {
    const server = new FakeOllamaServer();
    const baseUrl = await server.start(handler);
    servers.push(server);
    return baseUrl;
  };

  const clientFor = async (
    handler: FakeOllamaHandler
  ): Promise<OllamaClient> => {
    const baseUrl = await startServer(handler);
    return buildClient(baseUrl, baseUrl);
  };

  const stoppedServerUrl = async (): Promise<string> => {
    const baseUrl = await startServer(() => ({ json: {} }));
    await servers[servers.length - 1].stop();
    return baseUrl;
  };

  describe('listModels', () => {
    it('lists installed models and flags structured-output support from reported capabilities', async () => {
      const requests: FakeOllamaRequest[] = [];
      const client = await clientFor(request => {
        requests.push(request);
        if (request.path === '/api/tags') {
          return {
            json: {
              models: [{ name: 'qwen3:4b' }, { name: 'nomic-embed-text' }]
            }
          };
        }
        const capabilities =
          readModel(request.body) === 'qwen3:4b'
            ? ['completion']
            : ['embedding'];
        return { json: { capabilities } };
      });

      const models = await client.listModels();

      expect(models).toEqual([
        { name: 'qwen3:4b', supportsStructuredOutput: true },
        { name: 'nomic-embed-text', supportsStructuredOutput: false }
      ]);
      expect(
        requests.map(request => `${request.method} ${request.path}`)
      ).toEqual(['GET /api/tags', 'POST /api/show', 'POST /api/show']);
      expect(requests[1].body).toEqual({ model: 'qwen3:4b' });
    });

    it('treats a model without reported capabilities as not supporting structured output', async () => {
      const client = await clientFor(request => {
        if (request.path === '/api/tags') {
          return { json: { models: [{ name: 'mystery:latest' }] } };
        }
        return { json: {} };
      });

      await expect(client.listModels()).resolves.toEqual([
        { name: 'mystery:latest', supportsStructuredOutput: false }
      ]);
    });

    it('reports an unreachable server as a typed error naming the URL and the fix', async () => {
      const baseUrl = await stoppedServerUrl();
      const client = buildClient(baseUrl, baseUrl);

      const error = await captureError(client.listModels());

      expect(error).toBeInstanceOf(OllamaUnreachableError);
      expect(error.message).toContain(baseUrl);
      expect(error.message).toContain('running');
    });

    it('reports a model missing from the details call as a typed error naming the pull command', async () => {
      const client = await clientFor(request => {
        if (request.path === '/api/tags') {
          return { json: { models: [{ name: 'ghost:4b' }] } };
        }
        return { status: 404, json: { error: 'model not found' } };
      });

      const error = await captureError(client.listModels());

      expect(error).toBeInstanceOf(OllamaModelNotFoundError);
      expect(error.message).toContain('ollama pull ghost:4b');
    });

    it('reports a malformed response as a typed error', async () => {
      const client = await clientFor(() => ({
        json: { models: 'not-an-array' }
      }));

      const error = await captureError(client.listModels());

      expect(error).toBeInstanceOf(OllamaInvalidResponseError);
    });
  });

  describe('embed', () => {
    it('embeds a batch in a single request and returns the vectors unchanged', async () => {
      const requests: FakeOllamaRequest[] = [];
      const client = await clientFor(request => {
        requests.push(request);
        return {
          json: {
            embeddings: [
              [3, 4, 0],
              [1, 2, 2]
            ]
          }
        };
      });

      const vectors = await client.embed(['first card', 'second card']);

      expect(vectors).toEqual([
        [3, 4, 0],
        [1, 2, 2]
      ]);
      expect(requests).toEqual([
        {
          method: 'POST',
          path: '/api/embed',
          body: {
            model: EMBEDDING_MODEL,
            input: ['first card', 'second card'],
            dimensions: EMBEDDING_DIMENSIONS
          }
        }
      ]);
    });

    it('sends embeddings to the embedding endpoint rather than the base URL', async () => {
      const baseRequests: FakeOllamaRequest[] = [];
      const baseUrl = await startServer(request => {
        baseRequests.push(request);
        return { status: 500, json: {} };
      });
      const embeddingRequests: FakeOllamaRequest[] = [];
      const embeddingBaseUrl = await startServer(request => {
        embeddingRequests.push(request);
        return { json: { embeddings: [[1, 2, 3]] } };
      });
      const client = buildClient(baseUrl, embeddingBaseUrl);

      const vectors = await client.embed(['a card']);

      expect(vectors).toEqual([[1, 2, 3]]);
      expect(embeddingRequests.map(request => request.path)).toEqual([
        '/api/embed'
      ]);
      expect(baseRequests).toEqual([]);
    });

    it('reports an unknown embedding model as a typed error naming the pull command', async () => {
      const client = await clientFor(() => ({
        status: 404,
        json: { error: 'model not found' }
      }));

      const error = await captureError(client.embed(['a card']));

      expect(error).toBeInstanceOf(OllamaModelNotFoundError);
      expect(error.message).toContain(`ollama pull ${EMBEDDING_MODEL}`);
    });

    it('reports a malformed embedding response as a typed error', async () => {
      const client = await clientFor(() => ({
        json: { embeddings: 'not-an-array' }
      }));

      const error = await captureError(client.embed(['a card']));

      expect(error).toBeInstanceOf(OllamaInvalidResponseError);
    });

    it('reports a vector count that does not match the inputs as a typed error', async () => {
      const client = await clientFor(() => ({
        json: { embeddings: [[1, 2, 3]] }
      }));

      const error = await captureError(client.embed(['one', 'two']));

      expect(error).toBeInstanceOf(OllamaInvalidResponseError);
    });

    it('reports vectors of the wrong dimensions as a typed error', async () => {
      const client = await clientFor(() => ({
        json: { embeddings: [[1, 2]] }
      }));

      const error = await captureError(client.embed(['a card']));

      expect(error).toBeInstanceOf(OllamaInvalidResponseError);
    });
  });

  describe('chat', () => {
    const userMessage = { role: ChatRole.User, content: 'burn cards' };

    it('streams each message as a chunk and ends with the done marker', async () => {
      const requests: FakeOllamaRequest[] = [];
      const client = await clientFor(request => {
        requests.push(request);
        return {
          stream: [
            '{"message":{"role":"assistant","content":"Suggested "},"done":false}\n',
            '{"message":{"role":"assistant","content":"cards"},"done":false}\n',
            '{"message":{"role":"assistant","content":""},"done":true}\n'
          ]
        };
      });

      const chunks = await collect(
        client.chat({ model: CHAT_MODEL, messages: [userMessage] })
      );

      expect(chunks).toEqual([
        { content: 'Suggested ', done: false },
        { content: 'cards', done: false },
        { content: '', done: true }
      ]);
      expect(requests).toEqual([
        {
          method: 'POST',
          path: '/api/chat',
          body: {
            model: CHAT_MODEL,
            messages: [userMessage],
            stream: true
          }
        }
      ]);
    });

    it('forwards the structured-output format and the temperature', async () => {
      const requests: FakeOllamaRequest[] = [];
      const client = await clientFor(request => {
        requests.push(request);
        return {
          stream: [
            '{"message":{"role":"assistant","content":""},"done":true}\n'
          ]
        };
      });

      await collect(
        client.chat({
          model: CHAT_MODEL,
          messages: [userMessage],
          format: { type: 'object' },
          temperature: 0
        })
      );

      expect(requests[0].body).toEqual({
        model: CHAT_MODEL,
        messages: [userMessage],
        stream: true,
        format: { type: 'object' },
        options: { temperature: 0 }
      });
    });

    it('parses a line split across stream chunks', async () => {
      const client = await clientFor(() => ({
        stream: [
          '{"message":{"role":"assistant","content":"He',
          'llo"},"done":false}\n'
        ]
      }));

      const chunks = await collect(
        client.chat({ model: CHAT_MODEL, messages: [] })
      );

      expect(chunks).toEqual([{ content: 'Hello', done: false }]);
    });

    it('reports an unknown model as a typed error', async () => {
      const client = await clientFor(() => ({
        status: 404,
        json: { error: 'model not found' }
      }));

      const error = await captureError(
        collect(client.chat({ model: 'ghost:4b', messages: [] }))
      );

      expect(error).toBeInstanceOf(OllamaModelNotFoundError);
      expect(error.message).toContain('ollama pull ghost:4b');
    });

    it('reports a malformed stream line as a typed error', async () => {
      const client = await clientFor(() => ({
        stream: ['this is not json\n']
      }));

      const error = await captureError(
        collect(client.chat({ model: CHAT_MODEL, messages: [] }))
      );

      expect(error).toBeInstanceOf(OllamaInvalidResponseError);
    });
  });
});
