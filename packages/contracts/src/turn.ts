import { z } from 'zod';

import { cardFiltersSchema, cardSchema } from '@ygo-assistant/cards';

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
  TurnEnd = 'turn.end'
}

/**
 * What the turn is telling the player about itself. A code rather than a
 * sentence, because what the status line says is the client's copy to write.
 */
export enum TurnStatus {
  FreeTextOnly = 'free-text-only'
}

/**
 * A request to run a turn in a conversation. The text is what the player asked
 * for; everything else the turn needs it reads from the conversation.
 */
export const turnRequestSchema = z.object({
  text: z.string().min(1)
});

/**
 * The turn has started and the player's message is already stored, so a client
 * can reconcile what it rendered optimistically with what the server kept.
 */
const turnStartEventSchema = z.object({
  type: z.literal(TurnEventName.TurnStart),
  userMessageId: z.number().int().positive()
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
 * The answer is complete.
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
  messageId: z.number().int().positive()
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
  turnEndEventSchema
]);

export type TurnRequest = z.infer<typeof turnRequestSchema>;
export type TurnEvent = z.infer<typeof turnEventSchema>;
