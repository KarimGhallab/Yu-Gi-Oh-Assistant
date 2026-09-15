# 04 - Retrieval engine

- **Status:** `ready-for-agent`
- **Kind:** spec
- **Blocked by:** 03
- **Source:** architecture grilling, 2026-09-15

## Problem Statement

Given a structured filter set and a free-text intent, the application needs to
return a small ranked set of candidate cards. A pure keyword search cannot honor
semantic intent ("banishes cards"), and a pure vector search cannot honor hard
constraints ("level 4 or lower"). Neither alone matches how players describe
what they want.

## Solution

A retrieval library in `packages/rag` that combines structured pre-filtering
with approximate nearest-neighbour search over the composed-document vectors. It
exposes filter schemas, an AND-composition rule, the pre-filter-plus-ANN query,
and the ranking parameters. It is a pure library with no HTTP and no LLM, and it
is testable against a small seeded index.

## User Stories

1. As a player, I want hard constraints honored (type, attribute, level,
   ATK/DEF, archetype), so that "level 4 or lower" is actually respected.
2. As a player, I want free-text intent matched semantically against card
   effects, so that synonyms and paraphrases still find cards.
3. As a player, I want a small number of candidates, so that the answer is not
   overwhelming.
4. As a player, I want an empty result when nothing matches, so that I can
   broaden my request instead of seeing irrelevant cards.
5. As a player, I want retrieval scoped to my selected language, so that names
   and effects match the cards I own.
6. As a developer, I want the filter schema shared as the single source of
   truth, so that parsing, retrieval, and the UI agree on what is filterable.
7. As a developer, I want ranking parameters tunable without code changes, so
   that quality can be tuned on real queries.
8. As a developer, I want retrieval results to be deterministic in tests, so
   that assertions are stable.

## Implementation Decisions

- Filterable fields: `type`, `frameType`, `race`, `attribute`, `level`, `atk`,
  `def`, `linkVal`, `linkMarkers`, `archetype`. Operators: `eq`, `ne`, `gt`,
  `gte`, `lt`, `lte`, `contains`, `startsWith`, `endsWith`.
- Filters are AND-combined. A single free-text field drives the semantic lane.
- With filters present, the query pre-filters on the structured columns and then
  runs ANN on the composed vector. With no filters, it runs pure ANN.
- The query is always scoped to the active language partition.
- Parameters with defaults: candidate count into the next stage (25), shown
  count (8), and a similarity floor. They come from configuration
  (`RETRIEVAL_TOP_K`, `RETRIEVAL_SHOWN`, `RETRIEVAL_MIN_SCORE`).
- Results are card records plus a score, deduplicated by card identity and
  ordered by score.
- No reranker or cross-encoder in v1. The filter schema lives in
  `packages/cards`; the query logic lives in `packages/rag`.

## Testing Decisions

- Good tests assert the returned candidate set for a given index and query:
  which cards come back, in what order, and how many. They do not assert the
  internal query plan.
- Tests seed a small temporary index with known cards and vectors, then assert:
  filter-only queries, semantic-only queries, combined queries, language
  scoping, AND composition across multiple filters, and the empty case.
- Because the vectors are supplied by the test, results are deterministic; no
  Ollama is involved.
- Prior art: the temporary-index helper introduced by feature 03's integration
  test is reused here.

## Out of Scope

- Parsing a natural-language prompt into filters (feature 06).
- Generating an answer from the candidates (feature 07).
- Any dedicated reranking model.

## Further Notes

- The similarity floor exists to avoid surfacing unrelated cards when a query is
  vague; its default should be tuned against the real index before release.
- If hybrid lexical retrieval is added later, it belongs in this library behind
  the same entry point.
