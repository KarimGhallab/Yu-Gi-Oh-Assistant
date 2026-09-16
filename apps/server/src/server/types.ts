import type { IAppStore } from '@ygo-assistant/db';
import type { ILogger } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';

import type { AppConfig } from '../config/index.js';

/**
 * Everything the server needs, injected at the composition root so that tests
 * can substitute fakes and nothing reaches for a hidden singleton.
 */
export interface ServerDependencies {
  config: AppConfig;
  logger: ILogger;
  ollama: IOllamaClient;
  store: IAppStore;
}
