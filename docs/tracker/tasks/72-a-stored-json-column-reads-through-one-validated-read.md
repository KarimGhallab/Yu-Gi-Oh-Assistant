# 72 - A stored JSON column reads through one validated read

**What to build:** The store's JSON columns (the search record and the card ids)
read through the reader's validated read. The search record is validated whole,
so a `query` or a `status` that is not a string raises as corrupt instead of
being dropped, and a schema mismatch crosses the seam as `StoredValueError` with
the zod complaint as its cause. The blind type assertion and the inline type
checks are gone.

**Blocked by:** 70 - One reader for a stored value, and the store reads through
it.

**Status:** Resolved (2026-09-18)

- [x] The store's JSON reads use the reader's validated read.
- [x] The search record validates the filters, the query, and the status
      together, so a non-string query or status raises.
- [x] A schema mismatch raises `StoredValueError` carrying the zod failure as
      its cause.
- [x] The blind `as` assertion and the inline `typeof` drops are gone.
- [x] The existing corrupt-filters test still passes, and a test covers a
      non-string query or status.
- [x] The repository gates stay green.

**Notes:** The `status` stays a plain string; narrowing it to `TurnStatus`
belongs to the search-interpretation seam and is out of scope.

**Outcome:** The store's two JSON columns read through the reader's validated
read. The search record validates the filters, the free text, and the status
together, so a non-string query or status raises as corrupt, and a schema
mismatch crosses the seam as `StoredValueError` with the zod failure as its
cause. The blind type assertion and the inline type drops are gone. The existing
corrupt-filters test passes and a new test covers a non-string query. All gates
green.
