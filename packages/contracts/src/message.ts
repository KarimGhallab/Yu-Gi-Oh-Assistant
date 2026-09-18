import { z } from 'zod';

import { cardFiltersSchema, cardSchema } from '@ygo-assistant/cards';

import { conversationSchema } from './conversation.js';
import { idSchema } from './id.js';
import { TurnStatus } from './turn.js';

/**
 * Who a message is from. This is the wire vocabulary; the store keeps its own,
 * and the route is where one becomes the other.
 */
export enum MessageRole {
  User = 'user',
  Assistant = 'assistant'
}

/**
 * How a turn's search was understood, as one record: the filters that were
 * understood, the free text the search ran on when it kept one, and the status
 * the turn reported about how it got there. The three are absent or present
 * together, which is why they travel as one and not as separate message fields.
 */
export const searchInterpretationSchema = z.object({
  filters: cardFiltersSchema,
  query: z.string().min(1).optional(),
  status: z.enum(TurnStatus).optional()
});

/**
 * A message as the API represents it. The cards a reply suggested are absent on
 * a message that carried none, such as the player's own. The cards are resolved
 * from the ids the turn stored, so a client renders a stored turn without
 * knowing an id was ever involved.
 *
 * A reply carries the turn's search interpretation as one record. The player's
 * message carries neither, because the search belongs to the turn rather than
 * to either utterance.
 */
export const messageSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  role: z.enum(MessageRole),
  content: z.string().min(1),
  search: searchInterpretationSchema.optional(),
  cards: z.array(cardSchema).optional(),
  createdAt: z.iso.datetime()
});

/**
 * A conversation with everything that was said in it, in the order it was said.
 */
export const conversationWithMessagesSchema = conversationSchema.extend({
  messages: z.array(messageSchema)
});

export type Message = z.infer<typeof messageSchema>;
export type SearchInterpretation = z.infer<typeof searchInterpretationSchema>;
export type ConversationWithMessages = z.infer<
  typeof conversationWithMessagesSchema
>;
