# 58 - The catalog is read behind a port

**What to build:** A read-only `CardCatalog` interface with the LanceDB adapter
behind `openCardCatalog(dataDir)`, and a faithful in-memory adapter at
`@ygo-assistant/db/testing`, both held to one contract test. The existing
exports and callers are untouched, so the port lands alongside the functions
that still answer it.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] `CardCatalog` and its operation types live in `packages/db/src/catalog/`
      and are exported from the package entry, with `openCardCatalog(dataDir)`
      returning the LanceDB adapter.
- [x] `search`, `scan`, `readByIds`, `archetypes`, and `metadata` behave exactly
      as the free reads do today, including the language partition, the limit,
      cosine ordering, and the language fallback when reading by id.
- [x] `metadata()` resolves `undefined` when no metadata file exists, while a
      read against a missing table still rejects.
- [x] `InMemoryCardCatalog` lives at `packages/db/src/testing/`, is exported as
      `@ygo-assistant/db/testing`, and `packages/db/package.json` gains the
      `./testing` entry.
- [x] The in-memory adapter is built from `IndexedCardRow[]`, computes cosine in
      `search`, filters with `cardMatchesFilters` in `scan`, and honors the
      language partition and the limit.
- [x] One contract test runs the same assertions against both adapters.
- [x] The existing exports and callers are untouched, so the port lands without
      a behavior change.
- [x] The repository gates stay green.

**Notes:** The `./testing` subpath needs no `tsconfig.depcruise.json` change;
the validator checks package names, not subpaths, and `@ygo-assistant/ollama/testing`
already proves the pattern. `readCardIndex` stays where it is until ticket 60
moves it. Ingestion stays outside the port.

**Outcome:** Landed with tickets 59 and 60 as one change. `CardCatalog` and
`openCardCatalog` live in `packages/db/src/catalog/`; `InMemoryCardCatalog` and
the `readCardIndex` contents dump live in `packages/db/src/testing/` and are
exported as `@ygo-assistant/db/testing`; `packages/db/src/catalog/cardCatalog.test.ts`
runs the same contract against both adapters. All repository gates are green.
