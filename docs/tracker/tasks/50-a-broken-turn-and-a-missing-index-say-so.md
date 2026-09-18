# 50 - A broken turn and a missing index say so

**What to build:** A turn whose model call fails shows the failure and keeps the
question rather than a blank or half-finished answer; and a server started
against a data directory with no index refuses to start and names the command
that would build one.

**Blocked by:** 47 - A request answers end to end; 46 - The stack runs under the
suite's control.

**Status:** Resolved (2026-09-18)

- [x] A request the fake is written to fail on shows the failure in the app and
      leaves the question with no reply.
- [x] The failure is keyed to that request's own words, so it cannot affect any
      other test.
- [x] The built server started against an empty data directory exits non-zero and
      names the populate command, asserted at the process level.
- [x] The tests pass on chromium, firefox, and webkit.
- [x] Typecheck, lint, formatting, the dependency rules, and the unused-code
      report stay green.

**Notes:** The two failure paths are different seams: one crosses the socket and
lands in the interface, the other is a boot guard asserted on the process. Keep
the fake's failure keyed by request content, never a global switch, so the suite
stays safe to run in parallel.

**Outcome:** One spec covers both seams. The first is the socket: a request
carrying the fake's failure word makes the answer stage give way with a real 500,
and the app says so in its alert, keeps the question, and shows no reply and no
cards, because the half-written answer is dropped rather than stored. The
failure sits at the answer call on purpose, since that is the only model call a
turn can lose and still have stored the question, and it is keyed to the
request's own words rather than a switch, so it cannot reach a test running
beside it. The second is the boot guard asserted on the built process: started
against an empty data directory it exits non-zero and prints the message naming
`pnpm -F @ygo-assistant/server db:populate`, which the test reads off its output.
The suite is now twenty-seven tests across the three engines, and typecheck, 445
vitest tests, lint, formatting, the dependency rules over 204 modules and 549
dependencies, and the unused-code report at its baseline all pass.
