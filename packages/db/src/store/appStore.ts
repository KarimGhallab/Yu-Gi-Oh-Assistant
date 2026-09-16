import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { ConversationRepository } from './conversations.js';
import { MessageRepository } from './messages.js';
import { migrate } from './migrations.js';
import type {
  IAppStore,
  IConversationRepository,
  IMessageRepository
} from './types.js';

class SqliteAppStore implements IAppStore {
  public readonly conversations: IConversationRepository;
  public readonly messages: IMessageRepository;

  constructor(private readonly _database: DatabaseSync) {
    this.conversations = new ConversationRepository(_database);
    this.messages = new MessageRepository(_database);
  }

  async close(): Promise<void> {
    this._database.close();
  }
}

/**
 * Opens the application database at `path`, creating its directory and applying
 * any pending migrations, and returns the store over it. Owning the connection
 * is the caller's responsibility, which is what keeps the store out of a
 * module-level singleton.
 */
export async function openAppStore(path: string): Promise<IAppStore> {
  await mkdir(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);

  try {
    migrate(database);
  } catch (error) {
    database.close();
    throw error;
  }

  return new SqliteAppStore(database);
}
