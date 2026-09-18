import { serve } from '@hono/node-server';

import type { IAppStore } from '@ygo-assistant/db';
import { CardCatalog, databasePath, openAppStore } from '@ygo-assistant/db';
import { hasErrorMessage } from '@ygo-assistant/utils';

import { loadConfig } from './config/index.js';
import { createServerLogger } from './createServerLogger.js';
import { ensureIndexMatchesConfig } from './index-guard/ensureIndexMatchesConfig.js';
import { createOllamaClient } from './ollama-client/createOllamaClient.js';
import { createServer, logBinding } from './server/index.js';

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const logger = createServerLogger(config);

  logger.info('Configuration loaded', {
    nodeEnv: config.nodeEnv,
    host: config.host,
    port: config.port,
    dataDir: config.dataDir,
    logLevel: config.logLevel
  });

  const catalog = await CardCatalog.getInstance(config.dataDir);

  logger.debug('Checking the card index', { dataDir: config.dataDir });
  try {
    await ensureIndexMatchesConfig(catalog, config);
  } catch (error) {
    logger.error('The card index is not usable', {
      message: describeError(error)
    });
    process.exitCode = 1;
    return;
  }
  logger.debug('Card index is usable', { dataDir: config.dataDir });

  const ollama = createOllamaClient(config.ollama);
  logger.debug('Ollama client ready', { baseUrl: config.ollama.baseUrl });

  const storePath = databasePath(config.dataDir);
  logger.debug('Opening the conversation store', { databasePath: storePath });

  let store: IAppStore;
  try {
    store = await openAppStore(storePath);
  } catch (error) {
    logger.error('The conversation store is not usable', {
      message: describeError(error)
    });
    process.exitCode = 1;
    return;
  }
  logger.debug('Conversation store is open', { databasePath: storePath });

  const app = createServer({ config, logger, ollama, store, catalog });

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
