# 24 - JSON-mode parsing with a single repair retry

**What to build:** The same parsing on a model that cannot be constrained by a
schema. From a player's perspective: a small local model still understands the
request, so a heavy model is not required, and a model that fumbles the format
costs one extra attempt rather than the whole search. From a developer's
perspective: a defined fallback that asks for JSON only, validates what comes
back, repairs exactly once using the validation error, and degrades to free text
when even that fails.

**Blocked by:** 23 - Parse a prompt into filters with structured output.

**Status:** ready-for-agent

- [ ] A model that does not support structured output is prompted for JSON only,
      and the parse request carries no format constraint.
- [ ] A response that fails validation triggers exactly one repair retry, and the
      retry tells the model what failed validation.
- [ ] The retry's response is validated like the first, and a valid retry
      produces the parse result a model that answered correctly the first time
      would have produced.
- [ ] A repaired parse is not reported as degraded, so the caller only sees a
      degradation when parsing genuinely gave up.
- [ ] When the repair also fails, parsing yields the degraded free-text-only
      outcome rather than raising, and its query is the request itself.
- [ ] A structured-output model whose response still fails validation takes the
      same path: one retry, then degrade.
- [ ] Tests stub the model for both failing sequences, invalid then valid on the
      retry and invalid twice, and for the repair being requested exactly once.
      No test requires a live Ollama.
- [ ] Build and lint pass.

**Notes:** Spec 06 ties the retry to models without structured output, but a
structured-output model that still returns something invalid takes the same path
rather than degrading on its first failure, so there is a single failure path to
reason about and a capable model that fumbles gets the same second chance. The
repair carries the validation error, which is why the error is formatted rather
than reduced to a boolean: the model has to be able to see what it got wrong.
The retry count is one by design; a loop that keeps asking would spend a turn's
latency on a model that is not going to comply.
