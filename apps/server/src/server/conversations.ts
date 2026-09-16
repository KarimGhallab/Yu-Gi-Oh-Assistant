import { Hono } from 'hono';

import { Language } from '@ygo-assistant/cards';
import {
  conversationListSchema,
  conversationSchema,
  conversationWithMessagesSchema,
  createConversationRequestSchema
} from '@ygo-assistant/contracts';
import { NotFoundError } from '@ygo-assistant/utils';

import { parseJsonBody } from './body.js';
import type { ServerDependencies } from './types.js';

/**
 * The conversation surface: starting a conversation, listing the ones that can
 * be reopened, and reopening one.
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
    const requested = context.req.param('id');
    const id = toConversationId(requested);
    const conversation =
      id === undefined
        ? undefined
        : await dependencies.store.conversations.find(id);

    if (conversation === undefined) {
      throw new NotFoundError(`No conversation has id "${requested}"`);
    }

    const messages = await dependencies.store.messages.list(conversation.id);

    return context.json(
      conversationWithMessagesSchema.parse({ ...conversation, messages })
    );
  });

  return routes;
}

/**
 * A path id is only a conversation id when it is digits and nothing else: a
 * padded, signed, exponent, or hexadecimal spelling names a conversation that
 * cannot exist rather than one that does.
 */
function toConversationId(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}
