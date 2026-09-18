# Yu-Gi-Oh Assistant

Local-only, single-user web app for suggesting Yu-Gi-Oh cards from a natural
language prompt. A Hono server owns a local LanceDB card index, a SQLite
conversation store, and all access to a configurable Ollama instance; a React
client provides the chat experience.

## Read first

- `docs/DOMAIN.md` - where the product and architecture docs live, and how to
  consume them.
- `docs/PRODUCT.md` - product intent, users, constraints, principles (authored
  during the implementation bootstrap).
- `docs/ARCHITECTURE.md` - component map, data flow, layer boundaries
  (authored during the implementation bootstrap).
- `docs/adr/` - architecture decision records.

## Orientation

- `apps/server` - Hono API, SSE turn stream, SQLite repositories, the
  populate command, and the composition root.
- `apps/web` - React client (Vite).
- `packages/cards` - card domain and filter schemas.
- `packages/db` - LanceDB index, SQLite app state, migrations, ingestion.
- `packages/rag` - retrieval and the two-stage suggestion pipeline.
- `packages/ollama` - Ollama client, embedding adapter, model listing.
- `packages/contracts` - endpoint and SSE event schemas shared by both apps.
- `packages/logger` - pino wrapper.
- `packages/utils` - retained helpers.
- `docs/tracker/` - AI work tracking: issues, specs, tasks.

## Guardrails

- Git is out of bounds. Never run any git command (status, add, commit, push,
  branch, hooks): the maintainer handles all staging and committing. This
  overrides any skill that tells an agent to commit its work.
- ESM everywhere. Node and pnpm versions are pinned with volta; do not drift.
- The card index and the raw card dump are gitignored. Never commit them.
- The server binds to loopback by default. Never expose conversation history
  without an explicit decision.
- Never use em dashes in generated text.
- Don't run prettier manually, the prettify is triggered automatically

## Agent skills

### Issue tracker

Local markdown only. The board and the tracker conventions are
`docs/tracker/issues/ISSUES_TRACKER.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`, with categories `bug` and `enhancement`. See
`docs/TRIAGE_LABEL.md`.

### Domain docs

Single-context: `docs/PRODUCT.md` and `docs/ARCHITECTURE.md`, with ADRs in
`docs/adr/`. See `docs/DOMAIN.md`.
