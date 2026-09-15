import { serve } from '@hono/node-server';

import { createServerLogger } from './appLogger.js';
import { loadConfig } from './config/index.js';
import { ensureIndexMatchesConfig } from './indexGuard.js';
import { createOllamaClient } from './ollamaClient.js';
import { createServer, logBinding } from './server/index.js';

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const logger = createServerLogger(config);

  try {
    await ensureIndexMatchesConfig(config);
  } catch (error) {
    logger.error('The card index is not usable', {
      message: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = 1;
    return;
  }

  const ollama = createOllamaClient(config.ollama);
  const app = createServer({ config, logger, ollama });

  logBinding(logger, config.host);
  serve(
    { fetch: app.fetch, hostname: config.host, port: config.port },
    info => {
      logger.info('Server listening', { port: info.port, host: config.host });
    }
  );
}

await main();
