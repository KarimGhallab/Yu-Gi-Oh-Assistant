import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ValidationError } from '@ygo-assistant/utils';

import { parseJsonBody } from './parseJsonBody.js';

const requestSchema = z.object({ name: z.string().min(1) });

const probeApp = (): Hono => {
  const app = new Hono();
  app.post('/probe', async context => {
    const body = await parseJsonBody(context, requestSchema);
    return context.json(body);
  });
  app.onError((error, context) => {
    if (error instanceof ValidationError) {
      return context.json({ error: error.message }, 400);
    }
    return context.json({ error: 'Internal Server Error' }, 500);
  });
  return app;
};

const post = (headers: Record<string, string>, body: string) =>
  probeApp().request('/probe', { method: 'POST', headers, body });

describe('parseJsonBody', () => {
  it('reads a JSON body that satisfies the schema', async () => {
    const response = await post(
      { 'content-type': 'application/json' },
      JSON.stringify({ name: 'Dark Magician' })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: 'Dark Magician' });
  });

  it('accepts a JSON content type with a charset', async () => {
    const response = await post(
      { 'content-type': 'application/json; charset=utf-8' },
      JSON.stringify({ name: 'Dark Magician' })
    );

    expect(response.status).toBe(200);
  });

  it('refuses a body that is not JSON', async () => {
    const response = await post(
      { 'content-type': 'text/plain' },
      JSON.stringify({ name: 'Dark Magician' })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'The request body must be JSON'
    });
  });

  it('refuses a body that does not satisfy the schema', async () => {
    const response = await post(
      { 'content-type': 'application/json' },
      JSON.stringify({ name: '' })
    );

    expect(response.status).toBe(400);
  });
});
