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
