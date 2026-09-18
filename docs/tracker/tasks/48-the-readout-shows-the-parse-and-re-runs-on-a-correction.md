# 48 - The readout shows the parse and re-runs on a correction

**What to build:** The readout above the request field shows the filters the turn
searched with; the player corrects one and the next turn is searched with the
corrected filters instead of the request being parsed again; and the player can
add a filter the request never named.

**Blocked by:** 47 - A request answers end to end.

**Status:** Resolved (2026-09-18)

- [x] The filters the fake's parse returned are shown in the readout as
      sentences.
- [x] Correcting a fact re-runs the turn with the edited filters, and the search
      the server echoes is the edited one rather than a re-parse.
- [x] A filter can be added from the fields the domain supports, within the
      values and bounds it allows.
- [x] The test passes on chromium, firefox, and webkit, and asserts the
      readout's text and controls.
- [x] Typecheck, lint, formatting, the dependency rules, and the unused-code
      report stay green.

**Notes:** This journey exercises the override path from the client through the
request body to the server, which no in-process test covers end to end.

**Outcome:** Two specs drive the readout through the built stack. The first
corrects a fact: the parsed Type is normal monster becomes Type is spell card,
and the next turn, sent with the same words, leaves the readout saying the
corrected thing once the server has echoed the search, so a re-parse would have
brought the original fact back and failed the test. The second adds a filter the
request never named: the editor opens on a level and is shown bounded at 1 to 12,
a race is chosen instead, and it joins the parsed filter; the next turn's echo
keeps both facts. The correction and the added value are ones the fake's parse
would never produce, which is what makes the echo the proof. Two things the runs
taught: the empty state's example requests include ones with the word send in
them, so the Send control is matched exactly, and a race the parse already
excludes can empty the pool and leave no answer to wait on, so the added race is
one that keeps a card. The suite is now twelve tests across the three engines,
and typecheck, 445 vitest tests, lint, formatting, the dependency rules over 204
modules and 549 dependencies, and the unused-code report at its baseline all
pass.
