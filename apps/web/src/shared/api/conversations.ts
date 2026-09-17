import {
  type Conversation,
  type ConversationWithMessages,
  type UpdateConversationRequest,
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
 * Changes part of a conversation. Only what the patch names is moved, so a
 * control that changes one thing never changes another: the language a
 * conversation searches in is not its name, and its name is not its language.
 */
export const updateConversation = (
  id: string,
  patch: UpdateConversationRequest
): Promise<Conversation> =>
  apiRequest(
    `/api/conversations/${encodeURIComponent(id)}`,
    conversationSchema,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch)
    }
  );

/**
 * Names a conversation, which is a patch that moves the title and nothing else.
 */
export const renameConversation = (
  id: string,
  title: string
): Promise<Conversation> => updateConversation(id, { title });

export const deleteConversation = (id: string): Promise<void> =>
  apiSend(`/api/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
