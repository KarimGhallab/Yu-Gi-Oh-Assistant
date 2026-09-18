# 10 - Local run, CI, and documentation

- **Status:** `ready-for-agent`
- **Kind:** spec
- **Blocked by:** 01 (CI); 07 (runbook)
- **Source:** architecture grilling, 2026-09-15

## Problem Statement

The app runs on the developer's machine, but a stranger cloning the public
repository cannot run it: there is no runbook, no environment template, no
bootstrap for the models and card data, and no containers. Nothing verifies the
code on push, and the architecture decisions are not recorded, so the reasoning
is lost and the repo underdelivers as portfolio proof.

## Solution

Make the repository runnable end to end and keep it green: a README runbook, a
committed `.env.example`, a documented populate and model-pull step, optional
containers, GitHub Actions CI for lint, typecheck, and tests, and the product and
architecture docs with their ADRs.

## User Stories

1. As a developer, I want a runbook, so that I can clone and run the app.
2. As a developer, I want the exact model pull commands documented, so that
   setup does not guess.
3. As a developer, I want an environment template, so that I know every variable.
4. As a developer, I want a one-command populate step documented, so that the
   card data is installable.
5. As a developer, I want optional containers, so that I can run it isolated.
6. As a developer, I want CI on every push and pull request, so that breakage is
   caught.
7. As a developer, I want CI to need neither Ollama nor the internet, so that it
   is fast and stable.
8. As a developer, I want the product intent documented, so that scope decisions
   have a reference.
9. As a developer, I want the architecture documented, so that new code follows
   the intended boundaries.
10. As a developer, I want the decisions recorded as ADRs, so that future work
    inherits the reasoning.
11. As a developer, I want the docs and tracker conventions to match the
    reference layout, so that I can work consistently across projects.

## Implementation Decisions

- README runbook covers: prerequisites (Node 26.5.0, pnpm 11.20.0, Ollama), the
  `ollama pull` commands for the configured chat and embedding models, copying
  `.env.example`, running `db:populate`, and `pnpm dev` / `pnpm build` /
  `pnpm start`.
- `.env.example` documents every configuration variable with its default.
- Optional containers: a `Containerfile` per service and a `compose.yaml`, per
  the deployment guidelines. Ollama stays on the host, reached via
  `host.containers.internal`. Primary run path remains pnpm scripts.
- CI: GitHub Actions running lint, typecheck, unit, and integration tests with
  the stubbed Ollama. No model downloads, no network. The end-to-end suite, its
  browser engines, the reusable workflows, and the gate the pipeline ends on are
  spec 11's.
- Docs authored here: `docs/PRODUCT.md` (intent, single user, local-only,
  portfolio link, constraints) and `docs/ARCHITECTURE.md` (component map, data
  flow, layer boundaries).
- ADRs, one per decision: 0001 monorepo stack; 0002 two-store split (LanceDB
  index, SQLite app state); 0003 composed-document multilingual embeddings; 0004
  two-stage pipeline with structured outputs; 0005 server-persisted
  conversations with an SSE turn stream; 0006 UI-driven model selection with a
  structured-output fallback; 0007 filter schema and retrieval strategy; 0008
  testing strategy with a stubbed Ollama; 0009 logger package and cross-cutting
  conventions.
- The tracker conventions and label vocabulary already landed under `docs/` and
  `docs/tracker/`.

## Testing Decisions

- Good tests assert external behavior; CI is the enforcement surface, not a new
  test type.
- CI runs: lint, typecheck, package unit tests, and server integration tests
  with the stubbed Ollama. It must pass on a clean checkout with no Ollama and
  no network.
- End-to-end coverage, its browser engines, and its fake Ollama server are spec
  11's; this spec's CI runs the vitest suites only.
- Prior art: the CI workflow is new; the test commands come from the earlier
  features.

## Out of Scope

- Public hosting or a live demo URL.
- Container orchestration for production, Quadlet units, or the Pangolin edge.
- Running real Ollama in CI.
- Release automation and publishing.

## Further Notes

- The repo is public and linked from the portfolio; the runbook is the first
  thing a visitor reads, so it should stay short and concrete.
- Watch the repository for the original prototype; do not copy its
  documentation, which is stale.
