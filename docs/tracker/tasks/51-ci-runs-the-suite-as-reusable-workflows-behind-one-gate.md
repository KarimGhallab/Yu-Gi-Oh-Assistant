# 51 - CI runs the suite as reusable workflows behind one gate

**What to build:** The pipeline is split into reusable workflows and ends in a
single `Pipeline successful` check: one reusable workflow verifies lint,
typecheck, and the vitest suites; another runs the three-engine end-to-end suite
as a matrix and can also be dispatched by hand; the pipeline workflow calls both
and finishes with the gate that fails when any job did not pass, which branch
protection can then require.

**Blocked by:** 48 - The readout shows the parse and re-runs on a correction; 49

- The language and the model persist, and the conversation reopens; 50 - A broken
  turn and a missing index say so.

**Status:** Resolved (2026-09-18)

- [x] Verification (lint, typecheck, and the dependency audit) lives in its own
      reusable workflow.
- [x] The unit and integration suites live in their own reusable workflow, which
      runs after verification and before the end-to-end legs.
- [x] Verification audits the installed dependencies before the tests and fails
      on a known high or critical vulnerability.
- [x] The end-to-end suite lives in its own reusable workflow, runs chromium,
      firefox, and webkit as a matrix on separate runners, installs only the
      engine each leg needs, builds the app, runs the suite, and uploads traces
      and screenshots when a leg fails.
- [x] The end-to-end workflow can be run on demand from the Actions tab as well
      as called.
- [x] The pipeline workflow triggers on a pull request, calls the three reusable
      workflows in order, and does not run a workflow until the one before it
      passed.
- [x] The final job is named `Pipeline successful`, needs the others, runs
      regardless of their outcome, and fails when any needed result is a
      failure, a cancellation, or a skip.
- [x] Lint, typecheck, and the suite pass on a clean checkout with no network, no
      Ollama, and no card dump.
- [x] The repository gates stay green.

**Notes:** The gate's name is the required status check the maintainer sets in
branch protection; a manual dispatch of the end-to-end workflow deliberately
bypasses it. The client reads its API base from a build-time variable, so the
pipeline builds it for the port the harness serves. The audit step is the one
place a job reaches the registry, because that is what an audit is.

**Outcome:** The pipeline is four workflows, chained verify, unit, end to end,
then the gate. `verify.yml` is callable and runs the install, the dependency
audit, a non-fixing lint, and the typecheck. `unit.yml` is callable and runs the
vitest suites. `e2e.yml` is callable and dispatchable: it fans the three engines
across a fail-fast-off matrix, caches the Playwright engines under the lockfile's
hash, installs only the engine each leg needs, builds the app for the port the
harness serves, runs that engine's project, and keeps the traces and screenshots
of a failed leg. `ci.yml` triggers on a pull request, calls the three in order, so
the suite waits behind the checks and the engines wait behind the suite, and ends
in `Pipeline successful`, which needs them all, runs whatever their outcome, and
fails on a failure, a cancellation, or a skip, so branch protection can require
that one name. A
non-fixing `lint:check` was added because the lint script fixes and would not
fail. The pre-push hook now audits the installed dependencies before it runs the
suite, under `set -e`, so a known vulnerability stops the push rather than being
printed on the way through; `pnpm audit` is used because the repository locks with
pnpm and `npm audit` needs an npm lockfile. That audit is the one thing not green
today: it reports two high advisories in `sharp@0.33.5`, reached through
`@lancedb/lancedb > @huggingface/transformers`, and sharp is the dependency the
repository already declines to build. The check is doing its job: the pipeline and
the hook will stay red until that chain is upgraded or the advisory is dealt with.
The workflows were lint-validated rather than run, since Actions cannot run here,
and the local gates, typecheck, 445 vitest tests, the e2e suite, lint, formatting,
the dependency rules, and the unused-code report, all pass.
