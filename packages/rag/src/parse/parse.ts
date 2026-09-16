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
import { buildParsePrompt } from './prompt.js';
import {
  type ParseResponse,
  parseFormatSchema,
  parseResponseSchema
} from './schema.js';
import { describeFilterFields } from './vocabulary.js';

/**
 * A parse wants the same answer from the same request every time, so the model
 * is asked for no creativity at all.
 */
const PARSE_TEMPERATURE = 0;

/**
 * Turns a player's request into the filters and the free-text query retrieval
 * searches on. A model that can be constrained by a schema is handed one, and a
 * request the model cannot turn into a valid result degrades to the request
 * itself as the free text rather than failing the turn.
 */
export async function parseCardRequest(
  options: ParseCardRequestOptions
): Promise<ParseResult> {
  const response = await askTheModel(options);
  const parsed = parseResponseSchema.safeParse(readJson(response));

  if (!parsed.success) {
    return { outcome: ParseOutcome.Degraded, query: options.request };
  }

  return toParsedRequest(parsed.data);
}

async function askTheModel(options: ParseCardRequestOptions): Promise<string> {
  const request: ChatRequest = {
    model: options.model,
    messages: buildMessages(options.request),
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

function buildMessages(request: string): ChatMessage[] {
  return [
    {
      role: ChatRole.System,
      content: buildParsePrompt(describeFilterFields())
    },
    { role: ChatRole.User, content: request }
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
