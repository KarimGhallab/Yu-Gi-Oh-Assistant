# 47 - A request answers end to end

**What to build:** A player types a request in the real app, watches the answer
stream in, and sees the cards the answer was written from, each with the way to
its source. From a developer's perspective, the whole pipeline is proven across
the client, the server, the index, the store, and the fake model.

**Blocked by:** 46 - The stack runs under the suite's control.

**Status:** Resolved (2026-09-18)

- [x] A request typed into the empty state starts a conversation and streams a
      written answer.
- [x] The suggested cards the fake's judgement kept are shown under the answer,
      in order, each opening its source.
- [x] The turn is stored: reopening the conversation shows the request, the
      answer, and the cards.
- [x] The test passes on chromium, firefox, and webkit, and asserts text and
      roles only, never the view-transition movement or computed styling.
- [x] Typecheck, lint, formatting, the dependency rules, and the unused-code
      report stay green.

**Notes:** The first real journey, and the template for the rest: drive the
interface, assert what a player sees, and let the fake decide the model's words.

**Outcome:** One spec drives the whole pipeline through the built stack: it types
a request into the empty state, sends it, waits for the answer the fake writes,
asserts the cards the judgement kept under it in ranked order, presses a card to
open its face and checks the source the face carries, and then loads the
conversation fresh to assert the turn the server stored, request, answer, and
cards together. The engine-agnostic rule held: the assertions are roles and text,
and the answer paragraph is matched exactly, because the live region is drawn
apart from the prose and its hidden copy of the answer was what a loose text
match caught first. The scripted request, the parse it gets, the two cards it
ranks, and the vectors that put them there all live in the fixtures, so the
journey is deterministic without the test naming the model's words. The suite is
six tests across the three engines, all green, and typecheck, lint, formatting,
the dependency rules over 204 modules and 549 dependencies, and the unused-code
report at its baseline all pass.
