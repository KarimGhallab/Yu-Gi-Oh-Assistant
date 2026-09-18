import { type IOllamaClient, OllamaClient } from '@ygo-assistant/ollama';

import type { OllamaConfig } from '../config/index.js';

/**
 * Builds the Ollama client the server runs on, from the validated
 * configuration. It lives outside the entry point so the wiring is testable.
 */
export function createOllamaClient(config: OllamaConfig): IOllamaClient {
  return new OllamaClient(config);
}
