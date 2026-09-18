import type { CardFilters, Language } from '@ygo-assistant/cards';
import { TurnStatus } from '@ygo-assistant/contracts';
import {
  ParseOutcome,
  type ParseResult,
  parseCardRequest
} from '@ygo-assistant/rag';

import type { OllamaDependencies } from '../types.js';

/**
 * The search a turn runs: the constraints and the free text, each of which the
 * turn always has an answer for, unlike a retrieval query where either may be
 * absent. The outcome says how the search was arrived at, and the status what
 * the player is owed about it.
 */
export interface TurnSearch {
  text?: string;
  filters: CardFilters;
  status?: TurnStatus;
  outcome?: ParseOutcome;
}

/**
 * Everything a search needs from a request: what was asked, the model to parse
 * it with, and the filters the player edited, if any. It is deliberately
 * narrower than a turn's input, so a caller that runs no turn can still resolve
 * a search.
 */
export interface SearchInput {
  text: string;
  model: string;
  supportsStructuredOutput: boolean;
  language: Language;
  editedFilters?: CardFilters;
  /** Only carried to correlate the trace; a caller without a conversation omits it. */
  conversationId?: string;
}

/**
 * The search a turn runs. A request the player edited the filters of is taken
 * at their word: the filters are used as they stand and the text becomes the
 * free text, because parsing it again would overwrite the correction. Anything
 * else is parsed, and a parse that left the turn nothing of its own hands the
 * request over as the free text with a status saying so.
 */
export async function resolveSearch(
  dependencies: OllamaDependencies,
  input: SearchInput
): Promise<TurnSearch> {
  if (input.editedFilters !== undefined) {
    dependencies.logger.debug('Request taken as edited', {
      conversationId: input.conversationId,
      filters: input.editedFilters.length
    });

    return { text: input.text, filters: input.editedFilters };
  }

  const parse = await parseCardRequest({
    client: dependencies.ollama,
    model: input.model,
    supportsStructuredOutput: input.supportsStructuredOutput,
    request: input.text,
    language: input.language
  });
  const filters = parse.outcome === ParseOutcome.Parsed ? parse.filters : [];

  dependencies.logger.debug('Request parsed', {
    conversationId: input.conversationId,
    outcome: parse.outcome,
    filters: filters.length,
    originalQuery: input.text,
    rephrasedQuery: parse.query ?? ''
  });

  const search: TurnSearch = {
    text: searchText(parse, filters, input.text),
    filters,
    outcome: parse.outcome
  };

  if (leftNothingToSearch(parse)) {
    search.status = TurnStatus.FreeTextOnly;
    dependencies.logger.debug('Search fell back to the request text', {
      conversationId: input.conversationId
    });
  }

  return search;
}

/**
 * Whether the parse left the turn with nothing of its own: no constraints and
 * no free text either, so the search runs on the request as the player wrote it.
 * That is the state worth announcing, because an empty filter list on its own
 * does not say whether the request named nothing or the parse found nothing. A
 * parse that kept a query of its own is not this case, even when that query is
 * the request word for word: the model did read something into it.
 */
function leftNothingToSearch(parse: ParseResult): boolean {
  return (
    parse.outcome !== ParseOutcome.Parsed ||
    (parse.filters.length === 0 && parse.query === undefined)
  );
}

/**
 * The free text a turn searches on. The parse's own query is used whenever it
 * kept one, and a request it could not turn into anything at all is searched
 * itself, because handing retrieval neither a query nor a constraint returns
 * the catalog's arbitrary top cards rather than a search of what was asked.
 */
function searchText(
  parse: ParseResult,
  filters: CardFilters,
  request: string
): string | undefined {
  if (parse.query !== undefined) {
    return parse.query;
  }

  return filters.length === 0 ? request : undefined;
}
