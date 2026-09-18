# 59 - The callers and the suites move onto the port

**What to build:** Retrieval, the turn, the boot guard, and the RAG command
receive the catalog as a dependency instead of a `dataDir`, and the six suites
that build a real index only to reach behavior above it move onto the in-memory
adapter. Turns, the command, the guard, and the routes behave exactly as before.

**Blocked by:** 58.

**Status:** Resolved (2026-09-18)

- [x] `RetrieveCardsOptions.dataDir` becomes `catalog: CardCatalog`.
- [x] `ServerDependencies` carries `catalog`, `RagQueryDependencies` carries
      `catalog` instead of `dataDir`, and `main.ts` and `ragCommand.ts` build
      `openCardCatalog(config.dataDir)` once.
- [x] `projectMessages` and `archetypeService` read the catalog off their
      dependencies instead of composing a path.
- [x] `ensureIndexMatchesConfig(catalog, config)` reads `catalog.metadata()` and
      keeps `config.dataDir` only to name the directory in its message.
- [x] `retrieveCards.test.ts`, `runTurn.test.ts`, `runRagQuery.test.ts`,
      `conversationRoutes.test.ts`, `archetypeRoutes.test.ts`, and
      `ensureIndexMatchesConfig.test.ts` drive `InMemoryCardCatalog`.
- [x] `cardIndex.test.ts`, `populateCardIndex.test.ts`, and `e2e/stack.ts` stay
      on the real LanceDB adapter.
- [x] The behavior of a turn, the command, the guard, and the routes is
      unchanged, and the repository gates stay green.

**Notes:** The six suites lose their `buildCardIndex` and `TempDataDir` setup.
The LanceDB adapter's own integration test keeps building real indexes; that is
its coverage, not friction. The `cardMatchesFilters` caller the in-memory
adapter adds does not unify the two predicate implementations; that stays a
separate change.

**Outcome:** Landed with 58 and 60. `RetrieveCardsOptions`,
`RagQueryDependencies`, and `ServerDependencies` carry the catalog; `main.ts` and
`ragCommand.ts` open it once; the guard reads `catalog.metadata()`; the six
suites drive `InMemoryCardCatalog`, and `cardIndex.test.ts`,
`populateCardIndex.test.ts`, and `e2e/stack.ts` stay on the real adapter. A turn,
the command, the guard, and the routes behave as before: 460 unit tests pass.
