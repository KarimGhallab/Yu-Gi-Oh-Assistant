# Tasks

Actionable tickets, one file per ticket, each declaring the tickets that block
it. Produced by `/to-tickets` (local template) and worked front to back. Global
numbering across specs, so blocking edges stay legible across features.

## Index

| #   | Ticket                                                                                                                                      | Status                | Blocked by | Spec                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------- | ------------------------------------------------------------------------------------- |
| 01  | [Rebaseline the workspace and scaffold the packages](./01-rebaseline-workspace.md)                                                          | Resolved (2026-09-15) | -          | [01](../specs/01-workspace-foundation.md)                                             |
| 02  | [Shared logger and typed errors](./02-shared-logger-and-typed-errors.md)                                                                    | Resolved (2026-09-15) | 01         | [01](../specs/01-workspace-foundation.md)                                             |
| 03  | [Runtime configuration with fail-fast validation](./03-runtime-configuration.md)                                                            | Resolved (2026-09-15) | 01, 02     | [01](../specs/01-workspace-foundation.md)                                             |
| 04  | [Server composition root, health route, and error boundary](./04-server-composition-root.md)                                                | Resolved (2026-09-15) | 02, 03     | [01](../specs/01-workspace-foundation.md)                                             |
| 05  | [Reusable test doubles for the composition-root seam](./05-test-doubles-seam.md)                                                            | Resolved (2026-09-15) | 04         | [01](../specs/01-workspace-foundation.md)                                             |
| 06  | [Single-origin client scaffold](./06-single-origin-client-scaffold.md)                                                                      | Resolved (2026-09-15) | 04         | [01](../specs/01-workspace-foundation.md)                                             |
| 07  | [Ollama client: typed boundary and model listing](./07-ollama-client-boundary-and-model-listing.md)                                         | Resolved (2026-09-15) | -          | [02](../specs/02-ollama-integration.md)                                               |
| 08  | [Ollama client: batched embeddings](./08-ollama-client-batched-embeddings.md)                                                               | Resolved (2026-09-15) | 07         | [02](../specs/02-ollama-integration.md)                                               |
| 09  | [Ollama client: streamed chat completions](./09-ollama-client-streamed-chat.md)                                                             | Resolved (2026-09-15) | 07         | [02](../specs/02-ollama-integration.md)                                               |
| 10  | [Compose the real Ollama client into the server](./10-compose-ollama-client.md)                                                             | Resolved (2026-09-15) | 08, 09     | [02](../specs/02-ollama-integration.md)                                               |
| 11  | [Decouple the client and the server](./11-decouple-client-and-server.md)                                                                    | Resolved (2026-09-15) | -          | [01](../specs/01-workspace-foundation.md), [10](../specs/10-local-run-ci-and-docs.md) |
| 12  | [Card domain and YGOPRODeck conversion](./12-card-domain-and-ygoprodeck-conversion.md)                                                      | Resolved (2026-09-15) | -          | [03](../specs/03-card-catalog-ingestion.md)                                           |
| 13  | [Build and read the local card index](./13-build-and-read-the-card-index.md)                                                                | Resolved (2026-09-15) | 12         | [03](../specs/03-card-catalog-ingestion.md)                                           |
| 14  | [Fetch the card dump and wire the populate command](./14-fetch-dump-and-populate-command.md)                                                | Resolved (2026-09-15) | 12, 13     | [03](../specs/03-card-catalog-ingestion.md)                                           |
| 15  | [Guard server boot against a stale index](./15-guard-boot-against-stale-index.md)                                                           | Resolved (2026-09-15) | 13         | [03](../specs/03-card-catalog-ingestion.md)                                           |
| 16  | [Colorized dev logs and rotating production log files](./16-colorized-dev-logs-and-rotating-production-files.md)                            | Resolved (2026-09-15) | -          | [01](../specs/01-workspace-foundation.md), [10](../specs/10-local-run-ci-and-docs.md) |
| 17  | [Shared card filter vocabulary and schema](./17-card-filter-vocabulary-and-schema.md)                                                       | Resolved (2026-09-16) | -          | [04](../specs/04-retrieval-engine.md)                                                 |
| 18  | [Ranked semantic retrieval over the card index](./18-ranked-semantic-retrieval.md)                                                          | Resolved (2026-09-16) | -          | [04](../specs/04-retrieval-engine.md)                                                 |
| 19  | [Structured pre-filters and the combined query](./19-structured-filters-and-combined-query.md)                                              | Resolved (2026-09-16) | 17, 18     | [04](../specs/04-retrieval-engine.md)                                                 |
| 20  | [SQLite store and conversation create/list](./20-sqlite-store-and-conversation-create-list.md)                                              | Resolved (2026-09-16) | -          | [05](../specs/05-conversation-store-and-crud.md)                                      |
| 21  | [A conversation reopens with its messages](./21-conversation-reopens-with-messages.md)                                                      | Resolved (2026-09-16) | 20         | [05](../specs/05-conversation-store-and-crud.md)                                      |
| 22  | [Rename, reconfigure, and delete a conversation](./22-rename-reconfigure-and-delete-a-conversation.md)                                      | Resolved (2026-09-16) | 20, 21     | [05](../specs/05-conversation-store-and-crud.md)                                      |
| 23  | [Parse a prompt into filters with structured output](./23-parse-a-prompt-into-filters-with-structured-output.md)                            | Resolved (2026-09-16) | -          | [06](../specs/06-prompt-to-filter-parsing.md)                                         |
| 24  | [JSON-mode parsing with a single repair retry](./24-json-mode-parsing-with-a-repair-retry.md)                                               | Resolved (2026-09-16) | 23         | [06](../specs/06-prompt-to-filter-parsing.md)                                         |
| 25  | [A turn streams an answer and is saved](./25-a-turn-streams-an-answer-and-is-saved.md)                                                      | Resolved (2026-09-16) | -          | [07](../specs/07-grounded-answer-streamed-turn.md)                                    |
| 26  | [The turn says so when the search comes up short](./26-the-turn-says-so-when-the-search-comes-up-short.md)                                  | Resolved (2026-09-16) | 25         | [07](../specs/07-grounded-answer-streamed-turn.md)                                    |
| 27  | [The turn fails cleanly](./27-the-turn-fails-cleanly.md)                                                                                    | Resolved (2026-09-16) | 25         | [07](../specs/07-grounded-answer-streamed-turn.md)                                    |
| 28  | [A turn honors the player's overrides](./28-a-turn-honors-the-players-overrides.md)                                                         | Resolved (2026-09-16) | 25         | [07](../specs/07-grounded-answer-streamed-turn.md)                                    |
| 29  | [The client's toolchain is ready](./29-the-clients-toolchain-is-ready.md)                                                                   | Resolved (2026-09-16) | -          | [08](../specs/08-chat-client.md)                                                      |
| 30  | [A reopened conversation returns its turns' cards](./30-a-reopened-conversation-returns-its-cards.md)                                       | Resolved (2026-09-16) | -          | [08](../specs/08-chat-client.md)                                                      |
| 31  | [The chat frame, the sidebar, and the conversation route](./31-the-chat-frame-the-sidebar-and-the-route.md)                                 | Resolved (2026-09-16) | 29         | [08](../specs/08-chat-client.md)                                                      |
| 32  | [A conversation reopens with its history](./32-a-conversation-reopens-with-its-history.md)                                                  | Resolved (2026-09-16) | 30, 31     | [08](../specs/08-chat-client.md)                                                      |
| 33  | [The client streams a turn](./33-the-client-streams-a-turn.md)                                                                              | Resolved (2026-09-16) | 32         | [08](../specs/08-chat-client.md)                                                      |
| 34  | [Rename and delete a conversation from the sidebar](./34-rename-and-delete-a-conversation-from-the-sidebar.md)                              | Resolved (2026-09-16) | 31         | [08](../specs/08-chat-client.md)                                                      |
| 35  | [The chat works without a mouse](./35-the-chat-works-without-a-mouse.md)                                                                    | Resolved (2026-09-16) | 33, 34     | [08](../specs/08-chat-client.md)                                                      |
| 36  | [The controls can name what they must send](./36-the-controls-can-name-what-they-must-send.md)                                              | Resolved (2026-09-17) | -          | [09](../specs/09-transparent-controls.md)                                             |
| 37  | [The installed models can be listed](./37-the-installed-models-can-be-listed.md)                                                            | Resolved (2026-09-17) | -          | [09](../specs/09-transparent-controls.md)                                             |
| 38  | [The chat shows what the request was understood as](./38-the-chat-shows-what-the-request-was-understood-as.md)                              | Resolved (2026-09-17) | 36         | [09](../specs/09-transparent-controls.md)                                             |
| 39  | [A chip can be corrected and the turn re-run on it](./39-a-chip-can-be-corrected-and-the-turn-re-run-on-it.md)                              | Resolved (2026-09-17) | 38         | [09](../specs/09-transparent-controls.md)                                             |
| 40  | [A filter can be added](./40-a-filter-can-be-added.md)                                                                                      | Resolved (2026-09-17) | 39         | [09](../specs/09-transparent-controls.md)                                             |
| 41  | [The conversation's language is the player's to choose](./41-the-conversations-language-is-the-players-to-choose.md)                        | Resolved (2026-09-17) | 36         | [09](../specs/09-transparent-controls.md)                                             |
| 42  | [A turn that finds nothing answers in the conversation's language](./42-a-turn-that-finds-nothing-answers-in-the-conversations-language.md) | ready-for-agent       | -          | [09](../specs/09-transparent-controls.md)                                             |
| 43  | [A card that is not in the conversation's language says so](./43-a-card-that-is-not-in-the-conversations-language-says-so.md)               | ready-for-agent       | 41         | [09](../specs/09-transparent-controls.md)                                             |
| 44  | [The player picks the model](./44-the-player-picks-the-model.md)                                                                            | ready-for-agent       | 37, 41     | [09](../specs/09-transparent-controls.md)                                             |

## Frontier

Specs 04 (Retrieval engine), 05 (Conversation store and CRUD), 06
(Prompt-to-filter parsing), 07 (Grounded answer and streamed turn) and 08 (Chat
client) are fully landed: 17 through 35 are resolved. The chat can be driven from
a keyboard end to end, and what an audit found was fixed rather than recorded.

Spec 09 (Transparent controls) is ticketed as 36 through 44: the vocabularies the
controls speak, the model listing a picker reads, the chips that show and correct
a parse, the language a conversation is in, the reply an empty search gives, the
marker on a card that is not in that language, and the model chooser. Tickets 36
through 41 are resolved, so nothing is held by them: the frontier is 42, 43 and 44.

Spec 10 (Local run, CI, and documentation) is free to be ticketed, and owns the
local-only end-to-end suite, including the Playwright flow and the fake Ollama
server that the specs' testing decisions mention but do not build here. Ticket 11
supersedes the single-origin setup in ticket 06 and spec 01.
