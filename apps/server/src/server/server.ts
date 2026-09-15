import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { DomainError } from '@ygo-assistant/utils';

import type { ServerDependencies } from './types.js';

/**
 * Builds the HTTP application with its dependencies injected. Binding it to a
 * port is the caller's responsibility. The app is API-only: the client is a
 * separate deployment that reaches it directly or through a reverse proxy.
 */
export function createServer(dependencies: ServerDependencies): Hono {
  const app = new Hono();

  const { corsOrigin } = dependencies.config;
  if (corsOrigin !== undefined) {
    app.use('*', cors({ origin: corsOrigin }));
  }

  app.get('/health', c => c.json({ status: 'ok' }));

  app.onError((error, c) => {
    if (error instanceof DomainError) {
      dependencies.logger.warn('Request failed', {
        status: error.statusCode,
        message: error.message
      });
      return c.json({ error: error.message }, { status: error.statusCode });
    }

    dependencies.logger.error('Unhandled error', { message: error.message });
    return c.json({ error: 'Internal Server Error' }, { status: 500 });
  });

  return app;
}
