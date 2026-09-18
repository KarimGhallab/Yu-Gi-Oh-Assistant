# 11 - End-to-end tests

- **Status:** Resolved (2026-09-18)
- **Kind:** spec
- **Blocked by:** 09
- **Source:** implementation planning, 2026-09-18

## Problem Statement

The unit and integration suites fake the Ollama client inside the test process,
so nothing exercises the real `OllamaClient` over a socket, the real Hono server,
a real LanceDB index, the real SQLite store, and the built React client
together. The cross-process wiring, the contracts on the wire, the CORS between
the two deployments, and the SSE stream as a browser receives it are all
unverified, which is where a break stays invisible until a player hits it.

## Solution

A Playwright suite that drives the built client against the built server, a real
card index seeded from fixture cards, the real conversation store, and a fake
Ollama server over HTTP. It runs on chromium, firefox, and webkit, locally and in
CI. The fake Ollama is the only fake: everything else is the code that ships.
CI is rearranged into reusable workflows with one final gate job whose name is
the status check a pull request is blocked on.

## User Stories

1. As a developer, I want one command that starts the stack and runs the suite,
   so that I can verify the whole app before merging.
2. As a developer, I want the suite to need no network, no Ollama, and no real
   card dump, so that it runs anywhere and stays fast.
3. As a developer, I want the suite to run on chromium, firefox, and webkit, so
   that an engine-specific break is caught.
4. As a player, I want a request to produce a streamed answer and suggested
   cards, so that the product's core promise is proven end to end.
5. As a player, I want the readout to show the parse, a correction to re-run the
   turn, and a filter to be addable, so that the transparent controls are proven
   across the stack.
6. As a player, I want the language and model to switch and the conversation to
   reopen as I left it, so that the settings survive a real store.
7. As a developer, I want a failing turn and a missing index to surface their
   message, so that a failure is visible rather than a blank screen.
8. As a developer, I want a trace and a screenshot when a run fails, so that a
   CI failure can be diagnosed without reproducing it.
9. As a developer, I want the suite in its own reusable workflow, so that the
   pipeline stays legible and other workflows can call it.
10. As a developer, I want one green status check that only passes when every
    job passed, so that a pull request cannot merge on a partial run.

## Implementation Decisions

- **Suite home.** The suite is its own workspace package, `@ygo-assistant/e2e`,
  living under `e2e/` at the repository root with `playwright.config.ts` beside
  it. It owns the imports it needs, the cards, db, and ollama packages among
  them, and its own devDependencies, so the root stays free of tooling it does
  not run. A dedicated `e2e/tsconfig.json`, referenced from the root
  `tsconfig.json`, keeps `tsc -b` covering it. The root scripts are `test:e2e`,
  `test:e2e:ui`, `build:e2e`, and `e2e:install`, each delegating to the package.
  The config declares three projects, `chromium`, `firefox`, and `webkit`, and
  locally runs them and their files together on Playwright's own worker count;
  a CI job, where the matrix already parallelizes the engines, runs one worker.
- **Engine-agnostic by contract.** Assertions use roles, text, and the DOM only.
  The card's grow-from-tile is the View Transitions API, which only chromium
  implements; `runViewTransition` falls back to an instant update, so the suite
  asserts the dialog and never the movement. Computed colors and
  `:focus-visible` styling are engine-specific and are never asserted.
- **Built, decoupled app.** The suite drives the built artifacts: `pnpm build`
  with `VITE_API_BASE_URL=http://127.0.0.1:3210` for the client, served from
  `apps/web/dist`, and `node apps/server/dist/main.js` with
  `CORS_ORIGIN=http://127.0.0.1:4173`. Ports are fixed because the client's API
  base is baked in at build time, and the pair exercises the CORS path that
  ticket 11 created rather than a dev-server proxy.
- **The harness.** A root `e2e/stack.ts` owns the whole stack: it starts the
  fake Ollama, seeds the index, starts the built server, serves the built
  client, and writes the base URL the config waits on. A `globalTeardown`
  removes the temporary data directory. The harness imports packages only; it
  runs `apps/` as processes, because the `no-apps-import` dependency rule
  forbids the other direction.
- **The index, offline.** `e2e/fixtures/cards.ts` authors a handful of cards: an
  archetype monster, a Spell, a Trap, a pair that exists in only one language
  each, and cards with the levels and stats the filters exercise. The harness
  seeds them with `buildCardIndex` through a real `OllamaClient` pointed at the
  fake, so the ingestion embed path runs over HTTP and no YGOPRODeck request is
  made. The embedding model and dimensions match the server's configuration, so
  `ensureIndexMatchesConfig` passes. `DATA_DIR`, `LOG_DIR`, and the SQLite file
  all live under one temporary directory per run.
