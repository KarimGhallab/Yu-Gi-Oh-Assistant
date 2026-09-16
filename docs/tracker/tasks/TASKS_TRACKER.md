# Tasks

Actionable tickets, one file per ticket, each declaring the tickets that block
it. Produced by `/to-tickets` (local template) and worked front to back. Global
numbering across specs, so blocking edges stay legible across features.

## Index

| #   | Ticket                                                                                                           | Status                | Blocked by | Spec                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------- | ---------- | ------------------------------------------------------------------------------------- |
| 01  | [Rebaseline the workspace and scaffold the packages](./01-rebaseline-workspace.md)                               | Resolved (2026-09-15) | -          | [01](../specs/01-workspace-foundation.md)                                             |
| 02  | [Shared logger and typed errors](./02-shared-logger-and-typed-errors.md)                                         | Resolved (2026-09-15) | 01         | [01](../specs/01-workspace-foundation.md)                                             |
| 03  | [Runtime configuration with fail-fast validation](./03-runtime-configuration.md)                                 | Resolved (2026-09-15) | 01, 02     | [01](../specs/01-workspace-foundation.md)                                             |
| 04  | [Server composition root, health route, and error boundary](./04-server-composition-root.md)                     | Resolved (2026-09-15) | 02, 03     | [01](../specs/01-workspace-foundation.md)                                             |
| 05  | [Reusable test doubles for the composition-root seam](./05-test-doubles-seam.md)                                 | Resolved (2026-09-15) | 04         | [01](../specs/01-workspace-foundation.md)                                             |
| 06  | [Single-origin client scaffold](./06-single-origin-client-scaffold.md)                                           | Resolved (2026-09-15) | 04         | [01](../specs/01-workspace-foundation.md)                                             |
| 07  | [Ollama client: typed boundary and model listing](./07-ollama-client-boundary-and-model-listing.md)              | Resolved (2026-09-15) | -          | [02](../specs/02-ollama-integration.md)                                               |
| 08  | [Ollama client: batched embeddings](./08-ollama-client-batched-embeddings.md)                                    | Resolved (2026-09-15) | 07         | [02](../specs/02-ollama-integration.md)                                               |
| 09  | [Ollama client: streamed chat completions](./09-ollama-client-streamed-chat.md)                                  | Resolved (2026-09-15) | 07         | [02](../specs/02-ollama-integration.md)                                               |
| 10  | [Compose the real Ollama client into the server](./10-compose-ollama-client.md)                                  | Resolved (2026-09-15) | 08, 09     | [02](../specs/02-ollama-integration.md)                                               |
| 11  | [Decouple the client and the server](./11-decouple-client-and-server.md)                                         | Resolved (2026-09-15) | -          | [01](../specs/01-workspace-foundation.md), [10](../specs/10-local-run-ci-and-docs.md) |
| 12  | [Card domain and YGOPRODeck conversion](./12-card-domain-and-ygoprodeck-conversion.md)                           | Resolved (2026-09-15) | -          | [03](../specs/03-card-catalog-ingestion.md)                                           |
| 13  | [Build and read the local card index](./13-build-and-read-the-card-index.md)                                     | Resolved (2026-09-15) | 12         | [03](../specs/03-card-catalog-ingestion.md)                                           |
| 14  | [Fetch the card dump and wire the populate command](./14-fetch-dump-and-populate-command.md)                     | Resolved (2026-09-15) | 12, 13     | [03](../specs/03-card-catalog-ingestion.md)                                           |
| 15  | [Guard server boot against a stale index](./15-guard-boot-against-stale-index.md)                                | Resolved (2026-09-15) | 13         | [03](../specs/03-card-catalog-ingestion.md)                                           |
| 16  | [Colorized dev logs and rotating production log files](./16-colorized-dev-logs-and-rotating-production-files.md) | Resolved (2026-09-15) | -          | [01](../specs/01-workspace-foundation.md), [10](../specs/10-local-run-ci-and-docs.md) |
| 17  | [Shared card filter vocabulary and schema](./17-card-filter-vocabulary-and-schema.md)                            | Resolved (2026-09-16) | -          | [04](../specs/04-retrieval-engine.md)                                                 |
| 18  | [Ranked semantic retrieval over the card index](./18-ranked-semantic-retrieval.md)                               | Resolved (2026-09-16) | -          | [04](../specs/04-retrieval-engine.md)                                                 |
| 19  | [Structured pre-filters and the combined query](./19-structured-filters-and-combined-query.md)                   | Resolved (2026-09-16) | 17, 18     | [04](../specs/04-retrieval-engine.md)                                                 |
| 20  | [SQLite store and conversation create/list](./20-sqlite-store-and-conversation-create-list.md)                   | Resolved (2026-09-16) | -          | [05](../specs/05-conversation-store-and-crud.md)                                      |
| 21  | [A conversation reopens with its messages](./21-conversation-reopens-with-messages.md)                           | Resolved (2026-09-16) | 20         | [05](../specs/05-conversation-store-and-crud.md)                                      |
| 22  | [Rename, reconfigure, and delete a conversation](./22-rename-reconfigure-and-delete-a-conversation.md)           | Resolved (2026-09-16) | 20, 21     | [05](../specs/05-conversation-store-and-crud.md)                                      |
| 23  | [Parse a prompt into filters with structured output](./23-parse-a-prompt-into-filters-with-structured-output.md) | Resolved (2026-09-16) | -          | [06](../specs/06-prompt-to-filter-parsing.md)                                         |
| 24  | [JSON-mode parsing with a single repair retry](./24-json-mode-parsing-with-a-repair-retry.md)                    | Resolved (2026-09-16) | 23         | [06](../specs/06-prompt-to-filter-parsing.md)                                         |
| 25  | [A turn streams an answer and is saved](./25-a-turn-streams-an-answer-and-is-saved.md)                           | Resolved (2026-09-16) | -          | [07](../specs/07-grounded-answer-streamed-turn.md)                                    |
| 26  | [The turn says so when the search comes up short](./26-the-turn-says-so-when-the-search-comes-up-short.md)       | Resolved (2026-09-16) | 25         | [07](../specs/07-grounded-answer-streamed-turn.md)                                    |
| 27  | [The turn fails cleanly](./27-the-turn-fails-cleanly.md)                                                         | Resolved (2026-09-16) | 25         | [07](../specs/07-grounded-answer-streamed-turn.md)                                    |
| 28  | [A turn honors the player's overrides](./28-a-turn-honors-the-players-overrides.md)                              | `ready-for-agent`     | 25         | [07](../specs/07-grounded-answer-streamed-turn.md)                                    |

## Frontier

Specs 04 (Retrieval engine), 05 (Conversation store and CRUD), and 06
(Prompt-to-filter parsing) are fully landed: 17 through 24 are resolved. Spec 07
(Grounded answer and streamed turn) is ticketed as 25 through 28: 25, 26, and 27
landed, so 28 is the frontier and the last ticket of that spec. Spec 08 (Chat
client) waits on 07, and spec 09 (Transparent controls) waits on 08. Ticket 11
supersedes the single-origin setup in ticket 06 and spec 01.
