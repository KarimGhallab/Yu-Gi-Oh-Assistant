# 60 - The db entry narrows and the architecture doc follows

**What to build:** The `packages/db` entry point stops exporting the free read
functions, the path helper, and the option types they took, leaving the port and
the ingestion and store the package already serves. The architecture doc records
the seam.

**Blocked by:** 59.

**Status:** Resolved (2026-09-18)

- [x] `indexDirectory`, `readCardIndex`, `readCardIndexMetadata`,
      `searchCardIndex`, `scanCardIndex`, `readCardsByIds`,
      `listCardArchetypes`, and the option types those functions took leave the
      `packages/db` entry point.
- [x] The free reads are internal to the LanceDB adapter, reachable only through
      `openCardCatalog`.
- [x] `readCardIndex` lives at `@ygo-assistant/db/testing` as a contents dump,
      and the populate test uses it from there.
- [x] `docs/ARCHITECTURE.md` records the port: db exposes a read-only catalog
      with a LanceDB adapter and an in-memory substitute, ingestion stays direct,
      and the turn flow reads through the catalog.
- [x] `knip` and `depcruise` accept the narrowed entry, and the tsconfig path
      check passes.
- [x] The repository gates stay green.

**Notes:** ADR 0011 is written already and records the decision this ticket
finishes. With the entry narrowed, the package's interface is the port, and a
caller reads that rather than the storage functions.

**Outcome:** Landed with 58 and 59. The db entry no longer exports the free
reads, the path helper, or their option types; the reads are internal to the
LanceDB adapter and reachable only through `openCardCatalog`; `readCardIndex`
lives at `@ygo-assistant/db/testing` and the populate test reads it from there.
`docs/ARCHITECTURE.md` records the port, the substitute, and the direct
ingestion. `knip`, `depcruise`, the tsconfig path check, lint, prettier, and the
build pass.
