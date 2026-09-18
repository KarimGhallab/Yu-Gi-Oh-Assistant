import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import {
  conversationListSchema,
  conversationSchema,
  conversationWithMessagesSchema,
  createConversationRequestSchema,
  idSchema,
  turnEventSchema,
  turnRequestSchema,
  updateConversationRequestSchema
} from '@ygo-assistant/contracts';
import { NotFoundError } from '@ygo-assistant/utils';

import { parseJsonBody } from '../parseJsonBody.js';
import type { ServerDependencies } from '../types.js';
import {
  createConversation,
  deleteConversation,
  listConversations,
  openConversation,
  startTurn,
  updateConversation
} from './conversationService.js';

/**
 * The conversation surface: starting a conversation, listing the ones that can
 * be reopened, reopening one, renaming or reconfiguring one, deleting one, and
 * running a turn in one.
 *
 * The routes own the wire and nothing else: each validates what arrived, asks
 * the service for what it names, and answers with the contract. A turn is the
 * exception, answering with a stream of events rather than one body, each
 * validated before it is written.
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
    const conversation = await createConversation(dependencies, request);

    return context.json(conversationSchema.parse(conversation), 201);
  });

  routes.get('/', async context => {
    const conversations = await listConversations(dependencies);

    return context.json(conversationListSchema.parse(conversations));
  });

  routes.get('/:id', async context => {
    const id = requireConversationId(context.req.param('id'));
    const { conversation, messages } = await openConversation(dependencies, id);

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
    const conversation = await updateConversation(dependencies, id, request);

    return context.json(conversationSchema.parse(conversation));
  });

  routes.delete('/:id', async context => {
    const id = requireConversationId(context.req.param('id'));

    await deleteConversation(dependencies, id);

    return context.body(null, 204);
  });

  routes.post('/:id/messages', async context => {
    const id = requireConversationId(context.req.param('id'));
    const request = await parseJsonBody(context, turnRequestSchema);
    const turn = await startTurn(dependencies, id, request);

    return streamSSE(context, async stream => {
      for await (const event of turn) {
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
 * A path id names an existing conversation only when it is a UUID written the
 * way the API writes one. Anything else, an integer included, is a spelling of
 * an id that cannot exist.
 */
function requireConversationId(requested: string): string {
  if (!idSchema.safeParse(requested).success) {
    throw new NotFoundError(`No conversation has id "${requested}"`);
  }

  return requested;
}
