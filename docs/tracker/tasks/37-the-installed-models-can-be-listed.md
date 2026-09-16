# 37 - The installed models can be listed

**What to build:** The API answers with the models the configured Ollama
instance has installed, each carrying whether it supports structured output. A
picker is only possible once this exists: only models that are really there can
be offered, and a model that cannot produce the structured filters a turn relies
on can be told apart before it is chosen. An Ollama that cannot be reached is
refused with a clear message rather than surfacing as an internal error.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] The listing names every model the configured instance reports, with its
      structured-output capability.
- [ ] The shape is shared through the contracts package, so a client validates
      what it reads.
- [ ] An unreachable Ollama is refused with a clear message rather than answered
      as an internal error.
- [ ] An integration test covers the route over the server seam, including the
      refusal.
- [ ] Build and lint pass.

**Notes:** This is the first thing this spec needs, because there is no models
endpoint at all and both the picker and its tests wait on one. The data is
already in hand: the Ollama client lists models with their capabilities, and a
turn already asks that listing to check the model it was given. Open question
for whoever builds it: an installation also holds models that cannot hold a
conversation, an embedding model among them, so the listing should carry enough
for a client to tell those apart rather than leaving a picker to offer one that
cannot answer.
