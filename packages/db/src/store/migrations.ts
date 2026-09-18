import type { DatabaseSync } from 'node:sqlite';

/**
 * A single schema change, applied once and never edited afterwards: a later
 * correction is a new migration with the next id.
 */
interface Migration {
  id: number;
  name: string;
  statements: string[];
}

const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'conversations',
    statements: [
      `CREATE TABLE conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        language TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    ]
  },
  {
    id: 2,
    name: 'messages',
    statements: [
      `CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        filters_json TEXT,
        card_ids_json TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX messages_by_conversation ON messages (conversation_id, id)`
    ]
  },
  {
    id: 3,
    name: 'uuid-identities',
    // An id is a UUID, so it is text and says nothing about how many rows came
    // before it. SQLite cannot change a column's type in place, so both tables
    // are rebuilt. What they held was written under the old ids, which are not
    // the ids of anything any more: the tables come back empty.
    statements: [
      `DROP TABLE messages`,
      `DROP TABLE conversations`,
      `CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        language TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        filters_json TEXT,
        card_ids_json TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX messages_by_conversation ON messages (conversation_id)`
    ]
  },
  {
    id: 4,
    name: 'message-query',
    // The free text a turn's search actually ran on, when the parse rewrote the
    // request. It is written after the user message is appended, because it is
    // not known until the parse has run, so it arrives as a later column.
    statements: [`ALTER TABLE messages ADD COLUMN query TEXT`]
  },
  {
    id: 5,
    name: 'message-search',
    // A turn's search is one record: the filters, the free text, and the status
    // the turn reported. The old per-message columns cannot express that, and
    // SQLite cannot change a table's columns in place, so the table is rebuilt.
    // What it held was written under the old shape, which has no record to read,
    // so the table comes back empty and a fresh data dir is expected.
    statements: [
      `DROP TABLE messages`,
      `CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        search_json TEXT,
        card_ids_json TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX messages_by_conversation ON messages (conversation_id)`
    ]
  }
];

/**
 * Brings the database up to date, applying every migration that has not been
 * applied yet in id order. Each migration runs in its own transaction, so a
 * failure leaves the database at the previous version rather than half
 * migrated.
 */
export function migrate(database: DatabaseSync): void {
  database.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`
  );

  const applied = new Set(
    database
      .prepare('SELECT id FROM schema_migrations')
      .all()
      .map(row => Number(row.id))
  );
  const pending = MIGRATIONS.filter(
    migration => !applied.has(migration.id)
  ).sort((left, right) => left.id - right.id);

  for (const migration of pending) {
    apply(database, migration);
  }
}

function apply(database: DatabaseSync, migration: Migration): void {
  database.exec('BEGIN');
  try {
    for (const statement of migration.statements) {
      database.exec(statement);
    }
    database
      .prepare(
        'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)'
      )
      .run(migration.id, migration.name, new Date().toISOString());
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
