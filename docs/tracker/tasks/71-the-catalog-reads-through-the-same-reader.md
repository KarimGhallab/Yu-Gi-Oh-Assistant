# 71 - The catalog reads its rows through the same reader

**What to build:** The card index's row reads go through the same reader, as a
second binding that names the card index as its source. The duplicated coercers
and enum guards are gone, and a failed read names the real column (`level`, not
`number`). The archetypes list reads each cell through the reader, raising on a
non-string and skipping an absent or empty one. The in-memory catalog keeps
reading its typed rows.

**Blocked by:** 70 - One reader for a stored value, and the store reads through
it.

**Status:** Resolved (2026-09-18)

- [x] The card row adapter composes the shared reader, binds it to "the card
      index", and its local coercers and duplicate enum guards are deleted.
- [x] The card row's optional reads pass their real column names, so a failure
      names the column.
- [x] A wrong card column raises `StoredValueError` naming the card index and
      the field.
- [x] The archetypes list reads each cell through the shared read; a non-string
      raises and an absent or empty one is skipped; the in-memory catalog is
      unchanged.
- [x] The catalog suite stays green and a test covers a wrong column and the
      archetype read.
- [x] The repository gates stay green.

**Notes:** The catalog adapter keeps `normalizeCard`, `normalizeCardRow`, and a
named `toArchetype` so the source string is bound once and the archetypes list
has one read to call.

**Outcome:** The card row adapter composes the shared reader bound to the card
index, its duplicate coercers and guards are gone, and a failed read names the
real column (`level`, `atk`, and so on). The archetypes list reads each cell
through `toArchetype`, raising on a non-string and skipping an absent or empty
one; the in-memory catalog is unchanged. A direct adapter test reads a row,
raises on a wrong column and a bad enum, and covers the archetype cell. All
gates green.
