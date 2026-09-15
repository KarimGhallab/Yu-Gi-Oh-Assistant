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

const createClient = (baseUrl: string): OllamaClient =>
  new OllamaClient({
    baseUrl,
    embeddingBaseUrl: baseUrl,
    chatModel: 'qwen3:4b',
    embeddingModel: 'qwen3-embedding:0.6b',
    embeddingDimensions: 1024
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

describe('OllamaClient.listModels', () => {
  let server: FakeOllamaServer | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  const clientFor = async (
    handler: FakeOllamaHandler
  ): Promise<OllamaClient> => {
    server = new FakeOllamaServer();
    const baseUrl = await server.start(handler);
    return createClient(baseUrl);
  };

  it('lists installed models and flags structured-output support from reported capabilities', async () => {
    const requests: FakeOllamaRequest[] = [];
    const client = await clientFor(request => {
      requests.push(request);
      if (request.path === '/api/tags') {
        return {
          json: { models: [{ name: 'qwen3:4b' }, { name: 'nomic-embed-text' }] }
        };
      }
      const capabilities =
        readModel(request.body) === 'qwen3:4b' ? ['completion'] : ['embedding'];
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
    server = new FakeOllamaServer();
    const baseUrl = await server.start(() => ({ json: {} }));
    await server.stop();
    const client = createClient(baseUrl);

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
