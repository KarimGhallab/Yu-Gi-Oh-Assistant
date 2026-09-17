import type { CardFilters, Language } from '@ygo-assistant/cards';

/**
 * Who a stored message is from. Only a user message can name an untitled
 * conversation, so the turn's reply never does.
 */
export enum MessageRole {
  User = 'user',
  Assistant = 'assistant'
}

/**
 * A conversation as it is stored. A conversation that was never named carries a
 * null title until its first user message provides one.
 */
export interface Conversation {
  id: string;
  title: string | null;
  language: Language;
  model: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The fields a new conversation is created from. The language and the model are
 * required because the caller owns the defaults, which depend on configuration
 * the store does not see.
 */
export interface CreateConversationInput {
  title?: string;
  language: Language;
  model: string;
}

/**
 * The fields a conversation update may change. A field that is absent is left
 * alone, so an update only moves what it names.
 */
export interface UpdateConversationInput {
  title?: string;
  language?: Language;
  model?: string;
}

/**
 * A stored message. The parsed filters and the suggested card ids are filled by
 * the turn that produced the reply, so a message that carried neither has
 * neither. A user message carries the free text the turn searched on when the
 * parse rewrote it, which is written once the turn has worked it out.
 */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  filters?: CardFilters;
  cardIds?: number[];
  query?: string;
  createdAt: string;
}

/**
 * The fields a message is appended from.
 */
export interface AppendMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  filters?: CardFilters;
  cardIds?: number[];
}

/**
 * Reads and writes conversations. Persistence is swappable behind this seam, so
 * every method is asynchronous even though the current driver is synchronous.
 * The commands raise when an id names no conversation, the way appending a
 * message does, because none of them can proceed without one.
 */
export interface IConversationRepository {
  create(input: CreateConversationInput): Promise<Conversation>;
  find(id: string): Promise<Conversation | undefined>;
  list(): Promise<Conversation[]>;
  update(id: string, changes: UpdateConversationInput): Promise<Conversation>;
  delete(id: string): Promise<void>;
}

/**
 * Reads and appends the messages of a conversation, in the order they were
 * written. Appending is the seam the turn writes through. The query a turn
 * searched on is set after the message exists, because the parse that produces
 * it runs after the player's message has been appended.
 */
export interface IMessageRepository {
  append(input: AppendMessageInput): Promise<Message>;
  list(conversationId: string): Promise<Message[]>;
  setQuery(messageId: string, query: string): Promise<void>;
}

/**
 * The application's SQLite-backed state. It is opened by the composition root
 * and injected; nothing reaches for it as a singleton.
 */
export interface IAppStore {
  readonly conversations: IConversationRepository;
  readonly messages: IMessageRepository;
  close(): Promise<void>;
}
