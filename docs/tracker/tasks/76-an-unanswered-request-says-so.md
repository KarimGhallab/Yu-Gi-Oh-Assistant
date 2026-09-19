# 76 - An unanswered request says so and can be asked again

**What to build:** A conversation whose last stored message is a request with no
reply shows, beside that request, that the turn did not finish and a control
that asks it again. The readout above the composer stops presenting the previous
turn's search as if it belonged to the unanswered request. Asking again sends
the same request text with the conversation's settings, and the filters that
request was searched with as the correction, so the same search is run rather
than the request being read a second time.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] A conversation whose last stored message is a player request shows, beside
      that request, that the turn did not finish and a control that asks it
      again.
- [x] A question that was refused before the turn started shows the same way.
- [x] While that request is unanswered and no turn is running, the composer does
      not render the previous turn's search as the readout.
- [x] Asking an unanswered request again sends the same request text with the
      conversation's settings.
- [x] When the stored request carries the search it ran with, asking again sends
      those filters as the correction.
- [x] The notice and the retry are reachable by keyboard and announced as a
      state.
- [x] Tests at the client seam prove the state, the suppressed readout, and what
      the retry sends.

**Outcome:** The conversation derives an unanswered request from what it
already holds. When the last stored message is a player request and no turn is
running, or when a question the server never confirmed is still only on screen,
the request carries a line saying it was never answered and a text-button retry.
Asking again sends the stored request text with the conversation's settings, and
the search that request ran with when its turn reported one, kept on the turn;
when there is no search to reuse, the retry sends none so the request is read
again. The readout no longer shows the previous turn's search as if it belonged
to the unanswered request, and a request whose own turn did report a search
keeps that readout, because it is the search asking again will run. The retry is
a `<button>`, reached by Tab, and the line reads as part of the turn; it is not a
second live region, because the composer's status line is the one region that
announces a turn.

Tests at the client seam cover the stored unanswered state with the suppressed
readout, retrying with the same words, retrying on the search a dead turn ran
with, and the refused-before-start case activated from the keyboard. Full gates
are green: 61 files and 549 tests, dependency-cruiser 220 modules and no
violations, knip unchanged, typecheck, lint, prettier, syncpack, the path check,
and the build all pass. `DESIGN.md` and `.impeccable/design.json` record the
unanswered-request line and its quiet retry, reusing the existing colors and
type through two new component tokens.
