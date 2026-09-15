# 07 - Ollama client: typed boundary and model listing

**What to build:** The real Ollama client, behind the interface the composition
root already injects, can list the models installed on the configured Ollama
server, each flagged for structured-output support so later stages can choose
their parsing strategy. From a developer's perspective: point the client at a
configured server and get back a validated model list; a missing server, a
vanished model, and a malformed response each surface as a distinguishable
typed error that names the fix. This ticket also lands the shared request,
validation, and error scaffolding the embedding and chat operations reuse.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-15)

- [x] The client is constructed from configuration (the base URL and the default
      models) and lists models, with every response validated against a schema
      before use.
- [x] Each listed model carries a structured-output flag derived from the
      capabilities the server reports for it; a model whose capabilities are
      absent is flagged as unsupported.
- [x] An unreachable server yields a typed error naming the URL and the fix; a
      model reported missing by the details call yields a typed error naming the
      pull command; a schema-invalid response yields a distinct typed error.
- [x] The shared request, validation, and error scaffolding is in place for the
      embedding and chat operations to reuse.
- [x] Tests run the real client against an in-process fake HTTP server; no test
      needs a running Ollama or external network.
- [x] Build and lint pass.
