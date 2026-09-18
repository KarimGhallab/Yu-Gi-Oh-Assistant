# 56 - The pipeline decisions are recorded

**What to build:** The decisions behind the retrieval and answer pipeline are
recorded as ADRs: how cards are embedded, why the turn runs in two stages, and
what the filter schema and retrieval strategy are.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] ADR 0004 records the composed-document multilingual embeddings decision,
      including why one language is scoped per turn.
- [ ] ADR 0005 records the two-stage pipeline with structured outputs (parse and
      filter, then a grounded answer) and its consequences.
- [ ] ADR 0008 records the filter schema and the retrieval strategy.
- [ ] Each follows the existing ADR's shape: the decision in prose, its
      consequences, and the options considered where there were any.
- [ ] The repository gates stay green.

**Notes:** The spec listed these as 0003, 0004, and 0007; `0001` is taken by the
UUID identities decision, so the set shifts by one.
