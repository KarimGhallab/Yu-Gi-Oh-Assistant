import {
  type Conversation,
  type ConversationWithMessages,
  conversationListSchema,
  conversationSchema,
  conversationWithMessagesSchema
} from '@ygo-assistant/contracts';

import { apiRequest, apiSend } from './client.js';

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

/**
 * Names a conversation. Only the title is sent: renaming is not where the
 * language or the model is chosen, and an omitted field is left alone.
 */
export const renameConversation = (
  id: string,
  title: string
): Promise<Conversation> =>
  apiRequest(
    `/api/conversations/${encodeURIComponent(id)}`,
    conversationSchema,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title })
    }
  );

export const deleteConversation = (id: string): Promise<void> =>
  apiSend(`/api/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
