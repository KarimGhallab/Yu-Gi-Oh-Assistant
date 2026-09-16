# 23 - Parse a prompt into filters with structured output

**What to build:** A player's prose request becomes a validated set of card
filters and a free-text query, on a model that Ollama can constrain with a
schema. From a player's perspective: "light monsters that banish cards" reaches
retrieval as a light-attribute constraint plus the intent to banish, with no
translating by hand. From a developer's perspective: one pure function turns a
request and a model client into the parse result, with both the prompt's
vocabulary and the JSON schema generated from the card filter schema, so the
parse cannot drift from the domain.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] Parsing a request against a model that supports structured output returns
      that model's filters and free-text query as the parsed request; either
      part may be absent, and an empty result is valid and means pure semantic
      search.
- [ ] The parse request carries a JSON schema derived from the card filter
      schema and a temperature of 0, so the model is constrained to the
      vocabulary retrieval honors.
- [ ] A field, operator, or enumerated value the schema does not allow, and a
      response that is not valid JSON, are never surfaced as filters.
- [ ] The prompt's description of the filter fields, their operators, and the
      allowed values of the enumerated fields is generated from the schema, so a
      new field or operator reaches the prompt without a second edit.
- [ ] A request that is only free text parses to a query with no filters, and a
      request that names only hard constraints parses to filters alone.
- [ ] When parsing yields no usable result, the outcome is the request's own
      text as the free-text query, reported as a degraded outcome rather than
      raised as an error, so a vague request still retrieves something.
- [ ] The parsed and degraded outcomes are distinguishable by the caller without
      inspecting the filters, so feature 07 can report a degradation.
- [ ] The parser receives the model client from its caller and never talks to
      Ollama itself, so its tests stub the model and need no server.
- [ ] Tests assert the parsed filters and query for a request and a stubbed
      model response: filters alone, filters with free text, and an empty result.
      They do not assert the prompt text.
- [ ] Build and lint pass.

**Notes:** The filter vocabulary and its schema belong to the card domain
(`packages/cards`, ticket 17), and the parse result reuses them rather than
restating them; that is what keeps parsing, retrieval, and the UI on one
vocabulary. The parse result type lives beside the retrieval query in
`packages/rag` because that package may not depend on `packages/contracts`:
feature 07 composes the same filter schema into its SSE events, and a mismatch
surfaces at runtime in the response contract rather than at compile time, which
is the trade the message role shape already makes deliberately.

Whether the selected model supports structured output is an input from the
caller, not something the parser looks up, so this ticket never hard-codes a
model name; feature 07 resolves the selected model. A failed parse degrades to
the request's own text as the query, the deliberate "a degraded search beats an
error page" decision, and ticket 24 adds the retry that keeps it rare. A model
that legitimately returns no filters for a vague request is not a degradation,
which is why the two outcomes are tagged rather than inferred from the filters.
