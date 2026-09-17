import { parseArgs } from 'node:util';

import { z } from 'zod';

import {
  type CardFilters,
  Language,
  cardFiltersSchema
} from '@ygo-assistant/cards';

/**
 * A usage mistake rather than a run that failed: what the command was asked for
 * cannot be run at all, and the message says which part of it is wrong.
 */
export class RagArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RagArgsError';
  }
}

/**
 * What the command was asked to do, with everything it did not name left for
 * the configuration to answer.
 */
export interface RagArgs {
  prompt?: string;
  language: Language;
  model?: string;
  filters?: CardFilters;
  parse: boolean;
  answer: boolean;
  topK?: number;
  shown?: number;
  minScore?: number;
  debug: boolean;
  json: boolean;
  help: boolean;
}

interface RagValues {
  language?: string;
  model?: string;
  filters?: string;
  'no-parse'?: boolean;
  'retrieve-only'?: boolean;
  'top-k'?: string;
  shown?: string;
  'min-score'?: string;
  debug?: boolean;
  json?: boolean;
  help?: boolean;
}

const OPTIONS = {
  language: { type: 'string' },
  model: { type: 'string' },
  filters: { type: 'string' },
  'no-parse': { type: 'boolean' },
  'retrieve-only': { type: 'boolean' },
  'top-k': { type: 'string' },
  shown: { type: 'string' },
  'min-score': { type: 'string' },
  debug: { type: 'boolean' },
  json: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' }
} as const;

const LANGUAGES = new Set<string>(Object.values(Language));

/**
 * Reads the command line. The prompt is every positional word joined, so it can
 * be written with or without quotes, and an option the command does not know is
 * refused rather than ignored.
 */
export function parseRagArgs(argv: string[]): RagArgs {
  const { values, positionals } = parseCommandLine(argv);
  const prompt = positionals.join(' ').trim();

  if (values.filters !== undefined && values['no-parse'] === true) {
    throw new RagArgsError(
      '--filters and --no-parse cannot be combined: filters already skip the parse'
    );
  }

  return {
    prompt: prompt.length === 0 ? undefined : prompt,
    language: toLanguage(values.language),
    model: values.model,
    filters: toFilters(values.filters),
    parse: values['no-parse'] !== true,
    answer: values['retrieve-only'] !== true,
    topK: toCount(values['top-k'], '--top-k'),
    shown: toCount(values.shown, '--shown'),
    minScore: toNumber(values['min-score'], '--min-score'),
    debug: values.debug === true,
    json: values.json === true,
    help: values.help === true
  };
}

function parseCommandLine(argv: string[]): {
  values: RagValues;
  positionals: string[];
} {
  try {
    return parseArgs({
      args: argv,
      options: OPTIONS,
      allowPositionals: true,
      strict: true
    });
  } catch (error) {
    throw new RagArgsError(
      error instanceof Error ? error.message : String(error)
    );
  }
}

const isLanguage = (value: string): value is Language => LANGUAGES.has(value);

function toLanguage(value: string | undefined): Language {
  if (value === undefined) {
    return Language.English;
  }
  if (!isLanguage(value)) {
    throw new RagArgsError(
      `--language must be one of: ${[...LANGUAGES].join(', ')}`
    );
  }

  return value;
}

function toFilters(value: string | undefined): CardFilters | undefined {
  if (value === undefined) {
    return undefined;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(value);
  } catch {
    throw new RagArgsError('--filters must be a JSON array of filters');
  }

  const parsed = cardFiltersSchema.safeParse(payload);
  if (!parsed.success) {
    throw new RagArgsError(
      `--filters is not a valid filter set: ${z.prettifyError(parsed.error)}`
    );
  }

  return parsed.data;
}

function toCount(value: string | undefined, flag: string): number | undefined {
  const number = toNumber(value, flag);
  if (number === undefined) {
    return undefined;
  }
  if (!Number.isInteger(number) || number < 1) {
    throw new RagArgsError(`${flag} must be a positive whole number`);
  }

  return number;
}

function toNumber(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new RagArgsError(`${flag} must be a number`);
  }

  return number;
}
