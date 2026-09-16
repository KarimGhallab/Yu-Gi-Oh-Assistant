# 24 - JSON-mode parsing with a single repair retry

**What to build:** The same parsing on a model that cannot be constrained by a
schema. From a player's perspective: a small local model still understands the
request, so a heavy model is not required, and a model that fumbles the format
costs one extra attempt rather than the whole search. From a developer's
perspective: a defined fallback that asks for JSON only, validates what comes
back, repairs exactly once using the validation error, and degrades to free text
when even that fails.

**Blocked by:** 23 - Parse a prompt into filters with structured output.

**Status:** Resolved (2026-09-16)

- [x] A model that does not support structured output is prompted for JSON only,
      and the parse request carries no format constraint.
- [x] A response that fails validation triggers exactly one repair retry, and the
      retry tells the model what failed validation.
- [x] The retry's response is validated like the first, and a valid retry
      produces the parse result a model that answered correctly the first time
      would have produced.
- [x] A repaired parse is not reported as degraded, so the caller only sees a
      degradation when parsing genuinely gave up.
- [x] When the repair also fails, parsing yields the degraded free-text-only
      outcome rather than raising, and its query is the request itself.
- [x] A structured-output model whose response still fails validation takes the
      same path: one retry, then degrade.
- [x] Tests stub the model for both failing sequences, invalid then valid on the
      retry and invalid twice, and for the repair being requested exactly once.
      No test requires a live Ollama.
- [x] Build and lint pass.

**Notes:** Spec 06 ties the retry to models without structured output, but a
structured-output model that still returns something invalid takes the same path
rather than degrading on its first failure, so there is a single failure path to
reason about and a capable model that fumbles gets the same second chance. The
repair carries the validation error, which is why the error is formatted rather
than reduced to a boolean: the model has to be able to see what it got wrong.
The retry count is one by design; a loop that keeps asking would spend a turn's
latency on a model that is not going to comply.

**Outcome:** A first answer that does not validate now earns one repair, and the
conversation it continues carries the rejected answer as an assistant turn
followed by the validator's own complaint, so the model is shown what it said and
what was wrong with the paths and values it used. An answer that was not JSON at
all has no validator detail worth quoting and is named plainly instead, which also
keeps an answer of `null` from being mistaken for unparseable JSON. The repair is
offered to every model, re-sending `format` when the model supports structured
output and the same temperature of 0 either way, and the second answer is
validated exactly like the first.

The asymmetry between the two attempts is deliberate and pinned by a test on each
side: a first attempt that cannot reach the model escapes, because without it
there is no parse to degrade from, while the repair never does, because the turn
is already answerable from the request alone. A repair that fails for any reason,
a bad answer or a dead model, therefore leaves a degraded free-text search rather
than an error. The validation error that ticket 23 discarded is what the repair
now quotes.

Live, against the server in `apps/server/.env`: `llama3.1:8B` still parses in
JSON mode, so the retry costs nothing when the first answer is good, and
`jobautomation/OpenEuroLLM-French:latest` in JSON mode took 116 s and came back
degraded, which is the first answer and the repair both failing on a model that
cannot hold the format. A repair that succeeds is covered by the stubbed tests,
not by a live run, since forcing a model to fail once and then comply is not
something a smoke test can ask for.

Two things are known and left alone. The first answer becomes an empty assistant
turn when the model answered with nothing, which Ollama accepts, and stripping a
Markdown code fence before parsing is not done, so a small model that fences its
JSON is asked again rather than understood; that is worth its own decision if
small models turn out to fence often. And the repair is invisible in the parse
result, so feature 07 has one opaque parsing phase and cannot show that a retry is
underway while it lasts.
