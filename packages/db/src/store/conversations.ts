import type { DatabaseSync } from 'node:sqlite';

import { toLanguage, toNumber, toOptionalString, toString } from './row.js';
import type {
  Conversation,
  CreateConversationInput,
  IConversationRepository
} from './types.js';

const COLUMNS = 'id, title, language, model, created_at, updated_at';

/**
 * SQLite-backed conversations. Reading is ordered by the last change and then
 * by id, so a list is stable even when two conversations share a timestamp.
 */
export class ConversationRepository implements IConversationRepository {
  constructor(private readonly _database: DatabaseSync) {}

  async create(input: CreateConversationInput): Promise<Conversation> {
    const timestamp = new Date().toISOString();
    const title = input.title ?? null;
    const result = this._database
      .prepare(
        `INSERT INTO conversations (title, language, model, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(title, input.language, input.model, timestamp, timestamp);

    return {
      id: Number(result.lastInsertRowid),
      title,
      language: input.language,
      model: input.model,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  async list(): Promise<Conversation[]> {
    const rows = this._database
      .prepare(
        `SELECT ${COLUMNS} FROM conversations ORDER BY updated_at DESC, id DESC`
      )
      .all();

    return rows.map(row => toConversation(row));
  }
}

/**
 * Turns a stored row into a conversation. The columns are read positionally by
 * name here, so a column that no longer matches the schema is caught instead of
 * leaking into the domain.
 */
function toConversation(row: Record<string, unknown>): Conversation {
  return {
    id: toNumber(row.id, 'id'),
    title: toOptionalString(row.title, 'title'),
    language: toLanguage(row.language),
    model: toString(row.model, 'model'),
    createdAt: toString(row.created_at, 'created_at'),
    updatedAt: toString(row.updated_at, 'updated_at')
  };
}
