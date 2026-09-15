import { z } from 'zod';

import { LogLevel } from '@ygo-assistant/logger';

import { type AppConfig, NodeEnvironment } from './types.js';

const environmentSchema = z.object({
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATA_DIR: z.string().min(1).default('./data'),
  NODE_ENV: z.nativeEnum(NodeEnvironment).default(NodeEnvironment.Development),
  LOG_LEVEL: z.nativeEnum(LogLevel).default(LogLevel.Info),
  CORS_ORIGIN: z.string().optional(),
  OLLAMA_BASE_URL: z.url().default('http://127.0.0.1:11434'),
  OLLAMA_EMBEDDING_BASE_URL: z.url().optional(),
  OLLAMA_CHAT_MODEL: z.string().min(1).default('qwen3:4b'),
  OLLAMA_EMBEDDING_MODEL: z.string().min(1).default('qwen3-embedding:0.6b'),
  OLLAMA_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),
  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(25),
  RETRIEVAL_SHOWN: z.coerce.number().int().positive().default(8),
  RETRIEVAL_MIN_SCORE: z.coerce.number().min(-1).max(1).default(0)
});

/**
 * Raised when the environment does not describe a usable configuration. The
 * message names every offending variable so that startup fails fast.
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Reads and validates the process environment once at boot, refusing to start
 * when a variable is missing or invalid.
 */
export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const result = environmentSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map(issue => {
        const variable = issue.path.join('.') || 'environment';
        return `${variable}: ${issue.message}`;
      })
      .join('; ');
    throw new ConfigurationError(`Invalid configuration: ${details}`);
  }

  const parsed = result.data;
  return {
    host: parsed.HOST,
    port: parsed.PORT,
    dataDir: parsed.DATA_DIR,
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    corsOrigin:
      parsed.CORS_ORIGIN === undefined
        ? undefined
        : parsed.CORS_ORIGIN.split(',')
            .map(origin => origin.trim())
            .filter(origin => origin.length > 0),
    ollama: {
      baseUrl: parsed.OLLAMA_BASE_URL,
      embeddingBaseUrl:
        parsed.OLLAMA_EMBEDDING_BASE_URL ?? parsed.OLLAMA_BASE_URL,
      chatModel: parsed.OLLAMA_CHAT_MODEL,
      embeddingModel: parsed.OLLAMA_EMBEDDING_MODEL,
      embeddingDimensions: parsed.OLLAMA_EMBEDDING_DIMENSIONS
    },
    retrieval: {
      topK: parsed.RETRIEVAL_TOP_K,
      shown: parsed.RETRIEVAL_SHOWN,
      minScore: parsed.RETRIEVAL_MIN_SCORE
    }
  };
}
