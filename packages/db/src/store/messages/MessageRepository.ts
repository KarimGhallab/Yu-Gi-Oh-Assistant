import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import { z } from 'zod';

import { cardFiltersSchema } from '@ygo-assistant/cards';
import { NotFoundError } from '@ygo-assistant/utils';

import {
  readJson,
  toMessageRole,
  toOptionalString,
  toString,
  writeJson
} from '../storedValues.js';
import type {
  AppendMessageInput,
  IMessageRepository,
  Message,
  StoredSearch
} from '../types.js';
import { MessageRole } from '../types.js';

const COLUMNS =
  'id, conversation_id, role, content, search_json, card_ids_json, created_at';

const cardIdsSchema = z.array(z.number().int().positive());

const storedSearchSchema = z.object({
  filters: cardFiltersSchema,
  query: z.string().min(1).optional(),
  status: z.string().optional()
});

/**
 * SQLite-backed messages, appended in one transaction each. Appending a user
 * message to a conversation that has no explicit title names it after that
 * message, which is the only write this repository makes outside its own table.
 *
 * A conversation reads back in the order its messages were written. An id is a
 * UUID and says nothing about that order, so it is the rowid, which SQLite gives
 * out in the order rows are inserted, that orders them.
 */
export class MessageRepository implements IMessageRepository {
  constructor(private readonly _database: DatabaseSync) {}

  async append(input: AppendMessageInput): Promise<Message> {
    const timestamp = new Date().toISOString();

    this._database.exec('BEGIN');
    try {
      const title = readTitle(this._database, input.conversationId);
      const message = insert(this._database, input, timestamp);

      if (input.role === MessageRole.User && title === null) {
        nameConversation(
          this._database,
          input.conversationId,
          input.content,
          timestamp
        );
      }

      this._database.exec('COMMIT');
      return message;
    } catch (error) {
      this._database.exec('ROLLBACK');
      throw error;
    }
  }

  async list(conversationId: string): Promise<Message[]> {
    const rows = this._database
      .prepare(
        `SELECT ${COLUMNS} FROM messages WHERE conversation_id = ? ORDER BY rowid ASC`
      )
      .all(conversationId);

    return rows.map(row => toMessage(row));
  }
}

/**
 * Reads the title of the conversation a message is about to join, which decides
 * whether the message names it. A conversation that does not exist cannot be
 * appended to, so this is also where that is refused.
 */
function readTitle(
  database: DatabaseSync,
  conversationId: string
): string | null {
  const row = database
    .prepare('SELECT title FROM conversations WHERE id = ?')
    .get(conversationId);

  if (row === undefined) {
    throw new NotFoundError(`No conversation has id ${conversationId}`);
  }

  return toOptionalString(row.title, 'title') ?? null;
}

function insert(
  database: DatabaseSync,
  input: AppendMessageInput,
  timestamp: string
): Message {
  const id = randomUUID();
  database
    .prepare(
      `INSERT INTO messages (id, conversation_id, role, content, search_json, card_ids_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.conversationId,
      input.role,
      input.content,
      writeJson(input.search),
      writeJson(input.cardIds),
      timestamp
    );

  return {
    id,
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    search: input.search,
    cardIds: input.cardIds,
    createdAt: timestamp
  };
}

/**
 * Names a conversation after its first user message. Touching the conversation
 * row is what moves it to the front of a list, which is the same rule the
 * conversation update follows.
 */
function nameConversation(
  database: DatabaseSync,
  conversationId: string,
  title: string,
  timestamp: string
): void {
  database
    .prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?')
    .run(title, timestamp, conversationId);
}

function toMessage(row: Record<string, unknown>): Message {
  return {
    id: toString(row.id, 'id'),
    conversationId: toString(row.conversation_id, 'conversation_id'),
    role: toMessageRole(row.role),
    content: toString(row.content, 'content'),
    search: toSearch(row.search_json),
    cardIds: toCardIds(row.card_ids_json),
    createdAt: toString(row.created_at, 'created_at')
  };
}

/**
 * The search record is validated on the way back out, so a row whose filters no
 * longer satisfy the vocabulary, or whose free text or status is not a string,
 * is raised rather than reaching retrieval. The status is a code the turn
 * vocabulary owns, and the server is where it becomes one.
 */
function toSearch(value: unknown): StoredSearch | undefined {
  return readJson(value, storedSearchSchema, 'search_json');
}

function toCardIds(value: unknown): number[] | undefined {
  return readJson(value, cardIdsSchema, 'card_ids_json');
}
