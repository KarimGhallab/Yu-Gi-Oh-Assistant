import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import { type Card, Language } from '@ygo-assistant/cards';
import {
  conversationListSchema,
  conversationSchema,
  conversationWithMessagesSchema,
  createConversationRequestSchema,
  turnEventSchema,
  turnRequestSchema,
  updateConversationRequestSchema
} from '@ygo-assistant/contracts';
import {
  MessageRole,
  type Message as StoredMessage,
  readCardsByIds
} from '@ygo-assistant/db';
import { NotFoundError } from '@ygo-assistant/utils';

import { parseJsonBody } from '../body.js';
import type { ServerDependencies } from '../types.js';
import { requireInstalledModel, runTurn } from './turn.js';

/**
 * The conversation surface: starting a conversation, listing the ones that can
 * be reopened, reopening one, renaming or reconfiguring one, deleting one, and
 * running a turn in one.
 *
 * The store speaks the persistence types of the db package and the routes speak
 * the contracts package, so this is where a stored conversation becomes an API
 * response: both sides are validated, and the contract is what the client sees.
 * A turn is the exception: it answers with a stream of events rather than one
 * body, each validated before it is written, and the overrides a request carries
 * are resolved here against the conversation before the turn reads them.
 */
export function createConversationRoutes(
  dependencies: ServerDependencies
): Hono {
  const routes = new Hono();

  routes.post('/', async context => {
    const request = await parseJsonBody(
      context,
      createConversationRequestSchema
    );
    const conversation = await dependencies.store.conversations.create({
      title: request.title,
      language: request.language ?? Language.English,
      model: request.model ?? dependencies.config.ollama.chatModel
    });

    return context.json(conversationSchema.parse(conversation), 201);
  });

  routes.get('/', async context => {
    const conversations = await dependencies.store.conversations.list();

    return context.json(conversationListSchema.parse(conversations));
  });

  routes.get('/:id', async context => {
    const id = requireConversationId(context.req.param('id'));
    const conversation = await dependencies.store.conversations.find(id);

    if (conversation === undefined) {
      throw new NotFoundError(`No conversation has id ${id}`);
    }

    const messages = await dependencies.store.messages.list(conversation.id);

    return context.json(
      conversationWithMessagesSchema.parse({
        ...conversation,
        messages: await projectMessages(
          dependencies,
          conversation.language,
          messages
        )
      })
    );
  });

  routes.patch('/:id', async context => {
    const id = requireConversationId(context.req.param('id'));
    const request = await parseJsonBody(
      context,
      updateConversationRequestSchema
    );
    const conversation = await dependencies.store.conversations.update(id, {
      title: request.title,
      language: request.language,
      model: request.model
    });

    return context.json(conversationSchema.parse(conversation));
  });

  routes.delete('/:id', async context => {
    const id = requireConversationId(context.req.param('id'));

    await dependencies.store.conversations.delete(id);

    return context.body(null, 204);
  });

  routes.post('/:id/messages', async context => {
    const id = requireConversationId(context.req.param('id'));
    const request = await parseJsonBody(context, turnRequestSchema);
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

    return streamSSE(context, async stream => {
      const turnGenerator = runTurn(dependencies, {
        conversationId: conversation.id,
        text: request.text,
        userMessageId: userMessage.id,
        language,
        model,
        supportsStructuredOutput: selected.supportsStructuredOutput,
        editedFilters: request.filters
      });
      for await (const event of turnGenerator) {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(turnEventSchema.parse(event))
        });
      }
    });
  });

  return routes;
}

/**
 * A message as the API represents it: what was said, and what the turn behind it
 * was searched with and suggested. A stored turn keeps the ids of the cards it
 * showed rather than the cards themselves, so the two are not the same shape.
 */
interface ProjectedMessage extends Omit<StoredMessage, 'cardIds'> {
  cards?: Card[];
}

/**
 * Turns the stored messages of a conversation into the ones the API answers
 * with, resolving the ids of every suggested card in one read of the index. The
 * cards come back in the language the conversation is in, in the order the turn
 * ranked them, and a card the index no longer holds is left out rather than
 * failing the whole conversation.
 */
async function projectMessages(
  dependencies: ServerDependencies,
  language: Language,
  messages: StoredMessage[]
): Promise<ProjectedMessage[]> {
  const cards = await readCardsByIds(dependencies.config.dataDir, {
    ids: messages.flatMap(message => message.cardIds ?? []),
    language
  });
  const cardsById = new Map<number, Card>(cards.map(card => [card.id, card]));

  return messages.map(message => {
    const { cardIds, ...stored } = message;

    if (cardIds === undefined) {
      return stored;
    }

    return {
      ...stored,
      cards: cardIds.flatMap(id => cardsById.get(id) ?? [])
    };
  });
}

/**
 * A path id names an existing conversation only when it is a positive integer
 * written canonically: digits and nothing else, with no leading zero. A padded,
 * signed, exponent, or hexadecimal spelling names one that cannot exist.
 */
function requireConversationId(requested: string): number {
  const id = /^[1-9]\d*$/.test(requested) ? Number(requested) : undefined;

  if (id === undefined || !Number.isSafeInteger(id)) {
    throw new NotFoundError(`No conversation has id "${requested}"`);
  }

  return id;
}
