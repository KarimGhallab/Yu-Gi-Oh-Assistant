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

**Status:** Resolved (2026-09-16)

- [x] Parsing a request against a model that supports structured output returns
      that model's filters and free-text query as the parsed request; either
      part may be absent, and an empty result is valid and means pure semantic
      search.
- [x] The parse request carries a JSON schema derived from the card filter
      schema and a temperature of 0, so the model is constrained to the
      vocabulary retrieval honors.
- [x] A field, operator, or enumerated value the schema does not allow, and a
      response that is not valid JSON, are never surfaced as filters.
- [x] The prompt's description of the filter fields, their operators, and the
      allowed values of the enumerated fields is generated from the schema, so a
      new field or operator reaches the prompt without a second edit.
- [x] A request that is only free text parses to a query with no filters, and a
      request that names only hard constraints parses to filters alone.
- [x] When parsing yields no usable result, the outcome is the request's own
      text as the free-text query, reported as a degraded outcome rather than
      raised as an error, so a vague request still retrieves something.
- [x] The parsed and degraded outcomes are distinguishable by the caller without
      inspecting the filters, so feature 07 can report a degradation.
- [x] The parser receives the model client from its caller and never talks to
      Ollama itself, so its tests stub the model and need no server.
- [x] Tests assert the parsed filters and query for a request and a stubbed
      model response: filters alone, filters with free text, and an empty result.
      They do not assert the prompt text.
- [x] Build and lint pass.

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

**Outcome:** `packages/rag` gained `parseCardRequest` plus the four pieces it is
built from: the prompt, the response schema, the JSON schema handed to the
model, and the vocabulary read out of the card filter schema. Parsing is a
function of the caller's client, model, and capability, so it is tested against
a stub and never reaches Ollama itself.

Two decisions were settled while building it. The parsed outcome always carries
a filter array, empty when the model found no constraint, and a query that is
absent when the model's answer was blank, so an empty result is one honest
shape rather than three. And the response object is strict: a model answering
under a key of its own invention is not read as a successful empty parse, which
would have searched the whole catalog while looking like a success. The price is
that a chatty extra key degrades the parse, which ticket 24's repair retry can
recover from and the free-text fallback still handles.

The vocabulary and the model's JSON schema are both derived from
`cardFiltersSchema` through `z.toJSONSchema`, then read back through a schema that
declares only the keys the prompt depends on, so a new field, operator, or
enumerated value reaches the prompt with the schema change alone. The one shape
worth knowing: an operator that fits exactly one kind of field arrives as a
`const` rather than a single-entry `enum`, which is how `linkMarkers` reaches the
prompt with `contains` alone.

Any failure ends in the degraded outcome, whose query is the caller's request
exactly as given. A client that throws, including one that dies partway through
the stream, is left to escape instead: the parse has no answer to fall back to
there, and feature 07 owns reporting a model failure as an error event. The
no-format branch for a model that cannot be constrained landed here too, since
the capability is already an input; ticket 24 is left with the retry the spec
asks for.

The wording was tuned against a live model rather than written blind. A line
telling the model to filter only on what the request names removed filters it had
invented for requests that named no such field, and it is what the prompt still
says. A few-shot example aimed at vague requests was tried and reverted: it
changed nothing measurable and shifted an unrelated answer. A bare "chaos" still
comes back with a guessed `race contains chaos`, so a request that names no
checkable field can still be constrained wrongly; that is a model behaviour to
keep an eye on where the chips are editable, not something validation can catch.

Two things are known and deliberate. The validation error and the raw response
are discarded on degrade, which ticket 24 needs for its repair and is where they
should be kept. And an empty parse currently reaches the filter-only lane of
`retrieveCards`, which returns the catalog's top-K rather than a semantic
result, so feature 07 has to decide what an all-empty parse should render.
