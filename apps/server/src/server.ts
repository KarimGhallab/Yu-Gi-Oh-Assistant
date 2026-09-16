import { serve } from '@hono/node-server';

import type { IAppStore } from '@ygo-assistant/db';
import { databasePath, openAppStore } from '@ygo-assistant/db';
import { hasErrorMessage } from '@ygo-assistant/utils';

import { createServerLogger } from './appLogger.js';
import { loadConfig } from './config/index.js';
import { ensureIndexMatchesConfig } from './index-guard/indexGuard.js';
import { createOllamaClient } from './ollama-client/ollamaClient.js';
import { createServer, logBinding } from './server/index.js';

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const logger = createServerLogger(config);

  try {
    await ensureIndexMatchesConfig(config);
  } catch (error) {
    logger.error('The card index is not usable', {
      message: describeError(error)
    });
    process.exitCode = 1;
    return;
  }

  const ollama = createOllamaClient(config.ollama);

  let store: IAppStore;
  try {
    store = await openAppStore(databasePath(config.dataDir));
  } catch (error) {
    logger.error('The conversation store is not usable', {
      message: describeError(error)
    });
    process.exitCode = 1;
    return;
  }

  const app = createServer({ config, logger, ollama, store });

  logBinding(logger, config.host);
  serve(
    { fetch: app.fetch, hostname: config.host, port: config.port },
    info => {
      logger.info('Server listening', { port: info.port, host: config.host });
    }
  );
}

function describeError(error: unknown): string {
  return hasErrorMessage(error) ? error.message : String(error);
}

await main();
