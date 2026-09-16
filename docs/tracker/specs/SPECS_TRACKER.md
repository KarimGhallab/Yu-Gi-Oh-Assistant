# Specs

Feature specs, one file per feature, produced by `/to-spec`. Each spec states
the problem, the solution, user stories, implementation and testing decisions,
and what is out of scope. Break a spec into tickets with `/to-tickets`, then
land them in [`../tasks/`](../tasks/).

Specs start at `ready-for-agent`; finished specs are marked `Resolved`. Work them
in order; the `Blocked by` column is the dependency edge.

## Index

| #   | Spec                                                                       | Status                | Blocked by |
| --- | -------------------------------------------------------------------------- | --------------------- | ---------- |
| 01  | [Workspace foundation](./01-workspace-foundation.md)                       | Resolved (2026-09-15) | -          |
| 02  | [Ollama integration](./02-ollama-integration.md)                           | Resolved (2026-09-15) | 01         |
| 03  | [Card catalog ingestion and index](./03-card-catalog-ingestion.md)         | Resolved (2026-09-15) | 01, 02     |
| 04  | [Retrieval engine](./04-retrieval-engine.md)                               | `ready-for-agent`     | 03         |
| 05  | [Conversation store and CRUD](./05-conversation-store-and-crud.md)         | `ready-for-agent`     | 01         |
| 06  | [Prompt-to-filter parsing](./06-prompt-to-filter-parsing.md)               | `ready-for-agent`     | 01, 02     |
| 07  | [Grounded answer and streamed turn](./07-grounded-answer-streamed-turn.md) | `ready-for-agent`     | 04, 05, 06 |
| 08  | [Chat client](./08-chat-client.md)                                         | `ready-for-agent`     | 07         |
| 09  | [Transparent controls](./09-transparent-controls.md)                       | `ready-for-agent`     | 08         |
| 10  | [Local run, CI, and documentation](./10-local-run-ci-and-docs.md)          | `ready-for-agent`     | 01, 07     |

## Critical path

01 to 02 to 03 to 04 to 07 to 08 to 09. Features 05 and 06 run in parallel after
01/02 and join at 07. Feature 10 spans from 01 (CI) to 07 (runbook).
