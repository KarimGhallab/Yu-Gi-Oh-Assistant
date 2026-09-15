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

## Frontier

Spec 02 is complete (tickets 07-10 resolved). Spec 03 (Card catalog ingestion) is
next and is not yet broken into tickets.
