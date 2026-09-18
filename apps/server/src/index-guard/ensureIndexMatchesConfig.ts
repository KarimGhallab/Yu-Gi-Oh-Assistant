import type { ICardCatalog } from '@ygo-assistant/db';

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
 * model and dimensions, and, when the operator pinned one, that it holds the
 * expected dataset version. A mismatch aborts startup, because the embedding
 * contract is durable and a substituted index would otherwise answer silently.
 * The directory is named only to tell whoever reads the failure where to
 * rebuild.
 */
export async function ensureIndexMatchesConfig(
  catalog: ICardCatalog,
  config: AppConfig
): Promise<void> {
  const metadata = await catalog.metadata();

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
  if (
    config.expectedDatasetVersion !== undefined &&
    metadata.datasetVersion !== config.expectedDatasetVersion
  ) {
    differences.push(
      `the index holds dataset version "${metadata.datasetVersion}" but "${config.expectedDatasetVersion}" is expected`
    );
  }

  if (differences.length > 0) {
    throw new StaleIndexError(
      `The card index is stale: ${differences.join('; ')}. Run "${REPOPULATE_COMMAND}" to rebuild it.`
    );
  }
}
