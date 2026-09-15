import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createLogger } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';
import { UnavailableError } from '@ygo-assistant/utils';

import { loadConfig } from './config/index.js';
import { createServer, logBinding } from './server/index.js';

/**
 * Temporary stand-in until the Ollama integration feature provides the real
 * client. The health route never calls it, so the server can boot and be
 * verified without a running Ollama instance.
 */
function createPendingOllamaClient(): IOllamaClient {
  const notImplemented = (): never => {
    throw new UnavailableError('The Ollama client is not implemented yet');
  };

  return {
    listModels: async () => notImplemented(),
    embed: async () => notImplemented(),
    chat: () => notImplemented()
  };
}

/**
 * The built client lives next to the server package. Both the source and the
 * compiled entry sit one directory below the package root, so this relative
 * path resolves in dev and in production.
 */
const clientDistDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../web/dist'
);

const config = loadConfig(process.env);
const logger = createLogger({ level: config.logLevel, name: 'server' });
const ollama = createPendingOllamaClient();

const app = createServer({ config, logger, ollama, clientDistDir });

logBinding(logger, config.host);
serve({ fetch: app.fetch, hostname: config.host, port: config.port }, info => {
  logger.info('Server listening', { port: info.port, host: config.host });
});
