import {
  type QueryClient,
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
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation
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

/**
 * Makes what the client shows match what the server holds, for everything that
 * reads conversations: a turn that has been stored, a conversation that was
 * named by its first message, or one that is gone.
 *
 * It reports whether it managed to, because a caller that would drop what it is
 * holding has to know: the server's copy is what it would be dropping it in
 * favour of, and a refresh that failed left that copy unread.
 */
export const refreshConversations = async (
  client: QueryClient
): Promise<boolean> => {
  try {
    // A refresh the library swallows looks like a refresh that worked, and the
    // caller would then drop a turn the player is reading for no copy at all.
    await client.refetchQueries(
      { queryKey: CONVERSATIONS_KEY },
      { throwOnError: true }
    );
    return true;
  } catch {
    return false;
  }
};

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
      void refreshConversations(client);
    }
  });
}

export interface RenameConversationRequest {
  id: string;
  title: string;
}

/**
 * Renames a conversation and refreshes what reads conversations, which is both
 * the list it is named in and the page it is open on.
 */
export function useRenameConversation(): UseMutationResult<
  Conversation,
  Error,
  RenameConversationRequest
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (request: RenameConversationRequest) =>
      renameConversation(request.id, request.title),
    onSuccess: () => {
      void refreshConversations(client);
    }
  });
}

/**
 * Deletes a conversation and refreshes the list that showed it. Where the player
 * ends up if it was the open one belongs to the surface that asked.
 */
export function useDeleteConversation(): UseMutationResult<
  void,
  Error,
  string
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: () => {
      void refreshConversations(client);
    }
  });
}
