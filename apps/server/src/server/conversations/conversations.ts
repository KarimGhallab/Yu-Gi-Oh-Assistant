import { Hono } from 'hono';

import { Language } from '@ygo-assistant/cards';
import {
  conversationListSchema,
  conversationSchema,
  conversationWithMessagesSchema,
  createConversationRequestSchema,
  updateConversationRequestSchema
} from '@ygo-assistant/contracts';
import { NotFoundError } from '@ygo-assistant/utils';

import { parseJsonBody } from '../body.js';
import type { ServerDependencies } from '../types.js';

/**
 * The conversation surface: starting a conversation, listing the ones that can
 * be reopened, reopening one, renaming or reconfiguring one, and deleting one.
 *
 * The store speaks the persistence types of the db package and the routes speak
 * the contracts package, so this is where a stored conversation becomes an API
 * response: both sides are validated, and the contract is what the client sees.
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
      conversationWithMessagesSchema.parse({ ...conversation, messages })
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

  return routes;
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
