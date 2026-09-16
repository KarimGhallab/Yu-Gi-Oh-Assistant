# 19 - Structured pre-filters and the combined query

**What to build:** The second half of the retrieval engine: honor a structured
filter set alongside the free text. From a player's perspective: "level 4 or
lower light monsters that banish" respects the hard constraints while still
ranking by intent, a request carrying only filters returns every match, and a
request carrying only intent behaves as before. Filters combine with AND and
every query stays in the active language.

**Blocked by:** 17 - Shared card filter vocabulary and schema; 18 - Ranked
semantic retrieval over the card index.

**Status:** Resolved (2026-09-16)

- [x] With filters present, the query pre-filters on the structured columns and
      then ranks the survivors semantically; with no filters it is pure semantic
      search.
- [x] A filter-only query, carrying no free text, returns the matching cards in
      a deterministic order.
- [x] Multiple filters are AND-combined, and that composition still holds when
      filters and free text are both present.
- [x] Filter values reach the index query without being interpolated raw.
- [x] Every query stays scoped to the active language.
- [x] Tests assert the filter-only, semantic-only, combined, multi-filter,
      language-scoped, and empty cases over a seeded index; no Ollama is
      involved.
- [x] Build and lint pass.

**Notes:** `packages/cards` owns the filter semantics and the index query must
reproduce them exactly: text fields compare case-insensitively, enumerated
fields compare exactly, and a filter on a field the card does not carry never
holds, including `ne`, whose clause must therefore also exclude absent values.
`cardMatchesFilters` from ticket 17 is the normative rule. The filter-only lane
carries no query vector, so the search needs a vector-free path with a
deterministic order and a defined score; and because LanceDB takes a raw SQL
predicate with no parameter binding, text values must be escaped by a helper
rather than concatenated straight into the clause.
