import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCardIndex, computeDatasetVersion } from '@ygo-assistant/db';
import { OllamaClient } from '@ygo-assistant/ollama';
import { FakeOllamaServer } from '@ygo-assistant/ollama/testing';

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  FIXTURE_CARDS
} from './fixtures/cards.js';
import { ollamaHandler } from './fixtures/ollama.js';

/**
 * The end-to-end stack, owned by one process. It starts the fake Ollama, seeds
 * a real index from the fixture cards through the real embedding client, starts
 * the built server against that data directory, and serves the built client,
 * then stays up until the suite is done and tears the temporary data directory
 * down. Playwright starts this process and waits for the client's address.
 *
 * Nothing here reaches the network: the index is seeded from fixtures rather
 * than the populate command, the card images are data URIs, and the only server
 * the stack talks to is the fake on a loopback port.
 */
const PORT_SERVER = 3210;
const PORT_CLIENT = 4173;
const CLIENT_ORIGIN = `http://127.0.0.1:${PORT_CLIENT}`;
const SERVER_HEALTH = `http://127.0.0.1:${PORT_SERVER}/health`;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = join(repoRoot, 'apps/server/dist/main.js');
const clientDirectory = join(repoRoot, 'apps/web');
const viteBin = join(repoRoot, 'apps/web/node_modules/.bin/vite');

const children: ChildProcess[] = [];
const dataDir = await mkdtemp(join(tmpdir(), 'ygo-e2e-'));
const fake = new FakeOllamaServer();

let stopping = false;

async function stop(): Promise<void> {
  if (stopping) {
    return;
  }
  stopping = true;

  for (const child of children) {
    child.kill('SIGTERM');
  }

  await fake.stop().catch(() => undefined);
  await rm(dataDir, { recursive: true, force: true }).catch(() => undefined);
}

function shutdown(): void {
  void stop().finally(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('exit', () => rmSync(dataDir, { recursive: true, force: true }));

function requireBuild(): void {
  if (existsSync(serverEntry) && existsSync(viteBin)) {
    return;
  }

  throw new Error(
    'The built server or client is missing. Run "pnpm build:e2e" before the suite.'
  );
}

function start(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
): void {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'inherit', 'inherit']
  });
  children.push(child);
}

async function waitFor(url: string, label: string): Promise<void> {
  const deadline = Date.now() + 120_000;
  let lastFailure = 'no answer';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastFailure = `HTTP ${response.status}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await delay(250);
  }

  throw new Error(`${label} did not answer at ${url}: ${lastFailure}`);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  requireBuild();

  const fakeUrl = await fake.start(ollamaHandler);
  report(`fake Ollama at ${fakeUrl}`);

  const embedder = new OllamaClient({
    baseUrl: fakeUrl,
    embeddingBaseUrl: fakeUrl,
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimensions: EMBEDDING_DIMENSIONS
  });

  await buildCardIndex({
    dataDir,
    cards: FIXTURE_CARDS,
    embedder,
    embeddingModel: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    datasetVersion: computeDatasetVersion(FIXTURE_CARDS)
  });
  report(`index seeded with ${FIXTURE_CARDS.length} cards`);

  start('node', [serverEntry], repoRoot, {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(PORT_SERVER),
    DATA_DIR: dataDir,
    LOG_DIR: join(dataDir, 'logs'),
    NODE_ENV: 'production',
    LOG_LEVEL: 'warn',
    OLLAMA_BASE_URL: fakeUrl,
    OLLAMA_EMBEDDING_BASE_URL: fakeUrl,
    OLLAMA_EMBEDDING_MODEL: EMBEDDING_MODEL,
    OLLAMA_EMBEDDING_DIMENSIONS: String(EMBEDDING_DIMENSIONS),
    CORS_ORIGIN: CLIENT_ORIGIN
  });
  await waitFor(SERVER_HEALTH, 'the server');
  report('server ready');

  start(
    viteBin,
    [
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(PORT_CLIENT),
      '--strictPort'
    ],
    clientDirectory
  );
  await waitFor(CLIENT_ORIGIN, 'the client');
  report(`client ready at ${CLIENT_ORIGIN}`);
}

function report(message: string): void {
  process.stdout.write(`[e2e] ${message}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `[e2e] ${error instanceof Error ? error.message : String(error)}\n`
  );
  await stop();
  process.exit(1);
}
