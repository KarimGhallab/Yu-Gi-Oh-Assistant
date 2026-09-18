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
| 42  | [A turn that finds nothing answers in the conversation's language](./42-a-turn-that-finds-nothing-answers-in-the-conversations-language.md) | Resolved (2026-09-17) | -          | [09](../specs/09-transparent-controls.md)                                             |
| 43  | [A card that is not in the conversation's language says so](./43-a-card-that-is-not-in-the-conversations-language-says-so.md)               | Resolved (2026-09-17) | 41         | [09](../specs/09-transparent-controls.md)                                             |
| 44  | [The player picks the model](./44-the-player-picks-the-model.md)                                                                            | Resolved (2026-09-17) | 37, 41     | [09](../specs/09-transparent-controls.md)                                             |
| 45  | [The fake Ollama server is importable](./45-the-fake-ollama-server-is-importable.md)                                                        | Resolved (2026-09-18) | -          | [11](../specs/11-end-to-end-tests.md)                                                 |
| 46  | [The stack runs under the suite's control](./46-the-stack-runs-under-the-suites-control.md)                                                 | Resolved (2026-09-18) | 45         | [11](../specs/11-end-to-end-tests.md)                                                 |
| 47  | [A request answers end to end](./47-a-request-answers-end-to-end.md)                                                                        | Resolved (2026-09-18) | 46         | [11](../specs/11-end-to-end-tests.md)                                                 |
| 48  | [The readout shows the parse and re-runs on a correction](./48-the-readout-shows-the-parse-and-re-runs-on-a-correction.md)                  | Resolved (2026-09-18) | 47         | [11](../specs/11-end-to-end-tests.md)                                                 |
| 49  | [The language and the model persist, and the conversation reopens](./49-the-language-and-the-model-persist-and-the-conversation-reopens.md) | Resolved (2026-09-18) | 47         | [11](../specs/11-end-to-end-tests.md)                                                 |
| 50  | [A broken turn and a missing index say so](./50-a-broken-turn-and-a-missing-index-say-so.md)                                                | Resolved (2026-09-18) | 46, 47     | [11](../specs/11-end-to-end-tests.md)                                                 |
| 51  | [CI runs the suite as reusable workflows behind one gate](./51-ci-runs-the-suite-as-reusable-workflows-behind-one-gate.md)                  | Resolved (2026-09-18) | 48, 49, 50 | [11](../specs/11-end-to-end-tests.md)                                                 |
| 52  | [The runbook gets a stranger running](./52-the-runbook-gets-a-stranger-running.md)                                                          | Resolved (2026-09-18) | -          | [10](../specs/10-local-run-ci-and-docs.md)                                            |
| 53  | [The client and the server run in containers](./53-the-client-and-the-server-run-in-containers.md)                                          | Resolved (2026-09-18) | -          | [10](../specs/10-local-run-ci-and-docs.md)                                            |
| 54  | [The architecture and the product doc are written down](./54-the-architecture-and-the-product-doc-are-written-down.md)                      | Resolved (2026-09-18) | -          | [10](../specs/10-local-run-ci-and-docs.md)                                            |
| 55  | [The platform decisions are recorded](./55-the-platform-decisions-are-recorded.md)                                                          | Resolved (2026-09-18) | -          | [10](../specs/10-local-run-ci-and-docs.md)                                            |
| 56  | [The pipeline decisions are recorded](./56-the-pipeline-decisions-are-recorded.md)                                                          | Resolved (2026-09-18) | -          | [10](../specs/10-local-run-ci-and-docs.md)                                            |
| 57  | [The conversation and testing decisions are recorded](./57-the-conversation-and-testing-decisions-are-recorded.md)                          | Resolved (2026-09-18) | -          | [10](../specs/10-local-run-ci-and-docs.md)                                            |
| 58  | [The catalog is read behind a port](./58-the-catalog-is-read-behind-a-port.md)                                                              | Resolved (2026-09-18) | None       | [12](../specs/12-card-catalog-port.md)                                                |
| 59  | [The callers and the suites move onto the port](./59-the-callers-and-the-suites-move-onto-the-port.md)                                      | Resolved (2026-09-18) | 58         | [12](../specs/12-card-catalog-port.md)                                                |
| 60  | [The db entry narrows and the architecture doc follows](./60-the-db-entry-narrows-and-the-architecture-doc-follows.md)                      | Resolved (2026-09-18) | 59         | [12](../specs/12-card-catalog-port.md)                                                |
| 61  | [The pipeline module owns the sequence](./61-the-pipeline-module-owns-the-sequence.md)                                                      | Resolved (2026-09-18) | None       | [13](../specs/13-turn-pipeline.md)                                                    |
| 62  | [The command runs the pipeline directly](./62-the-command-runs-the-pipeline-directly.md)                                                    | Resolved (2026-09-18) | 61         | [13](../specs/13-turn-pipeline.md)                                                    |
| 63  | [The suites rebalance and the docs follow](./63-the-suites-rebalance-and-the-docs-follow.md)                                                | Resolved (2026-09-18) | 61, 62     | [13](../specs/13-turn-pipeline.md)                                                    |
| 64  | [The predicate renders from the schema's field kinds](./64-the-predicate-renders-from-the-schema-kinds.md)                                  | Resolved (2026-09-18) | None       | [14](../specs/14-filter-predicate.md)                                                 |
| 65  | [The shipped predicate is pinned to the tested one](./65-the-shipped-predicate-is-pinned-to-the-tested-one.md)                              | Resolved (2026-09-18) | 64         | [14](../specs/14-filter-predicate.md)                                                 |
| 66  | [The reply carries one search record](./66-the-reply-carries-one-search-record.md)                                                          | Resolved (2026-09-18) | None       | [15](../specs/15-search-interpretation.md)                                            |
| 67  | [The readout and history read the stored record](./67-the-readout-and-history-read-the-stored-record.md)                                    | Resolved (2026-09-18) | 66         | [15](../specs/15-search-interpretation.md)                                            |
| 68  | [The listing names the model a conversation starts on](./68-the-listing-names-the-model-a-conversation-starts-on.md)                        | Resolved (2026-09-18) | None       | [16](../specs/16-model-listing-and-policy.md)                                         |
| 69  | [One owner for the model policy](./69-one-owner-for-the-model-policy.md)                                                                    | Resolved (2026-09-18) | 68         | [16](../specs/16-model-listing-and-policy.md)                                         |
| 70  | [One reader for a stored value, and the store reads through it](./70-one-reader-for-a-stored-value.md)                                      | Resolved (2026-09-18) | None       | [17](../specs/17-stored-value-reader.md)                                              |
| 71  | [The catalog reads its rows through the same reader](./71-the-catalog-reads-through-the-same-reader.md)                                     | Resolved (2026-09-18) | 70         | [17](../specs/17-stored-value-reader.md)                                              |
| 72  | [A stored JSON column reads through one validated read](./72-a-stored-json-column-reads-through-one-validated-read.md)                      | Resolved (2026-09-18) | 70         | [17](../specs/17-stored-value-reader.md)                                              |
| 73  | [The API refuses requests from another origin](./73-the-api-refuses-another-origin.md)                                                      | Resolved (2026-09-18) | None       | [18](../specs/18-security-hardening.md)                                               |
| 74  | [Card text is data, not instructions, in the model prompts](./74-card-text-is-data-in-the-prompts.md)                                       | Resolved (2026-09-18) | None       | [18](../specs/18-security-hardening.md)                                               |
| 75  | [The catalog is built from a verified dump, and its URLs are safe to render](./75-the-catalog-is-built-from-a-verified-dump.md)             | Resolved (2026-09-18) | None       | [18](../specs/18-security-hardening.md)                                               |

## Frontier

Specs 04 (Retrieval engine), 05 (Conversation store and CRUD), 06
(Prompt-to-filter parsing), 07 (Grounded answer and streamed turn) and 08 (Chat
client) are fully landed: 17 through 35 are resolved. The chat can be driven from
a keyboard end to end, and what an audit found was fixed rather than recorded.

Spec 09 (Transparent controls) is ticketed as 36 through 44, and every one of
them is resolved: the vocabularies the controls speak, the model listing a picker
reads, the chips that show, correct, and extend a parse, the language a
conversation is in, the reply an empty search gives, the marker on a card that is
not in that language, and the model chooser. No ticket of it is left.

Spec 10 (Local run, CI, and documentation) is fully landed: 52 through 57 are
resolved, the runbook and environment template, the containers for the client
and the server, the architecture and product docs, and the three groups of ADRs
(the platform, the pipeline, and the conversation and testing decisions). The CI
shape the spec called for already landed under specs 01 and 11. Spec 11
(End-to-end tests) is fully landed: 45 through 51 are
resolved, from the fake Ollama's public surface and the harness that stands the
stack up to the suite in CI behind the pipeline gate. Ticket 11 supersedes the
single-origin setup in ticket 06 and spec 01.

Spec 12 (Card catalog port) is fully landed: 58 through 60 are resolved, the
port and its in-memory substitute, the callers and the suites moved onto it, and
the db entry narrowed with the architecture doc updated. The port is the
architecture review's first candidate, recorded in ADR 0011. Spec 13 (Turn
pipeline) is fully landed: 61 through 63 are resolved, the pipeline module owns
the sequence behind its neutral events, the RAG command calls it directly, and
the suites and docs follow. Spec 14 (Filter predicate) is fully landed: 64 and 65
are resolved, the schema's field kinds are the one source the shipped SQL renders
from, and the adapter contract test pins the shipped predicate to the tested one.
The first architecture review's three candidates are done (specs 12 to 14). A
second review surfaced six more, and its first is fully landed as spec 15 (Search
interpretation): 66 and 67 are resolved, the reply carries one search record of
the filters, the free text, and the status, the client reads it live and stored,
and the old message fields are gone. Spec 16 (Model listing and policy) is fully
landed: 68 and 69 are resolved, the listing carries the server's default, and
the client reads one policy for how a model is offered. Spec 17 (One reader for a
stored value) is the current review's first candidate, ticketed as 70 through
72: 70 lands the reader and moves the store onto it, 71 moves the catalog onto
it, and 72 moves the store's JSON reads onto it. 70 through 72 are all resolved.
The review's second candidate, narrowing the `utils` leaf and deleting its
broken error predicate, was pruned directly. Its pipeline-dependencies candidate
is not yet ticketed.

A security track runs beside the architecture work. A whole-codebase security
review on 2026-09-18 ranked twelve threats, and the three the maintainer picked
are ticketed as 73 through 75 under spec 18 (Security hardening of the untrusted
boundaries): 73 puts a host and origin checkpoint in front of the API, 74 carries
card text as delimited data in the prompts, and 75 verifies the dump and
constrains its URLs. 73 through 75 are all resolved.
