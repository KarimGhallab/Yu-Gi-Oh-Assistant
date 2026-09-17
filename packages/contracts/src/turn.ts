import { z } from 'zod';

import { Language, cardFiltersSchema, cardSchema } from '@ygo-assistant/cards';

import { idSchema } from './id.js';

/**
 * The names a turn's streamed events go by, on the wire and in the payload. A
 * client reads them to tell one frame from the next without trusting its order.
 */
export enum TurnEventName {
  TurnStart = 'turn.start',
  Status = 'status',
  Filters = 'filters',
  Cards = 'cards',
  AnswerDelta = 'answer.delta',
  AnswerEnd = 'answer.end',
  TurnEnd = 'turn.end',
  Error = 'error'
}

/**
 * What the turn is telling the player about itself. A code rather than a
 * sentence, because what the status line says is the client's copy to write.
 */
export enum TurnStatus {
  FreeTextOnly = 'free-text-only'
}

/**
 * Which part of the turn gave way, so a client can say what failed without
 * reading a message meant for the player.
 */
export enum TurnStage {
  Parse = 'parse',
  Search = 'search',
  Answer = 'answer'
}

/**
 * A request to run a turn in a conversation. The text is what the player asked
 * for. A language or a model overrides the conversation's own, and either one
 * left out leaves the conversation in charge. The filters are the set the player
 * edited, which is used as it stands instead of being parsed out of the text
 * again, so leaving them out is what asks for the request to be parsed as usual.
 */
export const turnRequestSchema = z.object({
  text: z.string().trim().min(1),
  language: z.enum(Language).optional(),
  model: z.string().min(1).optional(),
  filters: cardFiltersSchema.optional()
});

/**
 * The turn has started and the player's message is already stored, so a client
 * can reconcile what it rendered optimistically with what the server kept.
 */
const turnStartEventSchema = z.object({
  type: z.literal(TurnEventName.TurnStart),
  userMessageId: idSchema
});

/**
 * Something the turn wants the player to know before it goes on: that the search
 * is running on the player's own words with no structured constraints. That
 * happens when the parse gave up on the request and when it came back with
 * nothing usable, and either way the empty filters that follow say nothing about
 * why, so the status is what tells the player the request was not understood.
 */
const statusEventSchema = z.object({
  type: z.literal(TurnEventName.Status),
  status: z.enum(TurnStatus)
});

/**
 * The search the turn is about to run: the filters that were understood and the
 * free text that will be ranked. A request the parse could not turn into either
 * is searched as its own words, which is what the status event announces, so the
 * free text is only ever absent when the request named constraints and no
 * intent.
 */
const filtersEventSchema = z.object({
  type: z.literal(TurnEventName.Filters),
  filters: cardFiltersSchema,
  query: z.string().optional()
});

/**
 * The suggested cards, in the order they were ranked, emitted before the answer
 * so the cards can be shown while the prose is still arriving.
 */
const cardsEventSchema = z.object({
  type: z.literal(TurnEventName.Cards),
  cards: z.array(cardSchema)
});

/**
 * A piece of the answer as it is written.
 */
const answerDeltaEventSchema = z.object({
  type: z.literal(TurnEventName.AnswerDelta),
  text: z.string()
});

/**
 * The answer is complete. It says the prose ended, not that the turn survived:
 * the turn is stored only once `turn.end` carries its id, so a client finishes
 * the answer here and finishes the turn at `turn.end`.
 */
const answerEndEventSchema = z.object({
  type: z.literal(TurnEventName.AnswerEnd)
});

/**
 * The turn is over and the answer is stored, so a client can finish the turn
 * with the id the conversation will show it under.
 */
const turnEndEventSchema = z.object({
  type: z.literal(TurnEventName.TurnEnd),
  messageId: idSchema
});

/**
 * The turn gave way, and this is the last thing it has to say. Whatever prose
 * arrived before it is not an answer: the turn is terminal, and the conversation
 * keeps the question with no reply rather than a half-finished one.
 */
const errorEventSchema = z.object({
  type: z.literal(TurnEventName.Error),
  stage: z.enum(TurnStage),
  message: z.string().min(1)
});

/**
 * Everything a turn streams, in the order it arrives, so a client can validate
 * each frame and act on it without a second source of truth.
 */
export const turnEventSchema = z.discriminatedUnion('type', [
  turnStartEventSchema,
  statusEventSchema,
  filtersEventSchema,
  cardsEventSchema,
  answerDeltaEventSchema,
  answerEndEventSchema,
  turnEndEventSchema,
  errorEventSchema
]);

export type TurnRequest = z.infer<typeof turnRequestSchema>;
export type TurnEvent = z.infer<typeof turnEventSchema>;
