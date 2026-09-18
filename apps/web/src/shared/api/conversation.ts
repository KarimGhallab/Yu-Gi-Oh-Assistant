import {
  type Conversation,
  type ConversationWithMessages,
  type CreateConversationRequest,
  type UpdateConversationRequest,
  conversationListSchema,
  conversationSchema,
  conversationWithMessagesSchema
} from '@ygo-assistant/contracts';

import { apiRequest, apiSend } from './apiClient.js';

/**
 * The conversation endpoints the chat reads and writes.
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

/**
 * Starts a conversation. What is not asked for here is the server's own default,
 * so a caller that knows what the player chose, such as the prompt on the home
 * surface, brings it and one that does not leaves it out.
 */
export const createConversation = (
  request: CreateConversationRequest = {}
): Promise<Conversation> =>
  apiRequest('/api/conversations', conversationSchema, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request)
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
