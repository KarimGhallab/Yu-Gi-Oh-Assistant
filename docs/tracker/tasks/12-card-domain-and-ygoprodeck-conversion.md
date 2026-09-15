# 12 - Card domain and YGOPRODeck conversion

**What to build:** The card domain and a converter that turns a YGOPRODeck v7
dump payload, English or French, into validated card records, plus the composed
semantic document (name, type line, attribute/race, level, ATK/DEF, effect). From
a developer's perspective: point the converter at a real-shaped fixture and get
back card records and the document text that will later be embedded.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-15)

- [x] The card domain and its enums live in `packages/cards`; the converter and
      the document composer live in `packages/db`.
- [x] English and French fixtures convert to the expected records, including
      optional fields such as link values and missing ATK/DEF.
- [x] The composed document contains name, type line, attribute/race, level,
      ATK/DEF, and effect.
- [x] Cards that are not suggestable (tokens, Skill Cards) are excluded.
- [x] No test reaches the network; build and lint pass.
