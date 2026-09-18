# 14 - Filter predicate

- **Status:** `ready-for-agent`
- **Kind:** spec
- **Blocked by:** 12
- **Source:** architecture review, 2026-09-18

## Problem Statement

Two implementations hold the filter semantics. `cardMatchesFilters` in
`packages/cards` is the one with the 637-line test and the second use as an
oracle, and it has no production caller. The one that ships is the LanceDB
predicate in `packages/db/src/catalog/cardPredicates.ts`, which branches on field
names and hand-maintains the column and operator maps, and which no test crosses
at its own seam. The tests' green does not speak to the shipped path except
through one oracle comparison over fifteen cases, so the SQL can drift from the
semantics the tests describe and only a LanceDB integration case would notice.

## Solution

Make the schema's per-field kind the one source both implementations render
from. `packages/cards` declares `FilterKind` and an exhaustive field-kind map and
surfaces the kind on the vocabulary; `packages/db` renders the predicate from
the kind and the operator through a total map. The in-process matcher stays the
specification, the shipped SQL is held to it by the adapter contract test, and
the shipped strings get their own direct test.

## User Stories

1. As a developer, I want the filter semantics declared once, so a field and its
   SQL cannot drift.
2. As a developer, I want the shipped predicate tested at its own seam, so the
   quoting and the guards are covered directly.
3. As a developer, I want the two implementations pinned together by a test, so
   a semantic change on one side fails on the other.
4. As a developer, I want adding a field to be a compile error until its kind is
   named, so the vocabulary stays the schema's.
5. As a maintainer, I want no behavior change, so the deepening is safe to land
   on its own.

## Implementation Decisions

- **The kind.** `packages/cards` declares the per-field kind and the map:

  ```ts
  export enum FilterKind {
    Numeric = 'numeric',
    Enumerated = 'enumerated',
    Text = 'text',
    Markers = 'markers'
  }

  export const FILTER_FIELD_KINDS: Record<CardFilterField, FilterKind> = {
    [CardFilterField.Type]: FilterKind.Enumerated,
    [CardFilterField.Race]: FilterKind.Enumerated,
    [CardFilterField.Attribute]: FilterKind.Enumerated,
    [CardFilterField.Level]: FilterKind.Numeric,
    [CardFilterField.Atk]: FilterKind.Numeric,
    [CardFilterField.Def]: FilterKind.Numeric,
    [CardFilterField.LinkVal]: FilterKind.Numeric,
    [CardFilterField.LinkMarkers]: FilterKind.Markers,
    [CardFilterField.Archetype]: FilterKind.Text
  };
  ```

  The `Record` is exhaustive, so a new field does not compile until its kind is
  named. `FilterFieldVocabulary` gains `kind: FilterKind`, merged in
  `describeFilterFields` from the map.

- **The rendering.** `packages/db/src/catalog/cardPredicates.ts` renders each
  filter from its kind and operator through a total map over `FilterKind`:
  numeric to a comparator, enumerated to exact equality, text to `lower(...)`
  with `strpos`, `starts_with`, or `ends_with`, and markers to
  `array_contains`. Adding a kind is a compile error in the renderer. The
  column for a field, the language predicate, and the quoting and the integer
  guard stay in `db`, where the dialect belongs.
- **The matcher stays the specification.** `cardMatchesFilters` does not become
  a production caller, because the vector search filters inside LanceDB and the
  filter-only lookup would otherwise fetch a whole language partition per
  request. It is the definition of what a filter means, and the SQL is held to
  it.
- **The agreement.** Spec 12's adapter contract test gains a battery of cards
  and filters, asserted equal across the LanceDB adapter and the in-memory one,
  which is the matcher. That single test is where the tested predicate and the
  shipped predicate meet.
- **The direct test.** `packages/db/src/catalog/cardPredicates.test.ts` asserts
  the shipped strings: the language predicate, each operator's SQL, the
  `lower(...)` wrapping for text, the quote doubling, the integer guard
  throwing, and `buildIdClause`. The builders stay internal to `db`.
- **The work.** Spec 14, blocked by spec 12. Ticket 64 adds the kind and the
  rendering with the direct test and no blockers. Ticket 65 extends the adapter
  contract test, folds the oracle case out of the LanceDB adapter test, and
  updates the architecture doc, blocked by 64 and by 58 to 60.
- **The record.** ADR 0013 holds the decision and why the matcher stays the
  specification rather than shipping.

## Testing Decisions

- The predicate agreement lives in the adapter contract test, not in a second
  standalone test: the LanceDB adapter on SQL and the in-memory adapter on the
  matcher, asserted equal over one battery that includes the missing-field and
  case-insensitive cases the semantics turn on.
- `cardPredicates.test.ts` tests the shipped strings directly, which the index
  integration test reaches only incidentally, and it is the test that would catch
  a quoting or guard regression without a LanceDB round trip.
- The LanceDB adapter's own test keeps its focused cases (stable identity order,
  language scoping, quoting, the integer guard) and drops the oracle
  comparison once the contract test owns the agreement.
- `schema.test.ts`'s `cardMatchesFilters` suite stays as the specification's
  test; it is not duplicated.

## Out of Scope

- Shipping the in-process matcher in production, which the vector search
  forecloses and which would cost a full-partition fetch.
- Changing any query, ordering, or the language fallback; behavior is unchanged.
- The catalog port and the turn pipeline, which specs 12 and 13 land.
- Moving the storage dialect into `packages/cards`; the dialect stays in `db`.

## Further Notes

- It can only land once the whole of spec 12 is done, because the agreement test
  is the adapter contract test that spec 12 introduces.
- ADR 0008 records the filter schema and the two retrieval modes; this spec does
  not change either. It records how the two implementations of that one schema
  are kept together.
- No `GLOSSARY.md` change: `FilterFieldVocabulary` is already the vocabulary,
  and the kind is an implementation shape rather than a domain term.
