# Tasks

Actionable tickets, one file per ticket, each declaring the tickets that block
it. Produced by `/to-tickets` (local template) and worked front to back. Global
numbering across specs, so blocking edges stay legible across features.

## Index

| #  | Ticket | Status | Blocked by | Spec |
| -- | ------ | ------ | ---------- | ---- |
| 01 | [Rebaseline the workspace and scaffold the packages](./01-rebaseline-workspace.md) | Resolved (2026-09-15) | - | [01](../specs/01-workspace-foundation.md) |
| 02 | [Shared logger and typed errors](./02-shared-logger-and-typed-errors.md) | Resolved (2026-09-15) | 01 | [01](../specs/01-workspace-foundation.md) |
| 03 | [Runtime configuration with fail-fast validation](./03-runtime-configuration.md) | Resolved (2026-09-15) | 01, 02 | [01](../specs/01-workspace-foundation.md) |
| 04 | [Server composition root, health route, and error boundary](./04-server-composition-root.md) | Resolved (2026-09-15) | 02, 03 | [01](../specs/01-workspace-foundation.md) |
| 05 | [Reusable test doubles for the composition-root seam](./05-test-doubles-seam.md) | Resolved (2026-09-15) | 04 | [01](../specs/01-workspace-foundation.md) |
| 06 | [Single-origin client scaffold](./06-single-origin-client-scaffold.md) | Resolved (2026-09-15) | 04 | [01](../specs/01-workspace-foundation.md) |
| 07 | [Ollama client: typed boundary and model listing](./07-ollama-client-boundary-and-model-listing.md) | Resolved (2026-09-15) | - | [02](../specs/02-ollama-integration.md) |
| 08 | [Ollama client: batched embeddings](./08-ollama-client-batched-embeddings.md) | Resolved (2026-09-15) | 07 | [02](../specs/02-ollama-integration.md) |
| 09 | [Ollama client: streamed chat completions](./09-ollama-client-streamed-chat.md) | Resolved (2026-09-15) | 07 | [02](../specs/02-ollama-integration.md) |
| 10 | [Compose the real Ollama client into the server](./10-compose-ollama-client.md) | Resolved (2026-09-15) | 08, 09 | [02](../specs/02-ollama-integration.md) |
| 11 | [Decouple the client and the server](./11-decouple-client-and-server.md) | Resolved (2026-09-15) | - | [01](../specs/01-workspace-foundation.md), [10](../specs/10-local-run-ci-and-docs.md) |
| 12 | [Card domain and YGOPRODeck conversion](./12-card-domain-and-ygoprodeck-conversion.md) | Resolved (2026-09-15) | - | [03](../specs/03-card-catalog-ingestion.md) |
| 13 | [Build and read the local card index](./13-build-and-read-the-card-index.md) | Resolved (2026-09-15) | 12 | [03](../specs/03-card-catalog-ingestion.md) |
| 14 | [Fetch the card dump and wire the populate command](./14-fetch-dump-and-populate-command.md) | Resolved (2026-09-15) | 12, 13 | [03](../specs/03-card-catalog-ingestion.md) |
| 15 | [Guard server boot against a stale index](./15-guard-boot-against-stale-index.md) | Resolved (2026-09-15) | 13 | [03](../specs/03-card-catalog-ingestion.md) |
| 16 | [Colorized dev logs and rotating production log files](./16-colorized-dev-logs-and-rotating-production-files.md) | ready-for-agent | - | [01](../specs/01-workspace-foundation.md), [10](../specs/10-local-run-ci-and-docs.md) |

## Frontier

Spec 02 (tickets 07-10) and spec 03 (tickets 12-15) are complete. The only open
ticket is 16, the independent logging change. Ticket 11 supersedes the
single-origin setup in ticket 06 and spec 01.
