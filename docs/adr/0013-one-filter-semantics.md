# One filter semantics, two predicate implementations

The filter semantics are declared once, in the card filter schema, and two
implementations read them: the in-process matcher in `packages/cards` and the
LanceDB predicate in `packages/db`. The schema's per-field kind is what both
render from. `FilterKind` is `numeric`, `enumerated`, `text`, or `markers`, and
it is set in an exhaustive `Record<CardFilterField, FilterKind>` beside the
schema, so a new field does not compile until its kind is named. The vocabulary
carries the kind, and the LanceDB builder renders each kind through a total map:
numeric to a comparator, enumerated to exact equality, text to `lower(...)` with
`strpos`, `starts_with`, or `ends_with`, and markers to `array_contains`.

The matcher stays the specification and does not become a production caller.
The vector search has to filter inside LanceDB, so the SQL is the shipped
predicate on that path whatever else changes. A filter-only lookup that fetched
the language partition and matched in process would ship the matcher for one
path, leave the vector search on SQL, and pay a full-partition fetch per request,
so the duplication would survive with a performance cost on top. Instead the
in-process matcher is the definition of what a filter means, and the shipped SQL
is held to it.

The agreement is a test, not a comment. The adapter contract test runs one
battery of cards and filters through both adapters, the LanceDB one on SQL and
the in-memory one on the matcher, and asserts they return the same set. That is
the seam where the tested predicate and the shipped predicate meet, and it is
the only place the agreement is asserted. The shipped strings are also tested
directly, at the builder's own seam, for the parts a comparison through the
index reaches only incidentally: the language predicate, the `lower(...)`
wrapping, the quote doubling, and the integer guard that refuses a non-integer.

The behavior does not move. No query, no ordering, and no language fallback
changes. What changes is that adding a field or a kind is a compile error in the
rendering, so the SQL cannot quietly fall behind the schema, and the shipped
predicate is now exercised at both its own seam and the seam that pins it to the
specification.

## Considered options

Shipping the in-process matcher for the filter-only lookup was rejected because
the vector search cannot use it and the change would pay to fetch a whole
language partition per request. Leaving `packages/db` branching on field names
and only sharing the operator maps was rejected because it is the hand branch
that lets a field and its SQL drift. Inferring the kind from a field's operator
set was rejected because the inference is implicit and a field with mixed
operators would break it quietly. Generating the predicate without a kind was
rejected because the storage dialect belongs in `db` and the field's kind
belongs in the schema; the kind is the small thing they share.
