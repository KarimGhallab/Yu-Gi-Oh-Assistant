import { serveStatic } from '@hono/node-server/serve-static';
import { DomainError } from '@ygo-assistant/utils';
import { Hono } from 'hono';

import type { ServerDependencies } from './types.js';

const API_PREFIX = '/api/';

/**
 * Builds the HTTP application with its dependencies injected. Binding it to a
 * port is the caller's responsibility.
 */
export function createServer(dependencies: ServerDependencies): Hono {
  const app = new Hono();

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

  if (dependencies.clientDistDir) {
    const client = serveStatic({ root: dependencies.clientDistDir });

    app.use('*', async (c, next) => {
      if (c.req.path === '/health' || c.req.path.startsWith(API_PREFIX)) {
        return next();
      }
      return client(c, next);
    });
  }

  return app;
}
