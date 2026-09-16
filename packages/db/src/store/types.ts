import type { Language } from '@ygo-assistant/cards';

/**
 * A conversation as it is stored. A conversation that was never named carries a
 * null title until its first user message provides one.
 */
export interface Conversation {
  id: number;
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
 * Reads and writes conversations. Persistence is swappable behind this seam, so
 * every method is asynchronous even though the current driver is synchronous.
 */
export interface IConversationRepository {
  create(input: CreateConversationInput): Promise<Conversation>;
  list(): Promise<Conversation[]>;
}

/**
 * The application's SQLite-backed state. It is opened by the composition root
 * and injected; nothing reaches for it as a singleton.
 */
export interface IAppStore {
  readonly conversations: IConversationRepository;
  close(): Promise<void>;
}
