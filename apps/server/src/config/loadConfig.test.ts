import { describe, expect, it } from 'vitest';

import { LogLevel } from '@ygo-assistant/logger';

import { ConfigurationError, loadConfig } from './loadConfig.js';
import { NodeEnvironment } from './types.js';

describe('loadConfig', () => {
  it('applies defaults when the environment is empty', () => {
    const config = loadConfig({});

    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(3000);
    expect(config.dataDir).toBe('./data');
    expect(config.nodeEnv).toBe(NodeEnvironment.Development);
    expect(config.logLevel).toBe(LogLevel.Info);
    expect(config.logDir).toBe('./logs');
    expect(config.ollama.baseUrl).toBe('http://127.0.0.1:11434');
    expect(config.ollama.embeddingBaseUrl).toBe('http://127.0.0.1:11434');
    expect(config.ollama.embeddingModel).toBe('qwen3-embedding:0.6b');
    expect(config.ollama.embeddingDimensions).toBe(1024);
    expect(config.retrieval.topK).toBe(25);
    expect(config.retrieval.shown).toBe(8);
    expect(config.retrieval.minScore).toBe(0);
  });

  it('reads and coerces every value from the environment', () => {
    const config = loadConfig({
      HOST: '0.0.0.0',
      PORT: '8080',
      DATA_DIR: '/tmp/ygo',
      NODE_ENV: 'production',
      LOG_LEVEL: 'warn',
      LOG_DIR: '/tmp/ygo-logs',
      OLLAMA_BASE_URL: 'http://ollama.local:11434',
      OLLAMA_EMBEDDING_BASE_URL: 'http://embed.local:11434',
      OLLAMA_EMBEDDING_MODEL: 'bge-m3',
      OLLAMA_EMBEDDING_DIMENSIONS: '1024',
      RETRIEVAL_TOP_K: '40',
      RETRIEVAL_SHOWN: '12',
      RETRIEVAL_MIN_SCORE: '0.4'
    });

    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(8080);
    expect(config.dataDir).toBe('/tmp/ygo');
    expect(config.nodeEnv).toBe(NodeEnvironment.Production);
    expect(config.logLevel).toBe(LogLevel.Warn);
    expect(config.logDir).toBe('/tmp/ygo-logs');
    expect(config.ollama.baseUrl).toBe('http://ollama.local:11434');
    expect(config.ollama.embeddingBaseUrl).toBe('http://embed.local:11434');
    expect(config.ollama.embeddingModel).toBe('bge-m3');
    expect(config.ollama.embeddingDimensions).toBe(1024);
    expect(config.retrieval.topK).toBe(40);
    expect(config.retrieval.shown).toBe(12);
    expect(config.retrieval.minScore).toBe(0.4);
  });

  it('falls back to the base URL when no embedding URL is set', () => {
    const config = loadConfig({ OLLAMA_BASE_URL: 'http://remote:11434' });

    expect(config.ollama.embeddingBaseUrl).toBe('http://remote:11434');
  });

  it('leaves the allowed client origins undefined when not configured', () => {
    expect(loadConfig({}).corsOrigin).toBeUndefined();
  });

  it('parses a comma-separated list of allowed client origins', () => {
    const config = loadConfig({
      CORS_ORIGIN: 'http://localhost:5173, https://assistant.example'
    });

    expect(config.corsOrigin).toEqual([
      'http://localhost:5173',
      'https://assistant.example'
    ]);
  });

  it('refuses to start and names the offending variable', () => {
    expect(() => loadConfig({ PORT: 'not-a-port' })).toThrow(
      ConfigurationError
    );
    expect(() => loadConfig({ PORT: 'not-a-port' })).toThrow(/PORT/);
  });

  it('rejects unknown enum values by name', () => {
    expect(() => loadConfig({ LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('rejects an out-of-range retrieval score', () => {
    expect(() => loadConfig({ RETRIEVAL_MIN_SCORE: '2' })).toThrow(
      /RETRIEVAL_MIN_SCORE/
    );
  });
});
