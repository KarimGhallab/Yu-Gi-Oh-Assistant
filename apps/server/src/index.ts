import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';

import { createLogger } from '@ygo-assistant/logger';

import { loadConfig } from './config/index.js';
import { createOllamaClient } from './ollamaClient.js';
import { createServer, logBinding } from './server/index.js';

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
const ollama = createOllamaClient(config.ollama);

const app = createServer({ config, logger, ollama, clientDistDir });

logBinding(logger, config.host);
serve({ fetch: app.fetch, hostname: config.host, port: config.port }, info => {
  logger.info('Server listening', { port: info.port, host: config.host });
});
