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
  ConversationWithMessages,
  Model,
  UpdateConversationRequest
} from '@ygo-assistant/contracts';

import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  updateConversation
} from './api/conversations.js';
import { listModels } from './api/models.js';

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

/**
 * The key the model listing is read under. Nothing writes to it: what is
 * installed belongs to the machine Ollama runs on rather than to this app, so
 * the listing is read and never patched.
 */
const MODELS_KEY = ['models'] as const;

export function useModels(): UseQueryResult<Model[], Error> {
  return useQuery({ queryKey: MODELS_KEY, queryFn: listModels });
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

export interface UpdateConversationVariables {
  id: string;
  patch: UpdateConversationRequest;
}

/**
 * Changes part of a conversation and refreshes what reads conversations, which
 * is the list it is named in and the page it is open on. A conversation's cards
 * are read back in the language it is in, so moving that language comes back as
 * the same turn in the other language rather than as another turn.
 */
export function useUpdateConversation(): UseMutationResult<
  Conversation,
  Error,
  UpdateConversationVariables
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: UpdateConversationVariables) =>
      updateConversation(id, patch),
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
