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
export {
  TurnEventName,
  TurnStage,
  TurnStatus,
  turnEventSchema,
  turnRequestSchema
} from './turn.js';
export type { TurnEvent, TurnRequest } from './turn.js';

/**
 * The vocabulary the client's controls speak, carried through this package so
 * the chat view can name a language, a filter field, an operator, and the values
 * a field accepts without depending on the card package itself. Everything here
 * is re-exported from the card domain rather than restated, so a filter the
 * controls can build is one the server's own schema accepts.
 */
export {
  CardAttribute,
  CardFilterField,
  CardType,
  FilterOperator,
  FrameType,
  Language,
  LinkMarker,
  cardFilterSchema,
  cardFiltersSchema,
  describeFilterFields
} from '@ygo-assistant/cards';
export type {
  CardFilter,
  CardFilters,
  FilterFieldVocabulary
} from '@ygo-assistant/cards';
