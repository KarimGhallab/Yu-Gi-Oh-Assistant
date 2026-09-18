# Specs

Feature specs, one file per feature, produced by `/to-spec`. Each spec states
the problem, the solution, user stories, implementation and testing decisions,
and what is out of scope. Break a spec into tickets with `/to-tickets`, then
land them in [`../tasks/`](../tasks/).

Specs start at `ready-for-agent`; finished specs are marked `Resolved`. Work them
in order; the `Blocked by` column is the dependency edge.

## Index

| #   | Spec                                                                         | Status                | Blocked by |
| --- | ---------------------------------------------------------------------------- | --------------------- | ---------- |
| 01  | [Workspace foundation](./01-workspace-foundation.md)                         | Resolved (2026-09-15) | -          |
| 02  | [Ollama integration](./02-ollama-integration.md)                             | Resolved (2026-09-15) | 01         |
| 03  | [Card catalog ingestion and index](./03-card-catalog-ingestion.md)           | Resolved (2026-09-15) | 01, 02     |
| 04  | [Retrieval engine](./04-retrieval-engine.md)                                 | Resolved (2026-09-16) | 03         |
| 05  | [Conversation store and CRUD](./05-conversation-store-and-crud.md)           | Resolved (2026-09-16) | 01         |
| 06  | [Prompt-to-filter parsing](./06-prompt-to-filter-parsing.md)                 | Resolved (2026-09-16) | 01, 02     |
| 07  | [Grounded answer and streamed turn](./07-grounded-answer-streamed-turn.md)   | Resolved (2026-09-16) | 04, 05, 06 |
| 08  | [Chat client](./08-chat-client.md)                                           | Resolved (2026-09-16) | 07         |
| 09  | [Transparent controls](./09-transparent-controls.md)                         | Resolved (2026-09-18) | 08         |
| 10  | [Local run, CI, and documentation](./10-local-run-ci-and-docs.md)            | Resolved (2026-09-18) | 01, 07     |
| 11  | [End-to-end tests](./11-end-to-end-tests.md)                                 | Resolved (2026-09-18) | 09         |
| 12  | [Card catalog port](./12-card-catalog-port.md)                               | Resolved (2026-09-18) | 03, 04     |
| 13  | [Turn pipeline](./13-turn-pipeline.md)                                       | Resolved (2026-09-18) | 12         |
| 14  | [Filter predicate](./14-filter-predicate.md)                                 | Resolved (2026-09-18) | 12         |
| 15  | [Search interpretation](./15-search-interpretation.md)                       | Resolved (2026-09-18) | 05, 07, 13 |
| 16  | [Model listing and policy](./16-model-listing-and-policy.md)                 | Resolved (2026-09-18) | 02, 09     |
| 17  | [One reader for a stored value](./17-stored-value-reader.md)                 | Resolved (2026-09-18) | 05, 12     |
| 18  | [Security hardening of the untrusted boundaries](./18-security-hardening.md) | Resolved (2026-09-18) | -          |

## Critical path

01 to 02 to 03 to 04 to 07 to 08 to 09 then 11. Features 05 and 06 run in parallel
after 01/02 and join at 07. Feature 10 spans from 01 (CI) to 07 (runbook) and no
longer owns the end-to-end suite; feature 11 builds it and turns the CI into
reusable workflows with one gate job. Feature 12 depends on 03 and 04 and
refactors the catalog read behind a port; it is not on the critical path. It is
resolved. Feature 13 depends on 12 and extracts the turn pipeline into one module behind
two adapters; it is not on the critical path either. It is resolved. Feature 14
depends on 12 and makes the schema's field kinds the one source both filter
predicates render from; it is not on the critical path. It is resolved.
Feature 15 depends on 05, 07, and 13 and makes the turn's search
interpretation one record owned by the reply; it is not on the critical path. It
is resolved. Feature 16 depends on 02 and 09 and gives the model listing one wire
shape and the client one policy for its choices, notes, and warnings; it is not
on the critical path. It is resolved. Feature 17 depends on 05 and 12 and gives
the loose read of a stored value one module behind the store and the catalog
adapters; it is not on the critical path. It is resolved. Feature 18 has no spec
dependency and hardens the three untrusted boundaries the 2026-09-18 security
review ranked first; it is not on the critical path. It is resolved.
