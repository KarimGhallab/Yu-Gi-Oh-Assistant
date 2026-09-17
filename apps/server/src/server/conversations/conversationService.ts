import { Language } from '@ygo-assistant/cards';
import type {
  CreateConversationRequest,
  TurnEvent,
  TurnRequest,
  UpdateConversationRequest
} from '@ygo-assistant/contracts';
import {
  type Conversation,
  MessageRole,
  type Message as StoredMessage
} from '@ygo-assistant/db';
import { NotFoundError } from '@ygo-assistant/utils';

import {
  defaultModel,
  installedModels,
  requireInstalledModel
} from '../models/modelService.js';
import type { ServerDependencies } from '../types.js';
import { type ProjectedMessage, projectMessages } from './projectMessages.js';
import { runTurn } from './runTurn.js';

/**
 * What a conversation and what was said in it look like to the surface that
 * answers with them: the stored conversation, and its messages with the cards
 * they suggested resolved.
 */
export interface OpenConversation {
  conversation: Conversation;
  messages: ProjectedMessage[];
}

/**
 * Starts a conversation. What it is answered by is the player's choice when they
 * made one, and otherwise the first model the machine can answer with: either
 * way the name is one the machine has, so a conversation never starts on a model
 * that is not there.
 */
export async function createConversation(
  dependencies: ServerDependencies,
  request: CreateConversationRequest
): Promise<Conversation> {
  const model =
    request.model ?? defaultModel(await installedModels(dependencies));

  return dependencies.store.conversations.create({
    title: request.title,
    language: request.language ?? Language.English,
    model
  });
}

/** The conversations that can be reopened, newest first. */
export async function listConversations(
  dependencies: ServerDependencies
): Promise<Conversation[]> {
  return dependencies.store.conversations.list();
}

/**
 * One conversation with everything said in it. A conversation that does not
 * exist cannot be opened, so this is where that is refused.
 */
export async function openConversation(
  dependencies: ServerDependencies,
  id: string
): Promise<OpenConversation> {
  const conversation = await dependencies.store.conversations.find(id);

  if (conversation === undefined) {
    throw new NotFoundError(`No conversation has id ${id}`);
  }

  const messages: StoredMessage[] = await dependencies.store.messages.list(
    conversation.id
  );

  return {
    conversation,
    messages: await projectMessages(
      dependencies,
      conversation.language,
      messages
    )
  };
}

/**
 * Changes part of a conversation. A field the request does not name is left
 * alone, and a conversation that does not exist cannot be changed.
 */
export async function updateConversation(
  dependencies: ServerDependencies,
  id: string,
  request: UpdateConversationRequest
): Promise<Conversation> {
  return dependencies.store.conversations.update(id, {
    title: request.title,
    language: request.language,
    model: request.model
  });
}

/** Removes a conversation and everything said in it. */
export async function deleteConversation(
  dependencies: ServerDependencies,
  id: string
): Promise<void> {
  await dependencies.store.conversations.delete(id);
}

/**
 * Starts a turn in a conversation: resolves the settings it runs on against the
 * conversation's own, refuses a model that is not installed before anything is
 * streamed, keeps the settings the turn settled on, stores the player's message,
 * and hands back the turn to stream.
 *
 * The player's message is stored before the turn runs so a client can reconcile
 * the message it rendered as they sent it, and the reply is stored by the turn
 * itself once it is complete.
 */
export async function startTurn(
  dependencies: ServerDependencies,
  id: string,
  request: TurnRequest
): Promise<AsyncGenerator<TurnEvent>> {
  const conversation = await dependencies.store.conversations.find(id);

  if (conversation === undefined) {
    throw new NotFoundError(`No conversation has id ${id}`);
  }

  const model = request.model ?? conversation.model;
  const language = request.language ?? conversation.language;
  const selected = await requireInstalledModel(dependencies, model);

  if (model !== conversation.model || language !== conversation.language) {
    await dependencies.store.conversations.update(id, { model, language });
  }

  const userMessage = await dependencies.store.messages.append({
    conversationId: conversation.id,
    role: MessageRole.User,
    content: request.text
  });

  return runTurn(dependencies, {
    conversationId: conversation.id,
    text: request.text,
    userMessageId: userMessage.id,
    language,
    model,
    supportsStructuredOutput: selected.supportsStructuredOutput,
    editedFilters: request.filters
  });
}
