# 63 - The suites rebalance and the docs follow

**What to build:** The pipeline gets the direct test `resolveSearch` never had,
the turn's HTTP suite narrows to what only crosses the server, and the
architecture and glossary docs name the new module.

**Blocked by:** 61, 62.

**Status:** Resolved (2026-09-18)

- [x] `runPipeline.test.ts` drives the pipeline through the in-memory catalog and
      the fake Ollama client and owns the sequence: the parse outcomes and the
      free-text-only status, the `parse`, `filter`, and `answer` toggles, the
      ranking, the selection and its fallback, the no-cards copy in both
      languages, and the stage-tagged errors.
- [x] `runTurn.test.ts` keeps only what crosses the server: the event framing
      and order, the message persistence and the stored query, the pre-stream
      refusals, and the failure stages as they reach the wire.
- [x] `docs/ARCHITECTURE.md` says rag owns the stages and the server owns the
      pipeline.
- [x] `docs/GLOSSARY.md` gains **Turn pipeline**.
- [x] The repository gates stay green.

**Notes:** ADR 0012 is already written and records the decision this ticket
finishes.

**Outcome:** `runPipeline.test.ts` owns the sequence and its stage-tagged
errors; `runTurn.test.ts` keeps the server seam, the persistence, the
pre-stream refusals, and the failure stages as they reach the wire.
`docs/ARCHITECTURE.md` names the pipeline module and `docs/GLOSSARY.md` gains
**Turn pipeline**. All gates green.
