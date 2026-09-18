# 50 - A broken turn and a missing index say so

**What to build:** A turn whose model call fails shows the failure and keeps the
question rather than a blank or half-finished answer; and a server started
against a data directory with no index refuses to start and names the command
that would build one.

**Blocked by:** 47 - A request answers end to end; 46 - The stack runs under the
suite's control.

**Status:** ready-for-agent

- [ ] A request the fake is written to fail on shows the failure in the app and
      leaves the question with no reply.
- [ ] The failure is keyed to that request's own words, so it cannot affect any
      other test.
- [ ] The built server started against an empty data directory exits non-zero and
      names the populate command, asserted at the process level.
- [ ] The tests pass on chromium, firefox, and webkit.
- [ ] Typecheck, lint, formatting, the dependency rules, and the unused-code
      report stay green.

**Notes:** The two failure paths are different seams: one crosses the socket and
lands in the interface, the other is a boot guard asserted on the process. Keep
the fake's failure keyed by request content, never a global switch, so the suite
stays safe to run in parallel.
