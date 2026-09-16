import { z } from 'zod';

import { cardFiltersSchema, cardSchema } from '@ygo-assistant/cards';

/**
 * The names a turn's streamed events go by, on the wire and in the payload. A
 * client reads them to tell one frame from the next without trusting its order.
 */
export enum TurnEventName {
  TurnStart = 'turn.start',
  Filters = 'filters',
  Cards = 'cards',
  AnswerDelta = 'answer.delta',
  AnswerEnd = 'answer.end',
  TurnEnd = 'turn.end'
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
 * The search the turn is about to run: the filters that were understood and the
 * free text that will be ranked. Both parts being empty means the turn searches
 * on nothing but the language partition, which is what a request that named
 * nothing at all leaves behind.
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
  filtersEventSchema,
  cardsEventSchema,
  answerDeltaEventSchema,
  answerEndEventSchema,
  turnEndEventSchema
]);

export type TurnRequest = z.infer<typeof turnRequestSchema>;
export type TurnEvent = z.infer<typeof turnEventSchema>;
