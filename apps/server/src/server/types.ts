import type { IAppStore } from '@ygo-assistant/db';
import type { ILogger } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';

import type { AppConfig } from '../config/index.js';

/**
 * The part of the server's dependencies the model and search layers need. A
 * caller that runs no turn, the RAG command included, satisfies it without a
 * conversation store.
 */
export interface OllamaDependencies {
  logger: ILogger;
  ollama: IOllamaClient;
}

/**
 * Everything the server needs, injected at the composition root so that tests
 * can substitute fakes and nothing reaches for a hidden singleton.
 */
export interface ServerDependencies extends OllamaDependencies {
  config: AppConfig;
  store: IAppStore;
}
