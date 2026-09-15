# 08 - Ollama client: batched embeddings

**What to build:** A caller hands the client a batch of texts and receives one
embedding vector per text at the configured dimensions, produced by a single
request to the embedding endpoint, which may point at a different host than the
chat endpoint. From a developer's perspective: ingestion can embed many cards in
one call instead of one request per card, and a malformed or wrong-shaped
response fails loudly rather than reaching the index.

**Blocked by:** 07 - Ollama client: typed boundary and model listing.

**Status:** ready-for-agent

- [ ] A batch of input texts is sent as one request to the configured embedding
      endpoint, which may differ from the base URL.
- [ ] One vector per input is returned, each of the configured dimensions, passed
      through exactly as the server produced it (no re-normalization).
- [ ] An unknown embedding model yields the typed unknown-model error; a
      malformed or wrong-shaped response yields the typed invalid-response error.
- [ ] Tests run the real client against an in-process fake HTTP server; no test
      needs a running Ollama or external network.
- [ ] Build and lint pass.
