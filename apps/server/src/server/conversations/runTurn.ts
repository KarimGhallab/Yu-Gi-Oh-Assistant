import { type Card, type CardFilters, Language } from '@ygo-assistant/cards';
import {
  type TurnEvent,
  TurnEventName,
  TurnStage
} from '@ygo-assistant/contracts';
import { MessageRole } from '@ygo-assistant/db';
import { ParseOutcome } from '@ygo-assistant/rag';
import { DomainError, hasErrorMessage } from '@ygo-assistant/utils';

import {
  PipelineError,
  type PipelineEvent,
  type PipelineInput,
  runPipeline
} from '../../pipeline/runPipeline.js';
import type { ServerDependencies } from '../types.js';

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
 * The sequence itself belongs to the pipeline; this is the adapter that turns
 * its neutral events into the turn's wire frames and stores the reply. The
 * answer is written from the cards retrieval returned and nothing else, so a
 * suggested card cannot be invented, and the turn is stored only once, when the
 * answer is complete: a turn that fails partway leaves the question and no reply
 * (ticket 27).
 */
export async function* runTurn(
  dependencies: ServerDependencies,
  input: TurnInput
): AsyncGenerator<TurnEvent> {
  yield { type: TurnEventName.TurnStart, userMessageId: input.userMessageId };

  let search: Extract<PipelineEvent, { type: 'search' }> | undefined;
  let ranked = 0;
  let cards: Card[] = [];
  let answer = '';

  try {
    const events = runPipeline(
      dependencies,
      pipelineInput(dependencies, input)
    );
    for await (const event of events) {
      switch (event.type) {
        case 'search':
          search = event;
          await storeQuery(dependencies, input, event);

          if (event.status !== undefined) {
            yield { type: TurnEventName.Status, status: event.status };
          }

          // The event reports the search that is actually about to run, so a
          // client rendering the chips shows what retrieval was asked for, even
          // when the parse kept no free text of its own and the request was
          // searched instead.
          yield {
            type: TurnEventName.Filters,
            filters: event.filters,
            query: event.query
          };
          break;
        case 'ranked':
          ranked = event.ranked.length;
          break;
        case 'selected':
          cards = event.cards;
          dependencies.logger.debug('Cards selected', {
            conversationId: input.conversationId,
            retrieved: ranked,
            pool: event.pool,
            shown: cards.length,
            fellBack: event.fellBack
          });
          yield { type: TurnEventName.Cards, cards };
          break;
        case 'answer':
          answer += event.text;
          yield { type: TurnEventName.AnswerDelta, text: event.text };
          break;
      }
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
      filters: search?.filters ?? [],
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
    // The pipeline tags the stage it died at. Anything this adapter throws after
    // the sequence has run, an empty answer or a store that will not take the
    // reply, belongs to the answer stage.
    const stage =
      error instanceof PipelineError ? error.stage : TurnStage.Answer;

    logFailure(dependencies, input, stage, error);
    yield {
      type: TurnEventName.Error,
      stage,
      message: failureMessage(error)
    };
  }
}

/**
 * The pipeline input a turn runs: the player's request and settings, with the
 * toggles a turn always uses and the configured retrieval numbers.
 */
function pipelineInput(
  dependencies: ServerDependencies,
  input: TurnInput
): PipelineInput {
  return {
    request: input.text,
    language: input.language,
    model: input.model,
    supportsStructuredOutput: input.supportsStructuredOutput,
    editedFilters: input.editedFilters,
    parse: true,
    filter: true,
    answer: true,
    ranking: {
      topK: dependencies.config.retrieval.topK,
      minScore: dependencies.config.retrieval.minScore
    },
    pool: dependencies.config.retrieval.filterPool,
    shown: dependencies.config.retrieval.shown,
    conversationId: input.conversationId
  };
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
  search: { outcome?: ParseOutcome; query?: string }
): Promise<void> {
  if (
    search.outcome !== ParseOutcome.Parsed ||
    search.query === undefined ||
    search.query === input.text
  ) {
    return;
  }

  try {
    await dependencies.store.messages.setQuery(
      input.userMessageId,
      search.query
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
  const cause = error instanceof PipelineError ? error.cause : error;
  return cause instanceof DomainError ? cause.message : TURN_FAILED_MESSAGE;
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
  const cause = error instanceof PipelineError ? error.cause : error;
  const context = {
    conversationId: input.conversationId,
    stage,
    message: describeError(cause)
  };

  if (cause instanceof DomainError) {
    dependencies.logger.warn('Turn failed', context);
    return;
  }

  dependencies.logger.error('Turn failed unexpectedly', context);
}

function describeError(error: unknown): string {
  return hasErrorMessage(error) ? error.message : String(error);
}
