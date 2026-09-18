# 56 - The pipeline decisions are recorded

**What to build:** The decisions behind the retrieval and answer pipeline are
recorded as ADRs: how cards are embedded, why the turn runs in two stages, and
what the filter schema and retrieval strategy are.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] ADR 0004 records the composed-document multilingual embeddings decision,
      including why one language is scoped per turn.
- [x] ADR 0005 records the two-stage pipeline with structured outputs (parse and
      filter, then a grounded answer) and its consequences.
- [x] ADR 0008 records the filter schema and the retrieval strategy.
- [x] Each follows the existing ADR's shape: the decision in prose, its
      consequences, and the options considered where there were any.
- [x] The repository gates stay green.

**Notes:** The spec listed these as 0003, 0004, and 0007; `0001` is taken by the
UUID identities decision, so the set shifts by one.

**Outcome:** Three ADRs are written in the established shape.
`docs/adr/0004-composed-document-multilingual-embeddings.md` records the
composed document (name, archetype line, effect) with the filterable fields
deliberately left out, and the single-language partition per turn, with the
reasons a mixed partition is noise and the consequences (a row per language, a
language switch is a different search, a rebuild on a model or dimension change).
`docs/adr/0005-two-stage-pipeline.md` records the split between the deterministic,
schema-constrained first stage (parse, judgement) and the grounded prose answer,
why separating what to recommend from why makes the set inspectable and a card
uninventable, and the consequences (several model calls, independent degradation
of each stage, the judgement as a judge rather than a ranker).
`docs/adr/0008-filter-schema-and-retrieval-strategy.md` records the one filter
schema shared by prompt, parser, search, and controls, its fields and
field-appropriate operators, the bounds declared once, the AND combination and
contradiction drop, and the two retrieval modes (semantic search, filter-only
scan) with the accepted bounds (race equality-only, frame type not filterable,
XYZ rank outside the level range). The numbering leaves 0006, 0007, and 0009 to
the conversation and testing ADRs of the sibling ticket.

Verified by reading each ADR against its sources: the document and embedding
against `composeCardDocument` and `buildCardIndex`, the partitions and modes
against `retrieveCards` and `cardIndex`, the schema against
`packages/cards/src/filters/schema.ts`, the structured stages against
`parseCardRequest`, `filterCandidates`, and `streamGroundedAnswer`, and the
grounding against `answerPrompt`. No code changed, so typecheck, the 445 tests,
and lint are unaffected; `prettier --check .` passes.
