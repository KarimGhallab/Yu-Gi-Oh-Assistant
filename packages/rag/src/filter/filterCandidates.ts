import type { Card } from '@ygo-assistant/cards';
import {
  type ChatMessage,
  type ChatRequest,
  ChatRole
} from '@ygo-assistant/ollama';

import type { FilterCandidatesOptions } from '../types.js';
import { buildFilterPrompt } from './filterPrompt.js';
import {
  filterFormatSchema,
  filterResponseSchema
} from './filterResponseSchema.js';

/**
 * A filter wants the same judgement from the same candidates every time, so the
 * model is asked for no creativity at all.
 */
const FILTER_TEMPERATURE = 0;

/**
 * Asks a model which of the cards a search found really answer the request, and
 * returns them in the order the search ranked them.
 *
 * The request is the player's own words rather than the text the search ran on,
 * because the judgement is about what they asked for. An answer that is not a
 * list of ids raises rather than being read as keeping nothing: the caller
 * decides what a failed judgement means, and the ranking it was judging is
 * still there to fall back on.
 */
export async function filterCandidates(
  options: FilterCandidatesOptions
): Promise<Card[]> {
  const answer = await askTheModel(options);
  const parsed = filterResponseSchema.safeParse(readJson(answer));

  if (!parsed.success) {
    throw new Error(
      'The model did not answer the filter with a list of card ids'
    );
  }

  return keepFromPool(parsed.data.keep, options.pool);
}

async function askTheModel(options: FilterCandidatesOptions): Promise<string> {
  const messages: ChatMessage[] = [
    { role: ChatRole.System, content: buildFilterPrompt(options.pool) },
    { role: ChatRole.User, content: options.request }
  ];
  const request: ChatRequest = {
    model: options.model,
    messages,
    temperature: FILTER_TEMPERATURE
  };
  if (options.supportsStructuredOutput) {
    request.format = filterFormatSchema();
  }

  let content = '';
  for await (const chunk of options.client.chat(request)) {
    content += chunk.content;
  }

  return content;
}

/**
 * The cards the model kept, in the order the search ranked them. An id the pool
 * does not hold is dropped rather than trusted, and a card named twice comes
 * back once, because the pool is what an answer may be drawn from and it holds
 * each card once.
 */
function keepFromPool(ids: number[], pool: Card[]): Card[] {
  const kept = new Set(ids);

  return pool.filter(card => kept.has(card.id));
}

function readJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}
