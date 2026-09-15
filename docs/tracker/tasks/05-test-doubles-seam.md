# 05 - Reusable test doubles for the composition-root seam

**What to build:** A fake Ollama client and a temporary data-directory helper
that later features reuse, proving the composition root can be swapped in tests.
From a developer's perspective: integration tests construct the server with
canned Ollama behaviour and an isolated data directory, with no real Ollama and
no shared state between tests.

**Blocked by:** 04 - Server composition root, health route, and error boundary.

**Status:** Resolved (2026-09-15)

- [x] A fake Ollama client implements the injected interface and returns canned
      model lists, embeddings, and chat streams.
- [x] A helper creates and tears down an isolated temporary data directory per
      test.
- [x] An integration test constructs the server through the factory with both
      doubles in place.
- [x] The doubles live in a shared test-support location, not inside a feature.
- [x] Build and lint pass.
