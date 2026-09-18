# 64 - The predicate renders from the schema's field kinds

**What to build:** The filter semantics get one declared source. The card filter
schema names each field's kind, and the LanceDB predicate renders from that kind
and the operator instead of branching on field names. The shipped strings get
their own direct test, and a filter query behaves exactly as before.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] `CardFilterField`'s per-field kind lives in `packages/cards` as an
      exhaustive map, so a new field does not compile until its kind is named.
- [x] `FilterFieldVocabulary` carries the kind.
- [x] The LanceDB predicate renders from the kind and the operator through one
      total map over the kinds, and each renderer is reachable.
- [x] The column a field maps to, the language predicate, the quoting, and the
      integer guard stay in `packages/db`.
- [x] The shipped strings are asserted directly: the language predicate, each
      operator's SQL, the `lower(...)` wrapping for text, the quote doubling,
      the integer guard throwing, and the id clause.
- [x] The predicate still stands in for `cardMatchesFilters`, and no query,
      ordering, or fallback changes.
- [x] The repository gates stay green.

**Notes:** ADR 0013 records the decision. The existing suite keeps its oracle
comparison until ticket 65 moves the agreement into the adapter contract test.

**Outcome:** `FilterKind` and the exhaustive `FILTER_FIELD_KINDS` map live in
`packages/cards`; `FilterFieldVocabulary` carries the kind; the LanceDB
predicate renders from the kind and operator through one total map.
`cardPredicates.test.ts` asserts the shipped strings directly. All gates green;
the query, ordering, and fallback are unchanged.
