# 09 - Ollama client: streamed chat completions

**What to build:** A caller starts a chat completion and consumes the answer as a
stream of content chunks ending in a done marker, so the UI can render tokens as
they arrive. A JSON schema, when supplied, is forwarded to constrain the output
to the structured-output format, and the requested temperature is honoured. From
a developer's perspective: an unknown model or a malformed stream fails as a
typed error instead of a broken partial answer.

**Blocked by:** 07 - Ollama client: typed boundary and model listing.

**Status:** ready-for-agent

- [ ] A chat request streams the completion, yielding a chunk per message as it
      arrives and a final done chunk.
- [ ] An optional JSON schema is forwarded as the structured-output format and
      the temperature is forwarded; the model is taken from the request.
- [ ] A stream line that fails validation yields the typed invalid-response
      error; an unknown model yields the typed unknown-model error.
- [ ] Tests run the real client against an in-process fake HTTP server that emits
      a chunked stream; no test needs a running Ollama or external network.
- [ ] Build and lint pass.
