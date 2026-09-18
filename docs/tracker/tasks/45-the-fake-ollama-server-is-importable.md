# 45 - The fake Ollama server is importable

**What to build:** The HTTP fake Ollama server the ollama package already keeps
for its own tests becomes a public surface of that package, so an end-to-end
harness can start it without reaching into the package's source. From a
developer's perspective, importing the fake from a new subpath resolves from
another workspace, and the package still builds and tests green.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] The ollama package exposes a `testing` subpath whose entry exports the fake
      HTTP server and its request and response types.
- [x] The subpath is part of the built output and resolves from another
      workspace.
- [x] The package's own tests still pass, and the build, typecheck, lint,
      formatting, dependency rules, and unused-code report stay green.

**Notes:** A prefactor: the harness must not import the package's source
directly, so the fake has to become a public surface before anything can start
it. Keep the subpath named for what it is, so production code cannot reach the
fake by accident.

**Outcome:** A `testing` barrel exports the fake HTTP server with its request,
response, and handler types, and the package publishes it as the `testing`
subpath, so a workspace can start the fake through the package's own surface
rather than a path into its source. The fake was previously kept out of the build
altogether; it is now compiled with the rest, which is what puts the subpath in
the output, and the package's own client test reads the fake through the barrel
so the entry and its consumers cannot drift. Resolution was proven from another
workspace: from `packages/test-support`, `@ygo-assistant/ollama/testing` started
the fake, answered a request over HTTP, and stopped cleanly. The type check, 445
tests across 47 files, lint, formatting, the dependency rules over 204 modules
and 549 dependencies, and the unused-code report (down a finding, at 14 lines)
all pass.
