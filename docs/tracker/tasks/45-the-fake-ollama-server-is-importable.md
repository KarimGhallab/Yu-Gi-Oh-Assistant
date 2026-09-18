# 45 - The fake Ollama server is importable

**What to build:** The HTTP fake Ollama server the ollama package already keeps
for its own tests becomes a public surface of that package, so an end-to-end
harness can start it without reaching into the package's source. From a
developer's perspective, importing the fake from a new subpath resolves from
another workspace, and the package still builds and tests green.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] The ollama package exposes a `testing` subpath whose entry exports the fake
      HTTP server and its request and response types.
- [ ] The subpath is part of the built output and resolves from another
      workspace.
- [ ] The package's own tests still pass, and the build, typecheck, lint,
      formatting, dependency rules, and unused-code report stay green.

**Notes:** A prefactor: the harness must not import the package's source
directly, so the fake has to become a public surface before anything can start
it. Keep the subpath named for what it is, so production code cannot reach the
fake by accident.
