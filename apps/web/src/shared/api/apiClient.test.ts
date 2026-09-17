import { afterEach, describe, expect, it, vi } from 'vitest';

import { conversationListSchema } from '@ygo-assistant/contracts';

import { ApiError, ApiFailureKind, apiRequest } from './apiClient.js';

const ID = '3f8a1c2e-5b4d-4a6f-9e7c-1d2b3a4c5d6e';

const CONVERSATIONS = [
  {
    id: ID,
    title: 'Graveyard toolbox',
    language: 'en',
    model: 'llama3.1:8b',
    createdAt: '2026-09-16T10:00:00.000Z',
    updatedAt: '2026-09-16T10:00:00.000Z'
  }
];

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('answers with the payload the contract schema parsed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(CONVERSATIONS)));

    const conversations = await apiRequest(
      '/api/conversations',
      conversationListSchema
    );

    expect(conversations).toEqual(CONVERSATIONS);
  });

  it('carries the status and the message when the server refuses', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          json({ error: `No conversation has id "${ID}"` }, 404)
        )
    );

    const failure = await apiRequest(
      `/api/conversations/${ID}`,
      conversationListSchema
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      kind: ApiFailureKind.Refused,
      status: 404,
      message: `No conversation has id "${ID}"`
    });
  });

  it('refuses an answer the contract cannot parse', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json([{ id: 'not-a-uuid' }]))
    );

    const failure = await apiRequest(
      '/api/conversations',
      conversationListSchema
    ).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      kind: ApiFailureKind.Malformed,
      message:
        'The server answered with something this app does not understand.'
    });
  });

  it('refuses a body that is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>', { status: 200 }))
    );

    const failure = await apiRequest(
      '/api/conversations',
      conversationListSchema
    ).catch((error: unknown) => error);

    expect(failure).toMatchObject({ kind: ApiFailureKind.Malformed });
  });

  it('reports a server it cannot reach', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    );

    const failure = await apiRequest(
      '/api/conversations',
      conversationListSchema
    ).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      kind: ApiFailureKind.Unreachable,
      message: 'Could not reach the server.'
    });
  });

  it('says the server refused the request when it explains nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 500 }))
    );

    const failure = await apiRequest(
      '/api/conversations',
      conversationListSchema
    ).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      kind: ApiFailureKind.Refused,
      status: 500,
      message: 'The server refused the request (500).'
    });
  });
});
