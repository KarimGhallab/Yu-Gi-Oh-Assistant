# 57 - The conversation and testing decisions are recorded

**What to build:** The decisions behind how conversations are stored and
streamed, how a model is chosen, and how the repository is tested are recorded
as ADRs.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] ADR 0006 records server-persisted conversations with an SSE turn stream.
- [x] ADR 0007 records UI-driven model selection with a structured-output
      fallback.
- [x] ADR 0009 records the testing strategy with a stubbed Ollama.
- [x] Each follows the existing ADR's shape: the decision in prose, its
      consequences, and the options considered where there were any.
- [x] The repository gates stay green.

**Notes:** The spec listed these as 0005, 0006, and 0008; `0001` is taken by the
UUID identities decision, so the set shifts by one.

**Outcome:** Three ADRs are written in the established shape.
`docs/adr/0006-server-persisted-conversations-sse.md` records the store as the
one copy of the history, the pipeline resolving stored card ids on reopen, the
message stored before the turn and the reply only when complete, and the turn as
a one-way stream of validated named events, with the costs a non-resumable
stream implies.
`docs/adr/0007-ui-driven-model-selection.md` records the model as a conversation
setting the interface chooses from what is installed, refused before the turn
starts when it is not there, and the application deriving the structured-output
capability from the completion capability Ollama does report, with a prompt and
one repair as the fallback. `docs/adr/0009-testing-with-a-stubbed-ollama.md`
records the two seams (the in-process `FakeOllamaClient` for the vitest suites,
the HTTP `FakeOllamaServer` behind the ollama package's `testing` subpath for the
end-to-end suite), where the doubles live and who may import them, and the
discipline and cost of the interface as the seam. With 0006, 0007, and 0009
written, the nine ADRs the spec listed exist and none of the reserved numbers
gaps.

Verified by reading each ADR against its sources: conversations and the stream
against `conversationService`, `runTurn`, and the turn contract; model selection
against `modelService` and the capability detection in `OllamaClient`; and the
testing strategy against `FakeOllamaClient`, `TempDataDir`, `FakeOllamaServer`,
the vitest project config, and the pipeline workflows. No code changed, so
typecheck, the 445 tests, and lint are unaffected; `prettier --check .` passes.
With this ticket resolved, every ticket of spec 10 is landed, so the spec is
marked Resolved.
