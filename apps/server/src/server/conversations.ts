import { Hono } from 'hono';

import { Language } from '@ygo-assistant/cards';
import {
  conversationListSchema,
  conversationSchema,
  createConversationRequestSchema
} from '@ygo-assistant/contracts';

import { parseJsonBody } from './body.js';
import type { ServerDependencies } from './types.js';

/**
 * The conversation surface: starting a conversation and listing the ones that
 * can be reopened. Opening one, renaming it, and deleting it come with the
 * tickets that follow.
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

  return routes;
}
