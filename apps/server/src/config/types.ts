import type { LogLevel } from '@ygo-assistant/logger';

/**
 * Runtime environments the server can boot in.
 */
export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test'
}

/**
 * Everything the server needs to reach Ollama.
 */
export interface OllamaConfig {
  baseUrl: string;
  embeddingBaseUrl: string;
  embeddingModel: string;
  embeddingDimensions: number;
}

/**
 * Ranking parameters handed to the retrieval engine.
 */
export interface RetrievalConfig {
  topK: number;
  shown: number;
  minScore: number;
  /**
   * How many of the ranking's candidates the model is asked to judge. The pool
   * is what a judgement is made over, so it is what a card that ranked low has
   * to reach to be kept at all.
   */
  filterPool: number;
}

/**
 * The validated runtime configuration, loaded once at boot.
 */
export interface AppConfig {
  host: string;
  port: number;
  dataDir: string;
  nodeEnv: NodeEnvironment;
  logLevel: LogLevel;
  logDir: string;
  corsOrigin?: string[];
  ollama: OllamaConfig;
  retrieval: RetrievalConfig;
}
