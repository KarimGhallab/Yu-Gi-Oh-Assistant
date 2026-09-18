# A read-only CardCatalog port with an in-memory substitute

The catalog is read through one interface, `CardCatalog`, defined in
`packages/db` beside its LanceDB implementation and reached through
`openCardCatalog(dataDir)`. It has five operations: `search`, `scan`,
`readByIds`, `archetypes`, and `metadata`. Nothing outside the adapter knows the
catalog is a LanceDB directory under `DATA_DIR`, and `RetrieveCardsOptions`
takes `catalog` rather than `dataDir`.

The port is read-only. Ingestion stays where it is, in `buildCardIndex` and
`populateCardIndex`, because it has one caller, runs before the server starts,
and replaces the whole table, which is a different act from reading it. Putting
`build` on the port would make every adapter model ingestion, including one that
only answers reads.

Callers receive the catalog as an injected dependency. `ServerDependencies` and
`RagQueryDependencies` carry it, and the composition root builds it once in the
same place that already chooses the Ollama client and the store. The boot guard
crosses the same seam: `metadata()` resolves `undefined` when there is no
metadata file instead of rejecting, and the guard turns that into the startup
failure, so it is not a special case reading a path directly.

A second adapter lives at `@ygo-assistant/db/testing`: `InMemoryCardCatalog`, in
`packages/db/src/testing`, built from `IndexedCardRow[]`, computing cosine in
`search` and filtering with `cardMatchesFilters` in `scan`. It exists because
the dependency rules forbid `packages/rag` from importing `test-support`, so
`db/testing` is the only substitute the retrieval tests can reach. Two adapters
are also what make the seam real rather than hypothetical.

The package entry narrows to the port and the ingestion and store it already
serves. `indexDirectory`, `readCardIndex`, `readCardIndexMetadata`,
`searchCardIndex`, `scanCardIndex`, `readCardsByIds`, and `listCardArchetypes`
become internal to the LanceDB adapter, so a caller reads the port rather than
the storage functions.

The pay-off is in the suites. Six of them build a real index today to test
behavior that is not about LanceDB, and the three ranking rules in
`retrieveCards` are reachable only behind an index build. Moving those suites to
the in-memory adapter removes the builds and lets ranking be asserted directly.
The LanceDB adapter keeps its own integration test, and the in-memory one uses
`cardMatchesFilters`, which means the in-process matcher gains a caller;
unifying it with the LanceDB clause is a separate decision.

## Considered options

Passing `dataDir` and opening the catalog per call, the shape before this
decision, keeps the storage path in the retrieval interface and leaves every
test building a real index to reach ranking. A read+write port was rejected
because ingestion has one caller and a different lifecycle, and a `build` method
forces every adapter to model it. Putting the interface in `packages/rag` was
rejected because rag consumes the catalog rather than owning it, and the
substitute could not live there without shipping a test double in a production
package. A mock that returns canned cards was rejected because it substitutes
the interface but not the behavior; a substitute that computes cosine and
applies the real filters is what keeps the retrieval tests honest.
