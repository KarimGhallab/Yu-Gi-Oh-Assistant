import { z } from 'zod';

import { Language } from '@ygo-assistant/cards';

/**
 * A conversation as the API represents it. A conversation that was never named
 * carries a null title until its first user message provides one.
 */
export const conversationSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).nullable(),
  language: z.enum(Language),
  model: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

/**
 * The conversations a client can reopen, newest first.
 */
export const conversationListSchema = z.array(conversationSchema);

/**
 * A request to start a conversation. Every field is optional: an omitted
 * language or model falls back to the server's conversation defaults, and an
 * omitted title leaves the conversation untitled for its first user message to
 * name.
 */
export const createConversationRequestSchema = z.object({
  title: z.string().min(1).optional(),
  language: z.enum(Language).optional(),
  model: z.string().min(1).optional()
});

/**
 * A request to change part of a conversation. Unlike creation, an omitted field
 * means "leave this one alone", so a patch only ever moves what it names, and
 * anything it does name has to be a value the conversation could have been
 * created with.
 */
export const updateConversationRequestSchema = z.object({
  title: z.string().min(1).optional(),
  language: z.enum(Language).optional(),
  model: z.string().min(1).optional()
});

export type Conversation = z.infer<typeof conversationSchema>;
export type CreateConversationRequest = z.infer<
  typeof createConversationRequestSchema
>;
export type UpdateConversationRequest = z.infer<
  typeof updateConversationRequestSchema
>;
