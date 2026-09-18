import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { apiErrorSchema } from '@ygo-assistant/contracts';
import { DomainError, HttpStatus } from '@ygo-assistant/utils';

import { createArchetypeRoutes } from './archetypes/archetypeRoutes.js';
import { createConversationRoutes } from './conversations/conversationRoutes.js';
import { createModelRoutes } from './models/modelRoutes.js';
import { requestLogger } from './requestLogger.js';
import type { ServerDependencies } from './types.js';

/**
 * Builds the HTTP application with its dependencies injected. Binding it to a
 * port is the caller's responsibility. The app is API-only: the client is a
 * separate deployment that reaches it directly or through a reverse proxy.
 */
export function createServer(dependencies: ServerDependencies): Hono {
  const app = new Hono();

  app.use('*', requestLogger(dependencies.logger));

  const { corsOrigin } = dependencies.config;
  if (corsOrigin !== undefined) {
    app.use('*', cors({ origin: corsOrigin }));
  }

  app.get('/health', c => c.json({ status: 'ok' }));

  app.route('/api/archetypes', createArchetypeRoutes(dependencies));

  app.route('/api/conversations', createConversationRoutes(dependencies));

  app.route('/api/models', createModelRoutes(dependencies));

  app.onError((error, c) => {
    if (error instanceof DomainError) {
      dependencies.logger.warn('Request failed', {
        status: error.statusCode,
        message: error.message
      });
      return c.json(
        apiErrorSchema.parse({ error: error.message }),
        error.statusCode
      );
    }

    dependencies.logger.error('Unhandled error', { message: error.message });
    return c.json(
      apiErrorSchema.parse({ error: 'Internal Server Error' }),
      HttpStatus.InternalServerError
    );
  });

  return app;
}
