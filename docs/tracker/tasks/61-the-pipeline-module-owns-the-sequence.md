# 61 - The pipeline module owns the sequence

**What to build:** One `runPipeline` module in `apps/server/src/pipeline/` that
owns the resolve, retrieve, select, answer sequence and yields one neutral event
stream. `runTurn` stops assembling the sequence and becomes the SSE and storage
adapter that maps the neutral events to `TurnEvent`, while the same behavior a
turn has today still comes out of the wire.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] `runPipeline(dependencies, input)` exists in `apps/server/src/pipeline/`,
      yields `search`, `ranked`, `selected`, and `answer` events, and is the one
      owner of the stage order.
- [x] `PipelineDependencies` is `{ logger, ollama, catalog }` and cannot reach
      the conversation store or the app config.
- [x] `PipelineInput` carries the request, language, model, structured-output
      capability, edited filters, the `parse`/`filter`/`answer` toggles, the
      ranking, the pool, the shown count, and an optional conversation id.
- [x] A failure anywhere in the sequence throws `PipelineError` carrying the
      `TurnStage` it died at and the underlying cause.
- [x] `runTurn` maps `search` to `Status` and `Filters`, `selected` to `Cards`,
      and `answer` to `AnswerDelta`, ignores `ranked`, and keeps `TurnStart`,
      `AnswerEnd`, `TurnEnd`, the message persistence, and the blank-answer
      refusal.
- [x] `runTurn` derives the player-safe message from the cause and its own
      stage from the `PipelineError`, with no stage tracking of its own.
- [x] `NO_CARDS_ANSWERS` has one owner in the pipeline's answer stage.
- [x] The existing turn behavior is unchanged and the repository gates stay
      green.

**Notes:** The stages themselves do not change; this ticket is about who owns
the order and where the module lives. ADR 0012 records the decision. The pipeline
may consume `resolveSearch` and `answerDeltas` in place until ticket 62 moves
them under it.

**Outcome:** `apps/server/src/pipeline/runPipeline.ts` owns the sequence and
yields `search`, `ranked`, `selected`, and `answer`. `runTurn` maps those to
`TurnEvent`, keeps the framing and persistence, and derives its stage and its
player-safe message from `PipelineError` with no bookkeeping of its own.
`NO_CARDS_ANSWERS` lives in the pipeline. All gates green; the turn behavior is
unchanged.
