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

## Frontier

All spec 01 tickets are resolved. Spec 02 (Ollama integration) is not yet broken
into tickets; run `/to-tickets` against
[`../specs/02-ollama-integration.md`](../specs/02-ollama-integration.md) to
extend the frontier.
