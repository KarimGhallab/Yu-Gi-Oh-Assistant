import type { Card, CardFilters, Language } from '@ygo-assistant/cards';
import {
  type TurnEvent,
  TurnEventName,
  TurnStage,
  TurnStatus
} from '@ygo-assistant/contracts';
import { type Conversation, MessageRole } from '@ygo-assistant/db';
import {
  ParseOutcome,
  type ParseResult,
  type RetrievalQuery,
  parseCardRequest,
  retrieveCards,
  streamGroundedAnswer
} from '@ygo-assistant/rag';
import { DomainError, hasErrorMessage } from '@ygo-assistant/utils';

import type { ServerDependencies } from '../types.js';

/**
 * What the turn runs on: the conversation it happens in, what the player asked
 * for, and the message that was already stored for them. The stored id is what
 * lets the client reconcile the message it rendered optimistically.
 */
export interface TurnInput {
  conversation: Conversation;
  text: string;
  userMessageId: number;
}

/**
 * What the turn says when the search found nothing. It is English whatever the
 * conversation's language, because the copy is a product decision rather than
 * something the model should be left to improvise.
 */
const NO_CARDS_ANSWER =
  'I could not find a card that matches that request. Try broadening it.';

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
  const { conversation, text } = input;
  const model = conversation.model;

  yield { type: TurnEventName.TurnStart, userMessageId: input.userMessageId };

  let stage = TurnStage.Parse;
  try {
    const parse = await parseCardRequest({
      client: dependencies.ollama,
      model,
      // Reading the model's capability belongs to understanding the request, so
      // it fails and is reported as part of the parse stage rather than a stage
      // of its own.
      supportsStructuredOutput: await supportsStructuredOutput(
        dependencies,
        model
      ),
      request: text
    });
    const filters = parse.outcome === ParseOutcome.Parsed ? parse.filters : [];
    const query: RetrievalQuery = {
      text: searchText(parse, filters, text),
      filters,
      language: conversation.language
    };

    if (leftNothingToSearch(parse)) {
      yield { type: TurnEventName.Status, status: TurnStatus.FreeTextOnly };
    }

    // The event reports the search that is actually about to run, so a client
    // rendering the chips shows what retrieval was asked for, even when the
    // parse kept no free text of its own and the request was searched instead.
    yield { type: TurnEventName.Filters, filters, query: query.text };

    stage = TurnStage.Search;
    const ranked = await retrieveCards({
      dataDir: dependencies.config.dataDir,
      embedder: dependencies.ollama,
      query,
      ranking: {
        topK: dependencies.config.retrieval.topK,
        minScore: dependencies.config.retrieval.minScore
      }
    });
    const cards = ranked
      .slice(0, dependencies.config.retrieval.shown)
      .map(rankedCard => rankedCard.card);

    yield { type: TurnEventName.Cards, cards };

    stage = TurnStage.Answer;
    let answer = '';
    for await (const delta of answerDeltas(
      dependencies,
      model,
      text,
      conversation.language,
      cards
    )) {
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
      conversationId: conversation.id,
      role: MessageRole.Assistant,
      content: answer,
      filters,
      cardIds: cards.map(card => card.id)
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
    conversationId: input.conversation.id,
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

/**
 * Whether the selected model can be constrained by a schema, read from what the
 * server has installed. A model that is not installed is treated as
 * unconstrained; refusing one outright belongs to the overrides a request may
 * carry (ticket 28).
 */
async function supportsStructuredOutput(
  dependencies: ServerDependencies,
  model: string
): Promise<boolean> {
  const models = await dependencies.ollama.listModels();
  const selected = models.find(candidate => candidate.name === model);

  return selected?.supportsStructuredOutput ?? false;
}

/**
 * The prose a turn streams. A search that found nothing is answered without the
 * model: the reply is known before the answer stage would run, and a model
 * asked to say it found nothing can say something else instead.
 */
function answerDeltas(
  dependencies: ServerDependencies,
  model: string,
  request: string,
  language: Language,
  cards: Card[]
): AsyncIterable<string> {
  if (cards.length === 0) {
    return once(NO_CARDS_ANSWER);
  }

  return streamGroundedAnswer({
    client: dependencies.ollama,
    model,
    request,
    language,
    cards
  });
}

async function* once(text: string): AsyncGenerator<string> {
  yield text;
}
