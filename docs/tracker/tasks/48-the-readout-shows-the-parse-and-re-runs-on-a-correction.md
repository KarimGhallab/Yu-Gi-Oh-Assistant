# 48 - The readout shows the parse and re-runs on a correction

**What to build:** The readout above the request field shows the filters the turn
searched with; the player corrects one and the next turn is searched with the
corrected filters instead of the request being parsed again; and the player can
add a filter the request never named.

**Blocked by:** 47 - A request answers end to end.

**Status:** ready-for-agent

- [ ] The filters the fake's parse returned are shown in the readout as
      sentences.
- [ ] Correcting a fact re-runs the turn with the edited filters, and the search
      the server echoes is the edited one rather than a re-parse.
- [ ] A filter can be added from the fields the domain supports, within the
      values and bounds it allows.
- [ ] The test passes on chromium, firefox, and webkit, and asserts the
      readout's text and controls.
- [ ] Typecheck, lint, formatting, the dependency rules, and the unused-code
      report stay green.

**Notes:** This journey exercises the override path from the client through the
request body to the server, which no in-process test covers end to end.
