import { z } from 'zod';

import {
  type FilterFieldVocabulary,
  describeFilterFields
} from '@ygo-assistant/cards';
import {
  type ChatMessage,
  type ChatRequest,
  ChatRole
} from '@ygo-assistant/ollama';

import {
  type ParseCardRequestOptions,
  ParseOutcome,
  type ParseResult,
  type ParsedRequest
} from '../types.js';
import { buildParsePrompt, buildRepairPrompt } from './prompt.js';
import {
  type ParseResponse,
  parseFormatSchema,
  parseResponseSchema
} from './schema.js';

/**
 * A parse wants the same answer from the same request every time, so the model
 * is asked for no creativity at all.
 */
const PARSE_TEMPERATURE = 0;

/**
 * What a repair is told when there was nothing to quote from a validator: the
 * model has to hear that its answer was not JSON at all.
 */
const NOT_JSON_REJECTION = 'the answer was not JSON';

/**
 * Turns a player's request into the filters and the free-text query retrieval
 * searches on. A model that can be constrained by a schema is handed one, and a
 * request the model cannot turn into a valid result degrades to the request
 * itself as the free text rather than failing the turn.
 *
 * A first answer that does not validate earns exactly one repair, whichever
 * model produced it: the conversation continues with the rejected answer and
 * the validator's complaint, and only a second failure degrades. A repair loop
 * would spend a turn's latency on a model that is not going to comply.
 */
export async function parseCardRequest(
  options: ParseCardRequestOptions
): Promise<ParseResult> {
  const vocabulary = describeFilterFields();
  const messages = buildMessages(options.request, vocabulary);

  const answer = await askTheModel(options, messages);
  const payload = readJson(answer);
  const parsed = parseResponseSchema.safeParse(payload);

  if (parsed.success) {
    return toParsedRequest(parsed.data);
  }

  const rejection =
    payload === undefined ? NOT_JSON_REJECTION : z.prettifyError(parsed.error);
  const repaired = await repairOnce(options, messages, answer, rejection);

  return repaired ?? { outcome: ParseOutcome.Degraded, query: options.request };
}

/**
 * The one repair a parse that failed validation is allowed. It is best effort by
 * design: the turn is already answerable from the request alone, so a model that
 * answers badly again, or cannot be reached at all, leaves the caller with a
 * degraded search rather than no turn. The first attempt is not treated that
 * way, because without it there is no parse to degrade from.
 */
async function repairOnce(
  options: ParseCardRequestOptions,
  messages: ChatMessage[],
  answer: string,
  rejection: string
): Promise<ParsedRequest | undefined> {
  let second: string;
  try {
    second = await askTheModel(
      options,
      withRepair(messages, answer, rejection)
    );
  } catch {
    return undefined;
  }

  const parsed = parseResponseSchema.safeParse(readJson(second));

  return parsed.success ? toParsedRequest(parsed.data) : undefined;
}

async function askTheModel(
  options: ParseCardRequestOptions,
  messages: ChatMessage[]
): Promise<string> {
  const request: ChatRequest = {
    model: options.model,
    messages,
    temperature: PARSE_TEMPERATURE
  };
  if (options.supportsStructuredOutput) {
    request.format = parseFormatSchema();
  }

  let content = '';
  for await (const chunk of options.client.chat(request)) {
    content += chunk.content;
  }

  return content;
}

function buildMessages(
  request: string,
  vocabulary: FilterFieldVocabulary[]
): ChatMessage[] {
  return [
    { role: ChatRole.System, content: buildParsePrompt(vocabulary) },
    { role: ChatRole.User, content: request }
  ];
}

/**
 * The conversation a repair continues: the answer that was rejected, then what
 * was wrong with it. Showing the model its own answer lets it correct that
 * rather than answer the request again from scratch.
 */
function withRepair(
  messages: ChatMessage[],
  answer: string,
  rejection: string
): ChatMessage[] {
  return [
    ...messages,
    { role: ChatRole.Assistant, content: answer },
    { role: ChatRole.User, content: buildRepairPrompt(rejection) }
  ];
}

function readJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

function toParsedRequest(response: ParseResponse): ParsedRequest {
  return {
    outcome: ParseOutcome.Parsed,
    filters: response.filters ?? [],
    query: toQuery(response.query)
  };
}

/**
 * A free-text part only counts when it carries something: a blank query is no
 * query, which keeps an empty answer an honest empty search.
 */
function toQuery(value: string | undefined): string | undefined {
  const query = value?.trim() ?? '';

  return query.length === 0 ? undefined : query;
}
