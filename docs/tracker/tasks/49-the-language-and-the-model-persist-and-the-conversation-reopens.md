# 49 - The language and the model persist, and the conversation reopens

**What to build:** Switching the conversation's language shows the cards in that
language; picking a model runs the next turn on it and keeps the choice; and
reopening the conversation restores its history and both settings.

**Blocked by:** 47 - A request answers end to end.

**Status:** ready-for-agent

- [ ] Switching language re-reads the same turn's cards in the other language.
- [ ] Picking a model is kept on the conversation and carried by the next turn.
- [ ] A card the active language has no printing of still appears, with the
      marker naming the language it is in.
- [ ] Reopening the conversation restores its messages, its cards, and the two
      settings.
- [ ] The test passes on chromium, firefox, and webkit.
- [ ] Typecheck, lint, formatting, the dependency rules, and the unused-code
      report stay green.

**Notes:** The fake must list a model that can answer and be inspected, so the
picker has something real to offer. The reopen assertion needs a stored turn,
which is why this follows the core journey.