- **The fake Ollama.** `FakeOllamaServer` is not exported today, so the ollama
  package gains a `testing` subpath export (a `testing/index.ts` barrel and the
  matching `exports` entry). Its handler answers `GET /api/tags`,
  `POST /api/show` with a completion capability, `POST /api/embed`, and
  `POST /api/chat` as newline-delimited JSON. The chat branch reads the request
  body: a `format` whose properties carry `keep` is the filter call, one whose
  properties carry `filters` and `query` is the parse call, and no `format` at
  all is the answer, streamed. The embedding handler returns deterministic
  vectors from a small text-to-vector map, chosen so the card a test expects
  ranks first. A failure fixture is keyed by the request's own words, never by a
  global switch, so it cannot leak into a parallel test.
- **Determinism.** Fixture cards, the vector map, and scripted parse, filter,
  and answer responses make ranking and prose stable, and the suite is
  parallel-safe by construction: the fake keys every answer off the request, each
  test runs in its own conversation and browser context, and the index is
  read-only after seeding. Fixed ports and one temporary data directory per run
  keep separate runs from stepping on each other.
- **CI as reusable workflows.** `.github/workflows/verify.yml` holds lint,
  typecheck, and the vitest suites behind `on: workflow_call`.
  `.github/workflows/e2e.yml` holds the end-to-end run behind `workflow_call`
  and `workflow_dispatch`: a `fail-fast: false` matrix over chromium, firefox,
  and webkit, where each leg installs only its own browser, caches
  `~/.cache/ms-playwright`, builds, runs `pnpm test:e2e --project=<browser>`,
  and uploads the traces and screenshots when it fails.
  `.github/workflows/ci.yml` becomes the orchestrator: it triggers on a pull
  request, calls `verify`, calls `e2e` with `needs: verify`, and ends with the
  gate.
- **The gate.** The final job is named `Pipeline successful`. It needs both
  jobs, runs with `if: always()`, and exits non-zero when any needed result is
  `failure`, `cancelled`, or `skipped`, so a missing leg cannot pass as green.
  It is the status check branch protection marks required. A manual
  `workflow_dispatch` run of the e2e workflow bypasses the gate by design.
- **Repository hygiene.** `.gitignore` gains `test-results/`,
  `playwright-report/`, and `blob-report/`. dependency-cruiser and knip are told
  about `playwright.config.ts` and the harness so the gates stay green, and the
  new `e2e/` files pass eslint and prettier like the rest of the repository.

## Testing Decisions

- The suite asserts user-visible behavior through the real stack and never an
  internal. It owns four journeys: the core turn, from a request to a streamed
  answer and its cards; the filters, where the readout shows the parse, a
  correction re-runs the turn, and a filter can be added; the settings, where
  switching language changes the cards, picking a model persists, and reopening
  the conversation restores history and settings; and the failure paths, where
  the fake failing an answer shows the alert and keeps the question, and a
  server booted against an empty data directory exits with the runbook message,
  asserted at the process level.
- The suite is the second line, not the first: the vitest suites keep owning
  behavior at the unit and integration seams, and the keyboard-only walkthrough
  stays with ticket 35. Playwright covers only what crosses a process, a socket,
  or a browser.
- Traces and screenshots on failure are the debugging surface, retained as CI
  artifacts.
- Tests are engine-agnostic: a test that would pass on chromium and fail
  elsewhere because of a rendering difference is a bad test here, and the
  journey it meant to prove belongs in the vitest suites.

## Out of Scope

- Real Ollama, the internet, and the real YGOPRODeck dump.
- Visual regression, pixel comparison, and computed-style assertions.
- Mobile viewports and touch gestures; the suite runs desktop engines.
- Containerized runs and production deployment, which spec 10 owns.
- Re-testing unit-level behavior that the vitest suites already cover.

## Further Notes

- `@playwright/test`, the three browser engines, and webkit's Linux system
  dependencies are installed by the maintainer, not by an agent; the README
  and the CI workflow name the commands.
- Spec 10 keeps the runbook, the environment template, the containers, and the
  architecture docs, and stops owning the end-to-end suite that this spec
  builds.
- The suite's determinism rests on the fake, so a fixture's answer and the order
  its cards rank in are the two things to keep honest when the pipeline changes.
