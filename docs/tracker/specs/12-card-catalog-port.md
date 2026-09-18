# 12 - Card catalog port

- **Status:** Resolved (2026-09-18)
- **Kind:** spec
- **Blocked by:** 03, 04
- **Source:** architecture review, 2026-09-18

## Problem Statement

`retrieveCards` takes `dataDir: string`, so retrieval's interface carries the
storage shape: every caller and every test must know the catalog is a LanceDB
directory under `DATA_DIR`. The ranking rules in `rank` are reachable only by
building a real index, and six suites build one to test behavior that is not
about LanceDB, about 56 index builds in the fast suites. The `packages/db` entry
point exports the free read functions and a path helper alongside the domain it
serves, so the package's interface is wider than the port the rest of the
workspace needs.

## Solution

One read-only `CardCatalog` interface, implemented by the LanceDB adapter and by
an in-memory substitute at `@ygo-assistant/db/testing`. Callers receive the
catalog as an injected dependency, `dataDir` leaves `RetrieveCardsOptions`, the
boot guard reads metadata through the port, and the package entry narrows to the
port plus the ingestion and store it already serves. Ingestion stays outside the
port.

## User Stories

1. As a developer, I want one interface for the catalog, so a caller never knows
   it is LanceDB.
2. As a developer, I want a faithful in-memory catalog, so retrieval and the
   turn can be tested without building an index.
3. As a developer, I want the composition root to choose the adapter, so
   production and tests differ in one place.
4. As a developer, I want the boot guard to read metadata through the same seam,
   so it is not a special case that reads a path.
5. As a developer, I want the db entry point to expose the port rather than its
   internals, so the package's interface is legible.
6. As a maintainer, I want the two adapters held to one contract test, so the
   substitute cannot drift from the adapter it stands in for.

## Implementation Decisions

- **The port.** `CardCatalog` is defined in `packages/db/src/catalog/`, beside
  its LanceDB adapter, with five read operations:

  ```ts
  export interface CardCatalog {
    search(options: {
      vector: number[];
      language: Language;
      filters: CardFilters;
      limit: number;
    }): Promise<ScoredCard[]>;
    scan(options: {
      language: Language;
      filters: CardFilters;
      limit: number;
    }): Promise<Card[]>;
    readByIds(options: { ids: number[]; language: Language }): Promise<Card[]>;
    archetypes(): Promise<string[]>;
    metadata(): Promise<IndexMetadata | undefined>;
  }

  export function openCardCatalog(dataDir: string): CardCatalog;
  ```

  `filters` is required, dropping the `?? []` default branch. `metadata()`
  resolves `undefined` when there is no metadata file; a read against a missing
  table still rejects. The method names are the glossary's: `search` is semantic
  search, `scan` is the filter-only lookup, `metadata` is the index metadata.

- **Read-only scope.** Ingestion keeps its direct calls, `buildCardIndex` and
  `populateCardIndex`, because it has one caller, runs before the server starts,
  and replaces the whole table. `build` is not on the port.
- **The second adapter.** `InMemoryCardCatalog` lives at
  `packages/db/src/testing/` and is exported as `@ygo-assistant/db/testing`,
  mirroring `@ygo-assistant/ollama/testing` (`packages/ollama/package.json`).
  It is built from `IndexedCardRow[]`, computes cosine in `search`, filters with
  `cardMatchesFilters` in `scan`, and honors the language partition and the
  limit. `db/testing` is the only home the retrieval tests can reach, because
  the dependency rules forbid `packages/rag` and `packages/db` from importing
  `test-support`.
- **Wiring.** The composition root builds `openCardCatalog(config.dataDir)` once
  in `main.ts` and `ragCommand.ts`. `ServerDependencies` gains `catalog`,
  `RagQueryDependencies` replaces `dataDir` with `catalog`, and
  `RetrieveCardsOptions.dataDir` becomes `catalog`. `projectMessages` and
  `archetypeService` read the catalog off their dependencies. The guard becomes
  `ensureIndexMatchesConfig(catalog, config)`, reading `catalog.metadata()` and
  keeping `config.dataDir` only to name the directory in its message.
- **Package surface.** The entry retires `indexDirectory`, `readCardIndex`,
  `readCardIndexMetadata`, `searchCardIndex`, `scanCardIndex`, `readCardsByIds`,
  `listCardArchetypes`, and the option types those functions took. The free
  reads become internal to the LanceDB adapter, and `readCardIndex`, which has
  no production caller, moves to `db/testing` as a contents dump for the
  populate test. The entry keeps and exposes `CardCatalog`, `openCardCatalog`,
  `ScoredCard`, `IndexMetadata`, the query types, `buildCardIndex`, and the
  ingestion and store exports.
- **The decision.** ADR 0011 records the port, its read-only scope, and why the
  substitute lives at `db/testing`.

## Testing Decisions

- The two adapters share one contract test over the port: `search`, `scan`,
  `readByIds`, `archetypes`, and `metadata`, including the language partition,
  the limit, cosine ordering, the missing-id fallback, and a missing metadata
  file. Running the same assertions against both is what keeps the substitute
  faithful.
- The LanceDB adapter keeps its integration coverage in
  `packages/db/src/catalog/index/cardIndex.test.ts`, now driven through
  `openCardCatalog` and still seeded by `buildCardIndex`.
- `packages/rag/src/retrieveCards.test.ts`, `runTurn.test.ts`,
  `runRagQuery.test.ts`, `conversationRoutes.test.ts`, `archetypeRoutes.test.ts`,
  and `ensureIndexMatchesConfig.test.ts` move to `InMemoryCardCatalog`.
- `populateCardIndex.test.ts` and `e2e/stack.ts` stay on the real adapter: one
  tests ingestion, the other the whole stack. About 56 real index builds leave
  the fast suites; about 26 stay where they test real ingestion or the adapter.
- The port is the test surface: a test that wants to exercise retrieval crosses
  the same seam a caller does.

## Out of Scope

- Ingestion behind the port, and any `build` operation on it.
- Unifying `cardMatchesFilters` with the LanceDB clause (architecture review,
  candidate 3). The substitute gives the in-process matcher a caller; the two
  implementations are not merged here.
- Moving ranking into the catalog; it stays retrieval policy in
  `retrieveCards`.
- The turn pipeline module and the other candidates from the architecture
  review.

## Further Notes

- The change is behavior-preserving: the LanceDB adapter keeps the same queries,
  ordering, and language fallback, and no endpoint or stored shape moves.
- The `db/testing` subpath needs no `tsconfig.depcruise.json` change; the
  validator checks package names, not subpaths, and the pattern is already
  proven by `@ygo-assistant/ollama/testing`.
- The gates to keep green are typecheck, the vitest suites, lint, formatting,
  `depcruise`, `knip`, `syncpack`, and the tsconfig path check.
