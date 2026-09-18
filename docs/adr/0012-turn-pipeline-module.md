# One turn pipeline module, two delivery adapters

A turn's sequence, resolving the search, retrieving, choosing, and answering, is
one module, `runPipeline`, in `apps/server/src/pipeline`. It yields a neutral
stream of four events, `search`, `ranked`, `selected`, and `answer`, and takes
one input carrying the request, the settings, the three toggles the command
uses, and the retrieval numbers. `runTurn` and the RAG command are adapters over
it: the turn frames the events as the SSE wire shapes and stores the reply, and
the command feeds them to its reporter.

The module lives in the server rather than `packages/rag` because of the
dependency rules. `packages/rag` may not import `@ygo-assistant/contracts`
(`layering-rag`), and `contracts` may depend only on `cards` and `utils`
(`layering-contracts`). `TurnStatus` and `TurnStage` are contracts values and
the stages use them, so moving the pipeline into rag would either push the
turn's codes into `cards`, where they do not belong, or break a rule. Both
callers are in the server, and the pipeline is application orchestration over
rag's stages, so the server is where it belongs: rag owns the stages, the server
owns the pipeline.

`RagQueryEvent` disappears with the move. The pipeline's events are what the
command reports and what the turn maps from, so the sequence has one vocabulary
instead of two. The turn keeps `TurnEvent` as the wire shape the client
validates.

The pipeline's dependencies are narrower than the server's,
`{ logger, ollama, catalog }`, so it never sees the app configuration or the
conversation store. The catalog is the read-only port the pipeline retrieves
through, which is also what keeps the pipeline testable without an index.

A failure is a `PipelineError` carrying the `TurnStage` it died at and the
underlying cause. The stage belongs to the pipeline, which is the only place
that knows where it happened; the player-safe message stays with the turn, which
unwraps the cause and decides what a player may read. The no-cards copy moves
into the pipeline's answer stage, so both callers share one owner, and the
refusal to store an empty answer stays in the turn, because only storing cares
whether a reply says anything.

## Considered options

Putting the pipeline in `packages/rag` was rejected because it forces
`TurnStatus` and `TurnStage` out of contracts into `cards` or a new package, for
a pipeline only the server calls. Keeping `resolveSearch` and `answerDeltas`
where they were, under the server's conversations folder, was rejected because
it is what makes the RAG command reach into the HTTP layer and what leaves the
sequence assembled twice. A set of step functions the callers order themselves
was rejected because it would put the sequence back in each caller, which is the
duplication being removed; a read-only event stream the pipeline drives and the
callers map is the shape that concentrates it.
