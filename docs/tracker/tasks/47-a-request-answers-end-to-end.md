# 47 - A request answers end to end

**What to build:** A player types a request in the real app, watches the answer
stream in, and sees the cards the answer was written from, each with the way to
its source. From a developer's perspective, the whole pipeline is proven across
the client, the server, the index, the store, and the fake model.

**Blocked by:** 46 - The stack runs under the suite's control.

**Status:** ready-for-agent

- [ ] A request typed into the empty state starts a conversation and streams a
      written answer.
- [ ] The suggested cards the fake's judgement kept are shown under the answer,
      in order, each opening its source.
- [ ] The turn is stored: reopening the conversation shows the request, the
      answer, and the cards.
- [ ] The test passes on chromium, firefox, and webkit, and asserts text and
      roles only, never the view-transition movement or computed styling.
- [ ] Typecheck, lint, formatting, the dependency rules, and the unused-code
      report stay green.

**Notes:** The first real journey, and the template for the rest: drive the
interface, assert what a player sees, and let the fake decide the model's words.
