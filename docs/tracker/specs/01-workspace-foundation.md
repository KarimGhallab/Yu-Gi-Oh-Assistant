# 01 - Workspace foundation

- **Status:** `ready-for-agent`
- **Kind:** spec
- **Blocked by:** none
- **Source:** architecture grilling, 2026-09-15

## Problem Statement

The repository is a bare Node/TypeScript monorepo template. Nothing of the
product exists: the packages are demos (`console`, `color`), the scope names a
template, there is no server, no shared contracts, no logging, no validated
configuration, and no test harness. Nothing can be run or tested.

## Solution

Rebaseline the monorepo into the product's package layout and boot a minimal
Hono server: validated configuration loaded once, structured logging, typed
error handling, a health route, and the test harness (a fake Ollama client and a
temporary data directory) that later features test through. This feature
delivers no user-facing suggestion behavior; it delivers the seam everything
else is built and tested on.

## User Stories

1. As a developer, I want the template demo packages removed and the workspace
   renamed to the product scope, so that the repo is about the product.
2. As a developer, I want a single pinned Node and pnpm version, so that the
   toolchain does not drift between machines and CI.
3. As a developer, I want the server to boot with configuration validated at
   startup, so that a bad environment fails immediately with a clear message.
4. As a developer, I want structured logs behind a small logger package, so that
   the sink can change without touching feature code.
5. As a developer, I want one error middleware that maps typed domain errors to
   HTTP status codes, so that error handling is uniform.
6. As a developer, I want the server to bind to loopback by default with an
   override, so that local data is not exposed accidentally.
7. As a developer, I want a warning when the server binds to a non-loopback
   address, so that I understand the exposure.
8. As a developer, I want a package-layering rule enforced in CI and on commit,
   so that the architecture does not decay.
9. As a developer, I want unit and integration tests that need neither Ollama
   nor the internet, so that CI is fast and deterministic.
10. As a developer, I want an injectable composition root, so that tests can
    substitute a fake Ollama client and a temporary data directory.
11. As a developer, I want a production build that serves the client from the
    same origin as the API, so that there is no CORS setup.
12. As a developer, I want a committed `.env.example`, so that the configuration
    surface is discoverable.

## Implementation Decisions

- pnpm workspaces monorepo, ESM everywhere. Node 26.5.0 and pnpm 11.20.0 pinned
  with volta, repo-wide. One root TypeScript version; drift checked by syncpack.
- Package scope is `@ygo-assistant/*`. Remove `apps/console` and
  `packages/color`; retain `packages/utils`.
- Package skeletons created here: `apps/server`, `apps/web`, `packages/cards`,
  `packages/db`, `packages/rag`, `packages/ollama`, `packages/contracts`,
  `packages/logger`.
- Layering, enforced by dependency-cruiser: `web` imports `contracts` and
  `cards` only; `server` imports `rag`/`db`/`ollama`/`logger`/`contracts`; `rag`
  imports `db`/`cards`/`ollama`/`logger`; no shared package imports another
  package's implementation; no app is imported by anything; no cycles.
- `packages/logger` wraps pino. The card domain package contains no logging.
- A single Zod-validated configuration is loaded once at boot: `HOST`, `PORT`,
  `DATA_DIR`, `OLLAMA_BASE_URL`, `OLLAMA_EMBEDDING_BASE_URL` (optional),
  `OLLAMA_CHAT_MODEL` (default `qwen3:4b`), `OLLAMA_EMBEDDING_MODEL` (default
  `qwen3-embedding:0.6b`), `OLLAMA_EMBEDDING_DIMENSIONS` (default 1024),
  `RETRIEVAL_TOP_K`, `RETRIEVAL_SHOWN`, `RETRIEVAL_MIN_SCORE`, `LOG_LEVEL`,
  `NODE_ENV`.
- The server is built by a factory that returns the Hono app with its
  dependencies injected: an Ollama client interface, a data directory path, and
  the retrieval constants. This factory is the composition root and the primary
  test seam.
- Bind loopback by default with a `HOST` override; log a warning when bound to a
  non-loopback address.
- One error middleware maps typed domain errors to HTTP status codes.
- Production is single-origin: the server serves the built client. Dev uses the
  Vite dev server with a proxy to the server.
- Build tooling: `tsc --build` with project references for packages and the
  server, `tsx` for dev, Vite for the client. No bundler for backend packages.

## Testing Decisions

- Good tests assert external behavior only: HTTP responses, persisted rows, and
  rendered output. They do not assert internal call order.
- This feature establishes the primary seam: the composition-root factory driven
  through the Hono app's `request()`, with a fake Ollama client and a temporary
  data directory.
- Tested here: config validation (valid and invalid environments), the health
  route, and the error middleware mapping a typed domain error to its status.
- A reusable fake Ollama client and a temporary-data-directory helper live in a
  test-support location shared by later feature specs.
- Prior art: none in-repo. The retained template supplies lint, format, husky,
  and dependency-cruiser wiring to build on.

## Out of Scope

- Any real Ollama call, any card data, any conversation storage, any retrieval,
  and any UI. Those are later features.
- Container packaging and CI workflows (feature 10).

## Further Notes

- This is the only feature that should touch the package manager, the tsconfig
  graph, and the dependency-cruiser rules; later features add code, not
  structure.
- `apps/web` is scaffolded but empty here; feature 08 fills it.
