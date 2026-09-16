# 20 - SQLite store and conversation create/list

**What to build:** Conversations become real and durable. From a player's
perspective: starting a new conversation gives one ready to use, defaulting to
English and the configured chat model, and a list of past conversations is
available to reopen from. Both survive a restart. This ticket also brings the
store itself into being: a `node:sqlite` connection under the data directory, a
small migration runner that runs at startup, the `conversations` table, the
conversation repository, and the contracts and routes for the two endpoints. The
store is created by the composition root and injected, never reached as a
singleton.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-16)

- [x] `POST /api/conversations` saves a conversation and returns it, defaulting
      the language to English and the model to the configured chat model; an
      explicitly supplied title, language, or model is honored instead.
- [x] `GET /api/conversations` returns the saved conversations, newest first.
- [x] Both endpoints read and write the same SQLite file under the data
      directory, and a conversation created in one request is visible to the
      next.
- [x] Closing and reopening the server leaves the conversations intact.
- [x] A conversation created with no title is distinguishable as untitled, ready
      for the first user message to name it in ticket 21.
- [x] A malformed create body is rejected with a client error rather than
      reaching the store.
- [x] Every request and response body is validated through the contracts
      package.
- [x] Integration tests drive the Hono app's `request()` against a temporary
      SQLite file and assert the HTTP response and the persisted rows, without
      asserting SQL.
- [x] The composition root opens the store and runs migrations at startup; the
      server takes the store as an injected dependency.
- [x] Build and lint pass.

**Notes:** `meta` is deliberately not created: feature 03 records dataset and
embedding metadata in `index/metadata.json`, so nothing in spec 05 needs a SQLite
`meta` table. Persistence types live in `packages/db` and the wire shapes and
their Zod schemas live in `packages/contracts`; dependency-cruiser forbids either
package from importing the other, and the web app may import only contracts, so
the route is the mapping point. Integer autoincrement ids; timestamps as ISO-8601
UTC text. A model name is any non-empty string; do not validate it against the
models Ollama has installed. The temporary-data-directory helper from feature 01
is the prior art for the integration test's data directory, and the index guard
already establishes how a boot-time failure should be reported.

**Outcome:** `packages/db` gained a `store/` area: `openAppStore(path)` opens the
database, applies the pending migrations in id order (each in its own
transaction) and returns the store, and `ConversationRepository` is the first
repository behind it. The database file is `databasePath(dataDir)`, `app.db`
beside `index/`. The composition root reports an unusable store the way the index
guard reports a stale index, and closes the connection if a migration fails
rather than leaking it.

Two decisions this ticket settled that later tickets build on: unknown fields in
a request body are stripped rather than rejected, so the wire contract can grow
without breaking an older client, and the error body is itself a contract
(`apiErrorSchema`), so every response the server writes is validated. A list is
ordered by `updated_at` then `id`, both descending, which means ticket 22's
rename will move a conversation to the top: that is the intended reading of
"newest first".
