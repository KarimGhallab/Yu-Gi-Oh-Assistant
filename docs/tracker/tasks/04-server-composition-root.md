# 04 - Server composition root, health route, and error boundary

**What to build:** A runnable server built by an injectable factory, with a
health route and uniform error handling, bound to loopback by default. From a
developer's perspective: `pnpm dev` starts it, `GET /health` responds, a thrown
typed error becomes the right status, and the app can be constructed in tests
with replaced dependencies.

**Blocked by:** 02 - Shared logger and typed errors; 03 - Runtime configuration
with fail-fast validation.

**Status:** Resolved (2026-09-15)

- [x] The app is created by a factory taking the configuration, logger, data
      directory, and an Ollama client interface as injected dependencies, with
      no hidden singletons.
- [x] The server binds to loopback by default and logs a warning when bound to a
      non-loopback address.
- [x] `GET /health` returns a success response.
- [x] A single error middleware maps typed domain errors to their HTTP status
      and returns a safe body for unknown errors.
- [x] An integration test drives the app through its HTTP boundary and asserts
      the health response and an error mapping.
- [x] `pnpm dev` starts the server; build and lint pass.
