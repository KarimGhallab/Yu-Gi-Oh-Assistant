# 78 - The home and an empty conversation keep the bench

**What to build:** The home surface and an empty conversation present the prompt
and the examples as the workbench rather than reading as a bare prompt, and the
composition is recorded in `DESIGN.md` so the direction is written down instead
of guessed per screen.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] The home surface presents the prompt and the examples as the bench's
      object and its tools.
- [x] An empty conversation keeps the same composition as the home surface.
- [x] The composition for both states is recorded in `DESIGN.md`.
- [x] A client test proves the home and empty-conversation surfaces show the
      prompt and the examples when there are no messages.
- [x] The states are verified in a browser at both a wide and a narrow width.

**Outcome:** A new `Bench` component holds the bench composition: the title and
its words, the requests that can be asked, and the prompt, in a centred column.
The examples sit above the prompt, so what can be asked is read before the field
it is typed in. The home surface passes the prompt built to start a conversation;
an empty conversation passes its composer, so the two differ only in what sending
does. The example list moved to the shared components, and the empty
conversation's notice wrapper is gone.

A conversation with nothing in it keeps its header and its messages region, so
spec 21 still owns the empty title; the bench holds the words and the tools under
whatever name the header gives it. The prompt docks on the first ask, with a view
transition opened around the update, which also covers the home surface's
handover: the bench is drawn only when the conversation is at rest, so a request
already on its way lands at the foot rather than passing through the middle.

Tests prove the home and empty-conversation surfaces show the words, the request
field, and the examples, and the existing suites stay green. The rendered
detector found only the committed sidebar width transition and the two known
false positives. `DESIGN.md` and `.impeccable/design.json` record the bench, and
the states were verified in a browser at 1440 and 390 wide.
