# 57 - The conversation and testing decisions are recorded

**What to build:** The decisions behind how conversations are stored and
streamed, how a model is chosen, and how the repository is tested are recorded
as ADRs.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] ADR 0006 records server-persisted conversations with an SSE turn stream.
- [ ] ADR 0007 records UI-driven model selection with a structured-output
      fallback.
- [ ] ADR 0009 records the testing strategy with a stubbed Ollama.
- [ ] Each follows the existing ADR's shape: the decision in prose, its
      consequences, and the options considered where there were any.
- [ ] The repository gates stay green.

**Notes:** The spec listed these as 0005, 0006, and 0008; `0001` is taken by the
UUID identities decision, so the set shifts by one.
