import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';

import type {
  Conversation,
  ConversationWithMessages
} from '@ygo-assistant/contracts';

import {
  createConversation,
  getConversation,
  listConversations
} from '../api/conversations.js';

/**
 * The key prefix every conversation query shares, so a write can refresh
 * everything that reads conversations without naming each surface that does.
 */
const CONVERSATIONS_KEY = ['conversations'] as const;

const conversationKey = (id: string): readonly [string, string] => [
  'conversations',
  id
];

export function useConversations(): UseQueryResult<Conversation[], Error> {
  return useQuery({ queryKey: CONVERSATIONS_KEY, queryFn: listConversations });
}

export function useConversation(
  id: string
): UseQueryResult<ConversationWithMessages, Error> {
  return useQuery({
    queryKey: conversationKey(id),
    queryFn: () => getConversation(id),
    enabled: id.length > 0
  });
}

/**
 * Starts a conversation and refreshes the list that shows it. The caller owns
 * where the player ends up, so this only says what was created.
 */
export function useStartConversation(): UseMutationResult<
  Conversation,
  Error,
  void
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      // Refreshing the list is the sidebar's business, and the player is on
      // their way to the conversation already: waiting for the list here would
      // hold the navigation behind a request nobody is looking at.
      void client.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    }
  });
}
