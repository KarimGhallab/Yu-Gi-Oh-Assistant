import { readCardIndexMetadata } from '@ygo-assistant/db';

import type { AppConfig } from '../config/index.js';

const REPOPULATE_COMMAND = 'pnpm db:populate';

/**
 * Raised when the local card index is missing, or was built with a different
 * embedding model or dimensions than the running configuration.
 */
export class StaleIndexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaleIndexError';
  }
}

/**
 * Verifies that the local card index was built with the configured embedding
 * model and dimensions, aborting startup otherwise. The embedding contract is
 * durable, so a mismatch would otherwise return silently wrong results.
 */
export async function ensureIndexMatchesConfig(
  config: AppConfig
): Promise<void> {
  const metadata = await readCardIndexMetadata(config.dataDir).catch(
    () => undefined
  );

  if (metadata === undefined) {
    throw new StaleIndexError(
      `No card index was found in "${config.dataDir}". Run "${REPOPULATE_COMMAND}" to build it.`
    );
  }

  const differences: string[] = [];
  if (metadata.embeddingModel !== config.ollama.embeddingModel) {
    differences.push(
      `the index was built with embedding model "${metadata.embeddingModel}" but "${config.ollama.embeddingModel}" is configured`
    );
  }
  if (metadata.dimensions !== config.ollama.embeddingDimensions) {
    differences.push(
      `the index was built with ${metadata.dimensions} dimensions but ${config.ollama.embeddingDimensions} are configured`
    );
  }

  if (differences.length > 0) {
    throw new StaleIndexError(
      `The card index is stale: ${differences.join('; ')}. Run "${REPOPULATE_COMMAND}" to rebuild it.`
    );
  }
}
