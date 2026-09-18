import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { loadConfig } from '../config/index.js';
import { originGuard } from './originGuard.js';

const guardedApp = (env: Record<string, string | undefined> = {}): Hono => {
  const app = new Hono();
  app.use('/api/*', originGuard(loadConfig(env)));
  app.get('/api/probe', context => context.json({ ok: true }));
  app.post('/api/probe', context => context.json({ ok: true }));
  return app;
};

describe('originGuard', () => {
  it('allows a loopback host with no origin', async () => {
    const response = await guardedApp().request('/api/probe');

    expect(response.status).toBe(200);
  });

  it('allows a same-origin request', async () => {
    const response = await guardedApp().request(
      'http://127.0.0.1:3000/api/probe',
      { headers: { origin: 'http://127.0.0.1:3000' } }
    );

    expect(response.status).toBe(200);
  });

  it('refuses a request named for another host', async () => {
    const response = await guardedApp().request(
      'http://evil.example:3000/api/probe'
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'The request host is not allowed'
    });
  });

  it('refuses a request from another origin', async () => {
    const response = await guardedApp().request(
      'http://127.0.0.1:3000/api/probe',
      { method: 'POST', headers: { origin: 'http://evil.example' } }
    );

    expect(response.status).toBe(403);
  });

  it('refuses an origin it cannot parse', async () => {
    const response = await guardedApp().request(
      'http://127.0.0.1:3000/api/probe',
      { headers: { origin: 'not a url' } }
    );

    expect(response.status).toBe(403);
  });

  it('checks the referer when no origin is present', async () => {
    const response = await guardedApp().request(
      'http://127.0.0.1:3000/api/probe',
      { headers: { referer: 'http://evil.example/page' } }
    );

    expect(response.status).toBe(403);
  });

  it('allows an explicitly allowed host', async () => {
    const response = await guardedApp({
      ALLOWED_HOSTS: 'assistant.example'
    }).request('http://assistant.example:3000/api/probe');

    expect(response.status).toBe(200);
  });

  it('allows a configured client origin', async () => {
    const response = await guardedApp({
      CORS_ORIGIN: 'https://assistant.example'
    }).request('http://assistant.example/api/probe', {
      headers: { origin: 'https://assistant.example' }
    });

    expect(response.status).toBe(200);
  });

  it('leaves a path that is not the API alone', async () => {
    const app = new Hono();
    app.use('/api/*', originGuard(loadConfig({})));
    app.get('/health', context => context.json({ ok: true }));

    const response = await app.request('http://evil.example/health');

    expect(response.status).toBe(200);
  });
});
