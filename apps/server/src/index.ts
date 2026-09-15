import { serve } from '@hono/node-server';

import { createLogger } from '@ygo-assistant/logger';

import { loadConfig } from './config/index.js';
import { createOllamaClient } from './ollamaClient.js';
import { createServer, logBinding } from './server/index.js';

const config = loadConfig(process.env);
const logger = createLogger({ level: config.logLevel, name: 'server' });
const ollama = createOllamaClient(config.ollama);

const app = createServer({ config, logger, ollama });

logBinding(logger, config.host);
serve({ fetch: app.fetch, hostname: config.host, port: config.port }, info => {
  logger.info('Server listening', { port: info.port, host: config.host });
});
