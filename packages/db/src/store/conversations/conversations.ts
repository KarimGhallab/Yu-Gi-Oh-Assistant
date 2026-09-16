import type { DatabaseSync } from 'node:sqlite';

import { NotFoundError } from '@ygo-assistant/utils';

import { toLanguage, toNumber, toOptionalString, toString } from '../row.js';
import type {
  Conversation,
  CreateConversationInput,
  IConversationRepository,
  UpdateConversationInput
} from '../types.js';

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

  async find(id: number): Promise<Conversation | undefined> {
    const row = this._database
      .prepare(`SELECT ${COLUMNS} FROM conversations WHERE id = ?`)
      .get(id);

    return row === undefined ? undefined : toConversation(row);
  }

  async list(): Promise<Conversation[]> {
    const rows = this._database
      .prepare(
        `SELECT ${COLUMNS} FROM conversations ORDER BY updated_at DESC, id DESC`
      )
      .all();

    return rows.map(row => toConversation(row));
  }

  /**
   * Moves the fields the update names and leaves the rest, touching the
   * modified time so a renamed conversation becomes the most recent one. The
   * title cannot be cleared back to untitled: a conversation is named, renamed,
   * or left alone.
   */
  async update(
    id: number,
    changes: UpdateConversationInput
  ): Promise<Conversation> {
    const row = this._database
      .prepare(
        `UPDATE conversations
         SET title = COALESCE(?, title),
             language = COALESCE(?, language),
             model = COALESCE(?, model),
             updated_at = ?
         WHERE id = ?
         RETURNING ${COLUMNS}`
      )
      .get(
        changes.title ?? null,
        changes.language ?? null,
        changes.model ?? null,
        new Date().toISOString(),
        id
      );

    if (row === undefined) {
      throw new NotFoundError(`No conversation has id ${id}`);
    }

    return toConversation(row);
  }

  /**
   * Removes the conversation and, through the reference the messages table
   * declares, everything said in it. One statement is one transaction, so no
   * message can be left behind.
   */
  async delete(id: number): Promise<void> {
    const result = this._database
      .prepare('DELETE FROM conversations WHERE id = ?')
      .run(id);

    if (result.changes === 0) {
      throw new NotFoundError(`No conversation has id ${id}`);
    }
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
