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
  /**
   * Directory holding the built client. When provided, the server also serves
   * the client so the API and the UI share one origin. Tests omit it, and the
   * production entry always provides it.
   */
  clientDistDir?: string;
}
