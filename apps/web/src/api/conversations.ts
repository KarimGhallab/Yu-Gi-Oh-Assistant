import {
  type Conversation,
  type ConversationWithMessages,
  conversationListSchema,
  conversationSchema,
  conversationWithMessagesSchema
} from '@ygo-assistant/contracts';

import { apiRequest } from './client.js';

/**
 * The conversation endpoints the chat reads and writes. A conversation is
 * created with the server's own defaults, because choosing a language or a
 * model is a control the player is given later rather than a decision this call
 * makes for them.
 */
export const listConversations = (): Promise<Conversation[]> =>
  apiRequest('/api/conversations', conversationListSchema);

export const getConversation = (
  id: string
): Promise<ConversationWithMessages> =>
  apiRequest(
    `/api/conversations/${encodeURIComponent(id)}`,
    conversationWithMessagesSchema
  );

export const createConversation = (): Promise<Conversation> =>
  apiRequest('/api/conversations', conversationSchema, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });
