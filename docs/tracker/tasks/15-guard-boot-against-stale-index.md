# 15 - Guard server boot against a stale index

**What to build:** On startup the server reads the index metadata and compares
the embedding model and dimensions with the configured values; a missing index or
a mismatch aborts startup with a message that tells the developer to re-run
`db:populate`. From a developer's perspective: the server never serves silently
bad results from an index built with a different embedding model.

**Blocked by:** 13 - Build and read the local card index.

**Status:** Resolved (2026-09-15)

- [x] A boot check compares the index metadata with the configured embedding
      model and dimensions.
- [x] A missing index or a mismatch fails startup with a message naming the
      re-run-populate command.
- [x] A matching index passes silently.
- [x] Tested against a temporary index that disagrees with the configuration;
      build and lint pass.
