# 37 - The installed models can be listed

**What to build:** The API answers with the models the configured Ollama
instance has installed, each carrying whether it supports structured output. A
picker is only possible once this exists: only models that are really there can
be offered, and a model that cannot produce the structured filters a turn relies
on can be told apart before it is chosen. An Ollama that cannot be reached is
refused with a clear message rather than surfacing as an internal error.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-17)

- [x] The listing names every model the configured instance reports, with its
      structured-output capability.
- [x] The shape is shared through the contracts package, so a client validates
      what it reads.
- [x] An unreachable Ollama is refused with a clear message rather than answered
      as an internal error.
- [x] An integration test covers the route over the server seam, including the
      refusal.
- [x] Build and lint pass.

**Notes:** This is the first thing this spec needs, because there is no models
endpoint at all and both the picker and its tests wait on one. The data is
already in hand: the Ollama client lists models with their capabilities, and a
turn already asks that listing to check the model it was given. Open question
for whoever builds it: an installation also holds models that cannot hold a
conversation, an embedding model among them, so the listing should carry enough
for a client to tell those apart rather than leaving a picker to offer one that
cannot answer.

**Outcome:** The API has a model surface now: one read of the configured
instance, answering with every model it has installed and what each of those can
do. Nothing is remembered here, because what is installed belongs to the machine
Ollama runs on and a remembered answer would be wrong the moment a model is
pulled or removed.

The open question is answered by carrying two facts instead of one. The model
domain gained the completion capability, which is what Ollama actually reports,
and the structured-output flag stays as the application's own answer for the
parsing stage. They follow from the same reported capability today, and the
client code says so in one commented line rather than pretending they are
independent: Ollama reports no capability for structured output, and a model
that can complete is the one that accepts a format. That is what lets a chooser
leave out a model that cannot answer at all without also having to understand
Ollama's vocabulary.

The wire shape is a contract like the others, so the client validates the
listing it reads rather than trusting it, and it refuses a listing that does not
say what a model can do.

The refusal comes from the error boundary that was already there: the Ollama
client raises its unreachable error, the boundary answers 503 with the message
naming the URL and the fix, and logs it as a request that failed rather than an
unhandled error. The integration test covers both the listing and the refusal
over the server seam.

Verified live against the real instance, which has six models installed: all six
came back, and the embedding model was the only one flagged as unable to answer.
Pointed at a dead address, the route answered 503 with the message and logged a
request failure rather than an unhandled error. The type check, 344 tests across
32 files, lint, build, formatting, the dependency rules over 145 modules and 373
dependencies, and the unused-code report at exactly its previous findings all
pass.

Recorded for the picker and for later: a turn still only requires the model it
is given to be installed, so a model that cannot complete can be set on a
conversation through the API and the turn would give way during the stream
rather than being refused up front. Nothing a player can do offers one, since
the picker is where the choice is made, but tightening that check is worth a
ticket of its own if the API is ever reachable by anything but the client.
