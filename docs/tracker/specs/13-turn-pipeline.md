# 13 - Turn pipeline

- **Status:** `ready-for-agent`
- **Kind:** spec
- **Blocked by:** 12
- **Source:** architecture review, 2026-09-18

## Problem Statement

The turn's sequence, resolve, retrieve, select, answer, is assembled twice.
`runTurn` in the server's conversations folder and `runRagQuery` in the server's
rag folder call the same stages in the same order, so the command reaches across
into the HTTP layer for `resolveSearch` and `answerDeltas`, and the first stage
is exercised only through a 986-line HTTP test because it has no interface of
its own. The two callers also express the sequence in two event vocabularies,
`TurnEvent` and `RagQueryEvent`.

## Solution

One `runPipeline` module in `apps/server/src/pipeline` that owns the sequence
and yields one neutral event stream. `runTurn` becomes the storage and SSE
adapter, the RAG command becomes the reporting adapter, `resolveSearch` and
`answerDeltas` become internals, and `runRagQuery` and `RagQueryEvent` are
deleted.

## User Stories

1. As a developer, I want the sequence in one module, so a stage change is one
   edit and one place to test.
2. As a developer, I want the resolve stage testable directly, so its branches do
   not need a whole turn and a server.
3. As a developer, I want the RAG command to stop importing the HTTP layer, so
   the two are siblings.
4. As a developer, I want one event vocabulary for the pipeline, so the callers
   map from it rather than restate it.
5. As a developer, I want a stage-tagged failure, so the turn can say which part
   gave way without tracking the stage itself.
6. As a developer, I want a dependency shape narrower than the server's, so the
   pipeline cannot reach the conversation store or the app config.

## Implementation Decisions

- **The module.** `apps/server/src/pipeline/`, entry `runPipeline.ts`, with
  `resolveSearch.ts` and `answerDeltas.ts` moved under it as internals. The
  external seam is one generator:

  ```ts
  export function runPipeline(
    dependencies: PipelineDependencies,
    input: PipelineInput
  ): AsyncGenerator<PipelineEvent>;
  ```

- **The events.** One neutral stream the callers map from:

  ```ts
  export type PipelineEvent =
    | {
        type: 'search';
        filters: CardFilters;
        query?: string;
        status?: TurnStatus;
        outcome?: ParseOutcome;
      }
    | { type: 'ranked'; ranked: RankedCard[] }
    | { type: 'selected'; pool: number; cards: Card[]; fellBack: boolean }
    | { type: 'answer'; text: string };
  ```

  `runTurn` maps `search` to `Status` and `Filters`, `selected.cards` to
  `Cards`, and `answer` to `AnswerDelta`, and ignores `ranked`. The command's
  reporter consumes all four. `RagQueryEvent` is deleted and `RunRagQuery`
  disappears with it.

- **The input.** `PipelineInput` carries `request`, `language`, `model`,
  `supportsStructuredOutput`, `editedFilters?`, the required toggles `parse`,
  `filter`, and `answer`, `ranking { topK, minScore }`, `pool`, `shown`, and an
  optional `conversationId` for the trace. `editedFilters` overrides `parse`, as
  it does today. `runTurn` passes `filter: true`, `answer: true`, and the
  configured numbers; the command passes its flags and its numbers.
- **The dependencies.** `PipelineDependencies` is `{ logger, ollama, catalog }`,
  narrower than `ServerDependencies`, and the catalog is spec 12's read-only
  `CardCatalog`.
- **The failure.** The pipeline throws `PipelineError`, carrying the `TurnStage`
  it died at and the underlying `cause`. `runTurn` reads the stage for its
  `Error` event and derives the player-safe message from the cause (`DomainError`
  message, else its own `TURN_FAILED_MESSAGE`); the command lets it propagate.
  `runTurn` drops its own stage bookkeeping.
- **The ownership.** `NO_CARDS_ANSWERS` moves into the pipeline's answer stage,
  so both callers share one owner. The "the model answered with nothing" refusal
  stays in `runTurn`, because only storing a reply cares whether it is empty.
  `runTurn` also stores the rewritten query when the `search` event's query
  differs from the request, so the first stage's outcome stops carrying a storage
  rule.
- **The adapters.** `runTurn` keeps the `TurnEvent` framing, the player's
  message persistence, `TurnStart`, `AnswerEnd`, and `TurnEnd`. `ragCommand`
  calls `runPipeline` directly and feeds `RagReporter`.
- **The work.** One spec, three tickets, each green on its own. Ticket 61
  introduces the pipeline and makes `runTurn` an adapter. Ticket 62 moves
  `resolveSearch` and `answerDeltas` under the pipeline, points the command at
  `runPipeline`, and deletes `runRagQuery` and `RagQueryEvent`. Ticket 63
  rebalances the suites and records the decision.
- **The record.** ADR 0012 holds the decision and the layering constraint that
  forces the server home.

## Testing Decisions

- `runPipeline.test.ts`, from `runRagQuery.test.ts`, drives the pipeline through
  the in-memory `CardCatalog` from `@ygo-assistant/db/testing` and the
  `FakeOllamaClient`, and owns the sequence: the parse outcomes and the
  free-text-only status, the `parse`, `filter`, and `answer` toggles, the
  ranking, the selection and its fallback, the no-cards copy, and the
  stage-tagged errors. This is the direct seam `resolveSearch` never had.
- `runTurn.test.ts` slims to what only crosses the server: the event framing and
  order, the message persistence and the stored query, the pre-stream refusals,
  and the failure stages as they reach the wire.
- The pipeline is testable with no index and no HTTP, which is the point of the
  narrower dependency shape.

## Out of Scope

- Moving the pipeline into `packages/rag`, which the layering rules forbid.
- Changing the stages themselves: parsing, retrieval, selection, and the answer
  keep their behavior and their own tests.
- The `TurnEvent` wire shapes, which the client depends on and which do not
  move.
- The catalog port, which spec 12 lands, and the other architecture review
  candidates.

## Further Notes

- This spec can only land once the whole of spec 12 is done, its tickets 58, 59,
  and 60, because the pipeline takes the injected `CardCatalog` from the start
  rather than a `dataDir` on the way.
- ADR 0005's two-stage split stands. This decision is about who owns the
  sequence and where the module lives, not about how many stages a turn has.
- `docs/ARCHITECTURE.md` is corrected so rag owns the stages and the server owns
  the pipeline, and `docs/GLOSSARY.md` gains **Turn pipeline** as the concept the
  module is named after.
