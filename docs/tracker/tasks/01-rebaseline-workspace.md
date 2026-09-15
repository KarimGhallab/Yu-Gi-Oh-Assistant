# 01 - Rebaseline the workspace and scaffold the packages

**What to build:** The monorepo is renamed and restructured to the product
layout, and the standard commands succeed with the target layering enforced.
From a developer's perspective: clone, install, build, lint, and the dependency
validation all pass; the demo packages are gone; empty packages for the product
exist and are wired into the workspace.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-15)

- [x] The template demo packages are removed and the retained utility package
      stays.
- [x] Every workspace package is named under the `@ygo-assistant/*` scope.
- [x] Skeleton packages exist for the server app, the web app, and the cards,
      db, rag, ollama, contracts, and logger packages.
- [x] The dependency validation (the tsconfig paths check and the
      dependency-cruiser run) passes with the agreed layering rules in place.
- [x] Install, build, and lint all pass on a clean checkout.
- [x] ESM is configured consistently across every package, with no CommonJS
      output.
