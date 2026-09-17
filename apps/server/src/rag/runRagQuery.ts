import type { CardFilters, Language } from '@ygo-assistant/cards';
import type { TurnStatus } from '@ygo-assistant/contracts';
import type { ParseOutcome, RankedCard } from '@ygo-assistant/rag';
import { retrieveCards } from '@ygo-assistant/rag';

import { answerDeltas } from '../server/conversations/answerDeltas.js';
import {
  type SearchInput,
  type TurnSearch,
  resolveSearch
} from '../server/conversations/resolveSearch.js';
import type { OllamaDependencies } from '../server/types.js';

/**
 * Everything the command resolved before it runs: the request, the language and
 * model to answer it in, whether the parse runs at all, whether the answer does,
 * and the ranking the search uses.
 */
export interface RagQueryInput {
  prompt: string;
  language: Language;
  model: string;
  supportsStructuredOutput: boolean;
  editedFilters?: CardFilters;
  parse: boolean;
  answer: boolean;
  topK: number;
  shown: number;
  minScore: number;
}

/**
 * What the query needs to reach: the index to search and the instance to embed
 * and answer with, plus the logger the search traces through.
 */
export interface RagQueryDependencies extends OllamaDependencies {
  dataDir: string;
}

/**
 * What a query reports as it runs. It carries the same decisions the server's
 * turn makes, without the conversation around them.
 */
export type RagQueryEvent =
  | {
      type: 'search';
      filters: CardFilters;
      query?: string;
      status?: TurnStatus;
      outcome?: ParseOutcome;
    }
  | { type: 'ranked'; ranked: RankedCard[] }
  | { type: 'answer'; text: string };

/**
 * Runs the pipeline the server's turns run, and nothing else: the search the
 * request resolves to, the cards ranked for it, and the grounded answer as it is
 * written. Nothing is stored and no turn is announced, so this is the pipeline
 * on its own, which is what makes it usable for judging a parse, a ranking, or
 * an answer without a conversation in the way.
 */
export async function* runRagQuery(
  dependencies: RagQueryDependencies,
  input: RagQueryInput
): AsyncGenerator<RagQueryEvent> {
  const search: TurnSearch = input.parse
    ? await resolveSearch(dependencies, searchInput(input))
    : { text: input.prompt, filters: [] };

  yield {
    type: 'search',
    filters: search.filters,
    query: search.text,
    status: search.status,
    outcome: search.outcome
  };

  const ranked = await retrieveCards({
    dataDir: dependencies.dataDir,
    embedder: dependencies.ollama,
    query: {
      text: search.text,
      filters: search.filters,
      language: input.language
    },
    ranking: { topK: input.topK, minScore: input.minScore }
  });

  yield { type: 'ranked', ranked };

  if (!input.answer) {
    return;
  }

  const cards = ranked.slice(0, input.shown).map(rankedCard => rankedCard.card);
  const deltas = answerDeltas(
    dependencies,
    input.model,
    input.prompt,
    input.language,
    cards
  );
  for await (const delta of deltas) {
    yield { type: 'answer', text: delta };
  }
}

function searchInput(input: RagQueryInput): SearchInput {
  return {
    text: input.prompt,
    model: input.model,
    supportsStructuredOutput: input.supportsStructuredOutput,
    editedFilters: input.editedFilters
  };
}
