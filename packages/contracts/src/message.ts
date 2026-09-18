import { z } from 'zod';

import { cardFiltersSchema, cardSchema } from '@ygo-assistant/cards';

import { conversationSchema } from './conversation.js';
import { idSchema } from './id.js';

/**
 * Who a message is from. This is the wire vocabulary; the store keeps its own,
 * and the route is where one becomes the other.
 */
export enum MessageRole {
  User = 'user',
  Assistant = 'assistant'
}

/**
 * A message as the API represents it. The filters a reply was searched with and
 * the cards it suggested are absent on a message that carried neither, such as
 * the player's own. The cards are resolved from the ids the turn stored, so a
 * client renders a stored turn without knowing an id was ever involved.
 *
 * A player's message carries the free text its turn searched on, which is the
 * request rewritten into card wording when the parse rewrote it, and absent when
 * the search ran on the player's own words.
 */
export const messageSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  role: z.enum(MessageRole),
  content: z.string().min(1),
  filters: cardFiltersSchema.optional(),
  cards: z.array(cardSchema).optional(),
  query: z.string().min(1).optional(),
  createdAt: z.iso.datetime()
});

/**
 * A conversation with everything that was said in it, in the order it was said.
 */
export const conversationWithMessagesSchema = conversationSchema.extend({
  messages: z.array(messageSchema)
});

export type Message = z.infer<typeof messageSchema>;
export type ConversationWithMessages = z.infer<
  typeof conversationWithMessagesSchema
>;
