# 65 - The shipped predicate is pinned to the tested one

**What to build:** The tested predicate and the shipped predicate meet in one
place. The adapter contract test runs a battery of cards and filters through
both the LanceDB adapter and the in-memory one and asserts they agree, so a
semantic change on either side fails the other. The single oracle comparison
leaves the LanceDB adapter's own test, and the architecture doc records the
seam.

**Blocked by:** 64.

**Status:** Resolved (2026-09-18)

- [x] The adapter contract test asserts the LanceDB adapter and the in-memory
      adapter return the same matches over a battery that includes every kind,
      a field a card does not carry, and case-insensitive text.
- [x] The oracle comparison is removed from the LanceDB adapter's own test,
      which keeps its focused cases.
- [x] `docs/ARCHITECTURE.md` records that the schema's field kinds are the one
      source, that the in-process matcher is the specification, and that the
      contract test pins the two.
- [x] No behavior changes and the repository gates stay green.

**Notes:** Spec 12's tickets 58 to 60 already landed, so 64 is the only live
blocker. The `cardMatchesFilters` suite in the cards package stays as the
specification's test.

**Outcome:** The adapter contract test runs a battery of cards and filters
through both adapters and asserts they agree, and asserts the LanceDB adapter
against the in-process matcher over the same cases. The oracle comparison left
the LanceDB adapter's own test. `docs/ARCHITECTURE.md` records the seam. All
gates green.
