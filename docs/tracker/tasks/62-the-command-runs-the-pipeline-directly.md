# 62 - The command runs the pipeline directly

**What to build:** The RAG command stops reaching into the HTTP layer. It calls
`runPipeline` directly and feeds the reporter from the neutral events, while
`resolveSearch` and `answerDeltas` move under the pipeline module and
`runRagQuery` disappears.

**Blocked by:** 61.

**Status:** Resolved (2026-09-18)

- [x] `resolveSearch.ts` and `answerDeltas.ts` live under
      `apps/server/src/pipeline/` as internals.
- [x] `ragCommand.ts` builds `PipelineDependencies` and a `PipelineInput` and
      calls `runPipeline`; it imports nothing from `server/conversations`.
- [x] `RagReporter` consumes `PipelineEvent`, and its search, ranked, selected,
      and answer reporting is unchanged from the command's point of view.
- [x] `runRagQuery`, `RagQueryEvent`, `RagQueryInput`, and
      `RagQueryDependencies` are deleted.
- [x] The command's output for a request is unchanged and the repository gates
      stay green.

**Notes:** The command passes its flags and its numbers; the turn passes its
configured ones. The `RagReporter` JSON mode still writes one line per event.

**Outcome:** `resolveSearch` and `answerDeltas` live under
`apps/server/src/pipeline/`; `ragCommand` builds a `PipelineInput` and calls
`runPipeline`, importing nothing from `server/conversations`; `RagReporter`
consumes `PipelineEvent`; `runRagQuery` and its types are gone. All gates green.
