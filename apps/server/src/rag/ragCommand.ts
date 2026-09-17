import {
  type ILogger,
  type LogDestination,
  LogLevel,
  type LoggerOptions,
  createLogger
} from '@ygo-assistant/logger';
import type { OllamaModel } from '@ygo-assistant/ollama';
import { hasErrorMessage } from '@ygo-assistant/utils';

import {
  type AppConfig,
  NodeEnvironment,
  loadConfig
} from '../config/index.js';
import { ensureIndexMatchesConfig } from '../index-guard/ensureIndexMatchesConfig.js';
import { createOllamaClient } from '../ollama-client/createOllamaClient.js';
import {
  defaultModel,
  installedModels,
  requireInstalledModel
} from '../server/models/modelService.js';
import type { OllamaDependencies } from '../server/types.js';
import { RagReporter } from './RagReporter.js';
import { type RagArgs, RagArgsError, parseRagArgs } from './parseRagArgs.js';
import {
  type RagQueryDependencies,
  type RagQueryInput,
  runRagQuery
} from './runRagQuery.js';

const USAGE = `Ask the local card pipeline a question.

Usage:
  pnpm -F @ygo-assistant/server rag:ask "<request>" [options]

Options:
  --language <en|fr>  Retrieval partition and answer language (default: en)
  --model <name>      Model to parse and answer with (default: first installed)
  --filters <json>    Use these filters as they stand instead of parsing
  --no-parse          Search the request as free text, with no parse
  --retrieve-only     Stop after retrieval, without asking for an answer
  --no-filter        Show the search's own top cards, with no model judgement
  --top-k <n>         Candidates retrieval may return (default: configured)
  --shown <n>         Cards a turn may show (default: configured)
  --min-score <n>     Lowest similarity retrieval keeps (default: configured)
  --filter-pool <n>   Candidates the model judges (default: configured)
  --debug             Log at debug level
  --json              Write one JSON line per event
  -h, --help          Show this message

The request may also arrive on stdin.`;

/**
 * In JSON mode the report owns stdout, so the logger writes to stderr instead
 * and the output stays consumable by a script.
 */
const STDERR: LogDestination = {
  write: (message: string): void => {
    process.stderr.write(message);
  }
};

async function main(): Promise<void> {
  let args: RagArgs;
  try {
    args = parseRagArgs(process.argv.slice(2));
  } catch (error) {
    fail(error instanceof RagArgsError ? error.message : describeError(error));
    return;
  }

  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const config = loadConfig(process.env);
  const logger = createRagLogger(args, config);

  try {
    await ensureIndexMatchesConfig(config);
  } catch (error) {
    logger.error('The card index is not usable', {
      message: describeError(error)
    });
    process.exitCode = 1;
    return;
  }

  const prompt = args.prompt ?? (await readPrompt());
  if (prompt.trim().length === 0) {
    fail('No request was given');
    return;
  }

  const dependencies: RagQueryDependencies = {
    logger,
    ollama: createOllamaClient(config.ollama),
    dataDir: config.dataDir
  };

  let model: OllamaModel;
  try {
    model = await selectModel(dependencies, args.model);
  } catch (error) {
    logger.error('No model can answer the request', {
      message: describeError(error)
    });
    process.exitCode = 1;
    return;
  }

  const input: RagQueryInput = {
    prompt,
    language: args.language,
    model: model.name,
    supportsStructuredOutput: model.supportsStructuredOutput,
    editedFilters: args.filters,
    parse: args.parse,
    answer: args.answer,
    filter: args.filter,
    topK: args.topK ?? config.retrieval.topK,
    shown: args.shown ?? config.retrieval.shown,
    minScore: args.minScore ?? config.retrieval.minScore,
    filterPool: args.filterPool ?? config.retrieval.filterPool
  };

  const reporter = new RagReporter(args.json);
  reporter.header({
    prompt,
    language: input.language,
    model: input.model,
    topK: input.topK,
    shown: input.shown,
    minScore: input.minScore
  });

  for await (const event of runRagQuery(dependencies, input)) {
    reporter.event(event);
  }
  reporter.finish();
}

/**
 * The model the command runs on: the one it was asked for, or the same default
 * a conversation would start on, either way one the instance really has.
 */
async function selectModel(
  dependencies: OllamaDependencies,
  requested: string | undefined
): Promise<OllamaModel> {
  const models = await installedModels(dependencies);
  const name = requested ?? defaultModel(models);

  return requireInstalledModel(dependencies, name);
}

function createRagLogger(args: RagArgs, config: AppConfig): ILogger {
  const options: LoggerOptions = {
    level: args.debug ? LogLevel.Debug : config.logLevel,
    name: 'rag',
    pretty: config.nodeEnv !== NodeEnvironment.Production
  };

  if (args.json) {
    return createLogger({ ...options, destination: STDERR });
  }

  return createLogger(options);
}

async function readPrompt(): Promise<string> {
  if (process.stdin.isTTY === true) {
    return '';
  }

  let content = '';
  for await (const chunk of process.stdin) {
    content += String(chunk);
  }

  return content.trim();
}

function fail(message: string): void {
  process.stderr.write(`${message}\n\n${USAGE}\n`);
  process.exitCode = 2;
}

function describeError(error: unknown): string {
  return hasErrorMessage(error) ? error.message : String(error);
}

await main();
