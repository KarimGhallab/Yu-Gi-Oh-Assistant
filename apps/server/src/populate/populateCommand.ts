import { populateCardIndex } from '@ygo-assistant/db';
import { createLogger } from '@ygo-assistant/logger';

import { NodeEnvironment, loadConfig } from '../config/index.js';
import { createOllamaClient } from '../ollama-client/ollamaClient.js';

const config = loadConfig(process.env);
const logger = createLogger({
  level: config.logLevel,
  name: 'populate',
  pretty: config.nodeEnv !== NodeEnvironment.Production
});
const embedder = createOllamaClient(config.ollama);

try {
  const summary = await populateCardIndex({
    dataDir: config.dataDir,
    logger,
    embedder,
    embeddingModel: config.ollama.embeddingModel,
    dimensions: config.ollama.embeddingDimensions
  });

  logger.info('Card index populated', {
    dataDir: config.dataDir,
    cards: summary.cards,
    datasetVersion: summary.datasetVersion
  });
} catch (error) {
  logger.error('Card index population failed', {
    message: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
}
