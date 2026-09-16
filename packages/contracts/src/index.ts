/**
 * Package entry point: the endpoint and stream contracts shared by the server
 * and the client, so both validate the same shapes.
 */
export { apiErrorSchema } from './apiError.js';
export type { ApiError } from './apiError.js';
export {
  conversationListSchema,
  conversationSchema,
  createConversationRequestSchema,
  updateConversationRequestSchema
} from './conversations.js';
export type {
  Conversation,
  CreateConversationRequest,
  UpdateConversationRequest
} from './conversations.js';
export {
  MessageRole,
  conversationWithMessagesSchema,
  messageSchema
} from './messages.js';
export type { ConversationWithMessages, Message } from './messages.js';
export { TurnEventName, turnEventSchema, turnRequestSchema } from './turn.js';
export type { TurnEvent, TurnRequest } from './turn.js';
