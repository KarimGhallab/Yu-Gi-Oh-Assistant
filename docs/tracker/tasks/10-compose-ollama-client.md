# 10 - Compose the real Ollama client into the server

**What to build:** The running server uses the real Ollama client instead of the
temporary placeholder, resolved from the validated configuration, so embedding
calls can target a separate host when one is configured. From a developer's
perspective: the server boots, the health route still responds, and a
server-level test proves the wiring by driving model listing, embedding, and
chat through the injected client against a fake HTTP Ollama.

**Blocked by:** 08 - Ollama client: batched embeddings; 09 - Ollama client:
streamed chat completions.

**Status:** ready-for-agent

- [ ] The temporary placeholder client is removed and the composition root
      constructs the real client from the validated configuration.
- [ ] The client targets the base URL, and embedding operations use the embedding
      override when it is set.
- [ ] A test drives model listing, embedding, and chat through the injected
      client against a fake HTTP Ollama bound to the fake server's address.
- [ ] `GET /health` still responds and `pnpm dev` boots.
- [ ] Build, lint, and the dependency-cruiser layering run pass.
