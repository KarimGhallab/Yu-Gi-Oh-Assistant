# 05 - Conversation store and CRUD

- **Status:** Resolved (2026-09-16)
- **Kind:** spec
- **Blocked by:** 01
- **Source:** architecture grilling, 2026-09-15

## Problem Statement

Conversations must survive restarts and be reopenable. A vector database is the
wrong home for a transactional conversation log, and the product needs a
reliable, queryable record of conversations and their settings, plus the REST
surface to manage them.

## Solution

Server-persisted conversations in SQLite through Node's built-in `node:sqlite`,
behind repository classes and lightweight migrations, exposed over REST CRUD
endpoints. The client holds no authoritative history; the server does.

## User Stories

1. As a player, I want my conversations saved automatically, so that I can close
   the app and come back.
2. As a player, I want a list of past conversations, so that I can reopen one.
3. As a player, I want to rename a conversation, so that I can find it later.
4. As a player, I want to delete a conversation, so that I can clean up.
5. As a player, I want a new conversation to start with a sensible default
   language and model, so that I can ask immediately.
6. As a player, I want the chosen language and model remembered per
   conversation, so that reopening it restores the context.
7. As a returning user, I want a conversation to reload with its messages
   intact, so that I can continue where I left off.
8. As a developer, I want repository classes over SQLite, so that persistence is
   swappable and testable.
9. As a developer, I want migrations that run at startup, so that schema changes
   are safe.

## Implementation Decisions

- SQLite through Node's built-in `node:sqlite`, behind repository classes with a
  small hand-rolled migration runner. No native dependency.
- Tables:
  - `conversations` (`id`, `title`, `language`, `model`, `created_at`,
    `updated_at`).
  - `messages` (`id`, `conversation_id`, `role`, `content`, `filters_json`,
    `card_ids_json`, `created_at`).
  - `meta` (dataset and embedding metadata, owned by feature 03).
- Endpoints: `POST /api/conversations`; `GET /api/conversations`;
  `GET /api/conversations/:id`; `PATCH /api/conversations/:id` (title, language,
  model); `DELETE /api/conversations/:id`.
- New conversations default the language to English and the model to the
  configured chat model.
- Conversation titles default from the first user message when not set
  explicitly.
- Every request and response body is Zod-validated from `packages/contracts`.
- Deleting a conversation deletes its messages in one transaction.
- The store is reached through the composition root (feature 01), never as a
  singleton.

## Testing Decisions

- Good tests assert external behavior: the HTTP response and the rows that
  persist, including read-after-write across requests. They do not assert SQL.
- Integration tests drive the Hono app's `request()` against a temporary SQLite
  file, covering: create with defaults, list, get with messages, patch title and
  settings, and delete cascading to messages.
- Validation is tested by asserting that malformed bodies are rejected with a
  client error.
- Prior art: the temporary-data-directory helper from feature 01.

## Out of Scope

- Writing messages as part of a turn (feature 07). This feature provides the
  repository the turn uses.
- Client rendering and any UI (feature 08).
- Authentication or multi-user isolation; the app is single-user and loopback
  bound.

## Further Notes

- `messages.filters_json` and `messages.card_ids_json` are written by feature 07
  so that reopening a conversation can re-render the parsed filters and the
  suggested cards without recomputation.
