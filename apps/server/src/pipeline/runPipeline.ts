import type { Card, CardFilters, Language } from '@ygo-assistant/cards';
import { TurnStage, type TurnStatus } from '@ygo-assistant/contracts';
import type { ICardCatalog } from '@ygo-assistant/db';
import type { ILogger } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';
import {
  type ParseOutcome,
  type RankedCard,
  retrieveCards,
  selectCards
} from '@ygo-assistant/rag';

import { answerDeltas } from './answerDeltas.js';
import {
  type SearchInput,
  type TurnSearch,
  resolveSearch
} from './resolveSearch.js';

/**
 * What the pipeline reports as it runs, in one neutral vocabulary the callers
 * map from. It is deliberately not the turn's wire events: the pipeline knows
 * nothing about a conversation, and a caller that has no player to talk to still
 * reads the same stream.
 */
export type PipelineEvent =
  | {
      type: 'search';
      filters: CardFilters;
      query?: string;
      status?: TurnStatus;
      outcome?: ParseOutcome;
    }
  | { type: 'ranked'; ranked: RankedCard[] }
  | { type: 'selected'; pool: number; cards: Card[]; fellBack: boolean }
  | { type: 'answer'; text: string };

/**
 * What the pipeline reaches: the catalog it reads, the instance it embeds and
 * answers with, and the logger it traces through. It is narrower than the
 * server's dependencies on purpose, so the sequence cannot reach the
 * conversation store or the app config.
 */
export interface PipelineDependencies {
  logger: ILogger;
  ollama: IOllamaClient;
  catalog: ICardCatalog;
}

/**
 * Everything the pipeline runs on: the request, the language and model to answer
 * it in, whether each stage runs at all, and the numbers retrieval and the
 * judgement use. A caller resolves its own overrides before it gets here.
 */
export interface PipelineInput {
  request: string;
  language: Language;
  model: string;
  supportsStructuredOutput: boolean;
  editedFilters?: CardFilters;
  parse: boolean;
  filter: boolean;
  answer: boolean;
  ranking: { topK: number; minScore: number };
  pool: number;
  shown: number;
  /** Only carried to correlate the trace; a caller without a conversation omits it. */
  conversationId?: string;
}

/**
 * Raised when the pipeline gives way, carrying the stage it died at so a caller
 * can say which part failed without tracking the stage itself. The underlying
 * error is the cause, which is what decides whether the failure is one the
 * domain understands.
 */
export class PipelineError extends Error {
  readonly stage: TurnStage;

  constructor(stage: TurnStage, cause: unknown) {
    super(`The pipeline failed at the ${stage} stage`, { cause });
    this.name = 'PipelineError';
    this.stage = stage;
  }
}

/**
 * Runs the turn's sequence and nothing else: the search the request resolves to,
 * the cards ranked for it, the cards the model keeps of them, and the grounded
 * answer as it is written. Nothing is stored and no turn is announced, so the
 * pipeline stands on its own between the composition root and whatever adapter
 * calls it.
 *
 * A stage change is one edit here, and a failure carries the stage it happened
 * at, so a caller maps a stage-tagged error rather than tracking the stage along
 * the way.
 */
export async function* runPipeline(
  dependencies: PipelineDependencies,
  input: PipelineInput
): AsyncGenerator<PipelineEvent> {
  let stage = TurnStage.Parse;

  try {
    const search: TurnSearch = input.parse
      ? await resolveSearch(dependencies, searchInput(input))
      : { text: input.request, filters: [] };

    yield {
      type: 'search',
      filters: search.filters,
      query: search.text,
      status: search.status,
      outcome: search.outcome
    };

    stage = TurnStage.Search;
    const ranked = await retrieveCards({
      catalog: dependencies.catalog,
      embedder: dependencies.ollama,
      query: {
        text: search.text,
        filters: search.filters,
        language: input.language
      },
      ranking: input.ranking
    });

    yield { type: 'ranked', ranked };

    const selection = await selectCards({
      client: dependencies.ollama,
      model: input.model,
      supportsStructuredOutput: input.supportsStructuredOutput,
      request: input.request,
      ranked,
      pool: input.pool,
      shown: input.shown,
      filter: input.filter
    });

    yield {
      type: 'selected',
      pool: selection.pool,
      cards: selection.cards,
      fellBack: selection.fellBack
    };

    if (!input.answer) {
      return;
    }

    stage = TurnStage.Answer;
    const deltas = answerDeltas(
      dependencies,
      input.model,
      input.request,
      input.language,
      selection.cards,
      search.filters
    );
    for await (const delta of deltas) {
      yield { type: 'answer', text: delta };
    }
  } catch (error) {
    throw new PipelineError(stage, error);
  }
}

function searchInput(input: PipelineInput): SearchInput {
  return {
    text: input.request,
    model: input.model,
    supportsStructuredOutput: input.supportsStructuredOutput,
    language: input.language,
    editedFilters: input.editedFilters,
    conversationId: input.conversationId
  };
}
