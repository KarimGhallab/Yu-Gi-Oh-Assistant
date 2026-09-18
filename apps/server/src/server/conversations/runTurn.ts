import { type CardFilters, Language } from '@ygo-assistant/cards';
import {
  type TurnEvent,
  TurnEventName,
  TurnStage
} from '@ygo-assistant/contracts';
import { MessageRole } from '@ygo-assistant/db';
import { ParseOutcome, retrieveCards, selectCards } from '@ygo-assistant/rag';
import { DomainError, hasErrorMessage } from '@ygo-assistant/utils';

import type { ServerDependencies } from '../types.js';
import { answerDeltas } from './answerDeltas.js';
import { type TurnSearch, resolveSearch } from './resolveSearch.js';

/**
 * What the turn runs on: the conversation it happens in, what the player asked
 * for, the settings the turn settled on, and the message that was already
 * stored for them. The stored id is what lets the client reconcile the message
 * it rendered optimistically.
 *
 * The settings are the ones in force, not the conversation's own: whoever
 * starts the turn has already resolved the player's overrides against the
 * conversation, so the pipeline never has to know which one won.
 */
export interface TurnInput {
  conversationId: string;
  text: string;
  userMessageId: string;
  language: Language;
  model: string;
  supportsStructuredOutput: boolean;
  editedFilters?: CardFilters;
}

/**
 * What the turn says when it gave way for a reason it cannot explain to the
 * player, such as a bug of ours.
 */
const TURN_FAILED_MESSAGE = 'The turn failed';

/**
 * Runs one turn end to end and yields what it is doing as it does it: the
 * search that was understood, the cards it found, the answer as it is written,
 * and the id the answer was stored under.
 *
 * The answer is written from the cards retrieval returned and nothing else, so
 * a suggested card cannot be invented, and the turn is stored only once, when
 * the answer is complete: a turn that fails partway leaves the question and no
 * reply (ticket 27).
 */
export async function* runTurn(
  dependencies: ServerDependencies,
  input: TurnInput
): AsyncGenerator<TurnEvent> {
  const { text, language, model } = input;

  yield { type: TurnEventName.TurnStart, userMessageId: input.userMessageId };

  let stage = TurnStage.Parse;
  try {
    const search: TurnSearch = await resolveSearch(dependencies, input);

    await storeQuery(dependencies, input, search);

    if (search.status !== undefined) {
      yield { type: TurnEventName.Status, status: search.status };
    }

    // The event reports the search that is actually about to run, so a client
    // rendering the chips shows what retrieval was asked for, even when the
    // parse kept no free text of its own and the request was searched instead.
    yield {
      type: TurnEventName.Filters,
      filters: search.filters,
      query: search.text
    };

    stage = TurnStage.Search;
    const ranked = await retrieveCards({
      catalog: dependencies.catalog,
      embedder: dependencies.ollama,
      query: { text: search.text, filters: search.filters, language },
      ranking: {
        topK: dependencies.config.retrieval.topK,
        minScore: dependencies.config.retrieval.minScore
      }
    });
    const selection = await selectCards({
      client: dependencies.ollama,
      model,
      supportsStructuredOutput: input.supportsStructuredOutput,
      request: text,
      ranked,
      pool: dependencies.config.retrieval.filterPool,
      shown: dependencies.config.retrieval.shown,
      filter: true
    });
    const cards = selection.cards;

    dependencies.logger.debug('Cards selected', {
      conversationId: input.conversationId,
      retrieved: ranked.length,
      pool: selection.pool,
      shown: cards.length,
      fellBack: selection.fellBack
    });

    yield { type: TurnEventName.Cards, cards };

    stage = TurnStage.Answer;
    let answer = '';
    const answerGenerator = answerDeltas(
      dependencies,
      model,
      text,
      language,
      cards
    );
    for await (const delta of answerGenerator) {
      answer += delta;
      yield { type: TurnEventName.AnswerDelta, text: delta };
    }

    if (answer.trim().length === 0) {
      throw new Error(
        'The model answered with nothing, so there is nothing to store'
      );
    }

    yield { type: TurnEventName.AnswerEnd };

    const message = await dependencies.store.messages.append({
      conversationId: input.conversationId,
      role: MessageRole.Assistant,
      content: answer,
      filters: search.filters,
      cardIds: cards.map(card => card.id)
    });

    dependencies.logger.info('Turn answered', {
      conversationId: input.conversationId,
      cards: cards.length,
      answerLength: answer.length,
      messageId: message.id
    });

    yield { type: TurnEventName.TurnEnd, messageId: message.id };
  } catch (error) {
    logFailure(dependencies, input, stage, error);
    yield {
      type: TurnEventName.Error,
      stage,
      message: failureMessage(error)
    };
  }
}

/**
 * Keeps the free text the turn's search actually ran on. The parse is the only
 * stage that rewrites the request, so a parse that produced nothing usable, and
 * every path that skipped the parse, leave the message with the player's own
 * words and nothing else. A store that will not take it is worth a warning
 * rather than a failed turn: the search has already run, and the rewrite is only
 * how the player gets to see what it ran on.
 */
async function storeQuery(
  dependencies: ServerDependencies,
  input: TurnInput,
  search: TurnSearch
): Promise<void> {
  if (
    search.outcome !== ParseOutcome.Parsed ||
    search.text === undefined ||
    search.text === input.text
  ) {
    return;
  }

  try {
    await dependencies.store.messages.setQuery(
      input.userMessageId,
      search.text
    );
  } catch (error) {
    dependencies.logger.warn('The rewritten query could not be stored', {
      conversationId: input.conversationId,
      message: describeError(error)
    });
  }
}

/**
 * What the player is told went wrong. A failure the domain understands explains
 * itself the way the API's error boundary lets it, because those messages are
 * written for whoever has to fix the thing. Anything else is a bug, and a bug's
 * message is not something to put in a stream.
 */
function failureMessage(error: unknown): string {
  return error instanceof DomainError ? error.message : TURN_FAILED_MESSAGE;
}

/**
 * Records a turn that gave way, with the stage it died at: a failure the domain
 * understands is a warning, and anything else is an error whose detail stays in
 * the log rather than reaching the player.
 */
function logFailure(
  dependencies: ServerDependencies,
  input: TurnInput,
  stage: TurnStage,
  error: unknown
): void {
  const context = {
    conversationId: input.conversationId,
    stage,
    message: describeError(error)
  };

  if (error instanceof DomainError) {
    dependencies.logger.warn('Turn failed', context);
    return;
  }

  dependencies.logger.error('Turn failed unexpectedly', context);
}

function describeError(error: unknown): string {
  return hasErrorMessage(error) ? error.message : String(error);
}
