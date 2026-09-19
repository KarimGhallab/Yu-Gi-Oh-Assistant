/**
 * Package entry point: the endpoint and stream contracts shared by the server
 * and the client, so both validate the same shapes.
 */
export { apiErrorSchema } from './apiError.js';
export type { ApiError } from './apiError.js';
export { archetypeListSchema } from './archetype.js';
export {
  conversationListSchema,
  conversationSchema,
  createConversationRequestSchema,
  updateConversationRequestSchema
} from './conversation.js';
export type {
  Conversation,
  CreateConversationRequest,
  UpdateConversationRequest
} from './conversation.js';
export { idSchema } from './id.js';
export {
  conversationWithMessagesSchema,
  MessageRole,
  messageSchema,
  searchInterpretationSchema
} from './message.js';
export type {
  ConversationWithMessages,
  Message,
  SearchInterpretation
} from './message.js';
export { modelListingSchema, modelSchema } from './model.js';
export type { Model, ModelListing } from './model.js';
export {
  TurnEventName,
  turnEventSchema,
  turnRequestSchema,
  TurnStage,
  TurnStatus
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
  cardFilterFieldName,
  cardFilterOperatorName,
  cardFilterSchema,
  cardFiltersSchema,
  CardRace,
  CardType,
  describeFilterFields,
  FilterOperator,
  FrameType,
  Language,
  LinkMarker
} from '@ygo-assistant/cards';
export type {
  CardFilter,
  CardFilters,
  FilterFieldVocabulary
} from '@ygo-assistant/cards';
