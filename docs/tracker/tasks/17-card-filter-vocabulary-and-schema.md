# 17 - Shared card filter vocabulary and schema

**What to build:** One shared, validated description of what can be filtered on
a card and how, so that retrieval, parsing, and the UI agree on the same
vocabulary instead of each inventing its own. From a developer's perspective:
define the filterable fields and operators, validate a filter set at a boundary,
and state the AND-composition semantics once.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] The filterable fields are `type`, `frameType`, `race`, `attribute`,
      `level`, `atk`, `def`, `linkVal`, `linkMarkers`, `archetype`.
- [ ] The operators are `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`,
      `startsWith`, `endsWith`.
- [ ] Each field accepts only the operators that fit it: numeric fields the
      comparisons, text fields the string operators, enumerated fields equality,
      and link markers containment.
- [ ] A filter set is validated at the boundary; unknown fields, unknown
      operators, and values that do not fit the field are rejected.
- [ ] The AND-composition semantics are stated once and testable: every filter
      in a set must hold, and an empty set matches everything.
- [ ] Tests assert acceptance and rejection at the schema boundary, and the
      composition rule directly.
- [ ] Build and lint pass.
