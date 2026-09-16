# 17 - Shared card filter vocabulary and schema

**What to build:** One shared, validated description of what can be filtered on
a card and how, so that retrieval, parsing, and the UI agree on the same
vocabulary instead of each inventing its own. From a developer's perspective:
define the filterable fields and operators, validate a filter set at a boundary,
and state the AND-composition semantics once.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-16)

- [x] The filterable fields are `type`, `frameType`, `race`, `attribute`,
      `level`, `atk`, `def`, `linkVal`, `linkMarkers`, `archetype`.
- [x] The operators are `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`,
      `startsWith`, `endsWith`.
- [x] Each field accepts only the operators that fit it: numeric fields the
      comparisons, text fields the string operators, enumerated fields equality
      (equality and its negation), and link markers containment.
- [x] A filter set is validated at the boundary; unknown fields, unknown
      operators, and values that do not fit the field are rejected.
- [x] The AND-composition semantics are stated once and testable: every filter
      in a set must hold, and an empty set matches everything.
- [x] Tests assert acceptance and rejection at the schema boundary, including
      the full field-by-operator vocabulary matrix, and the composition rule
      directly.
- [x] Build and lint pass.
