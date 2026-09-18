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

**Status:** ready-for-agent

- [ ] Verification (lint, typecheck, and the unit and integration suites) lives
      in its own reusable workflow.
- [ ] The end-to-end suite lives in its own reusable workflow, runs chromium,
      firefox, and webkit as a matrix on separate runners, installs only the
      engine each leg needs, builds the app, runs the suite, and uploads traces
      and screenshots when a leg fails.
- [ ] The end-to-end workflow can be run on demand from the Actions tab as well
      as called.
- [ ] The pipeline workflow triggers on a pull request, calls both reusable
      workflows, and does not run the end-to-end legs until verification passed.
- [ ] The final job is named `Pipeline successful`, needs the others, runs
      regardless of their outcome, and fails when any needed result is a
      failure, a cancellation, or a skip.
- [ ] Lint, typecheck, and the suite pass on a clean checkout with no network, no
      Ollama, and no card dump.
- [ ] The repository gates stay green.

**Notes:** The gate's name is the required status check the maintainer sets in
branch protection; a manual dispatch of the end-to-end workflow deliberately
bypasses it. The client reads its API base from a build-time variable, so the
pipeline builds it for the port the harness serves.
