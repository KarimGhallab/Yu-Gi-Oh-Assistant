# 49 - The language and the model persist, and the conversation reopens

**What to build:** Switching the conversation's language shows the cards in that
language; picking a model runs the next turn on it and keeps the choice; and
reopening the conversation restores its history and both settings.

**Blocked by:** 47 - A request answers end to end.

**Status:** Resolved (2026-09-18)

- [x] Switching language re-reads the same turn's cards in the other language.
- [x] Picking a model is kept on the conversation and carried by the next turn.
- [x] A card the active language has no printing of still appears, with the
      marker naming the language it is in.
- [x] Reopening the conversation restores its messages, its cards, and the two
      settings.
- [x] The test passes on chromium, firefox, and webkit.
- [x] Typecheck, lint, formatting, the dependency rules, and the unused-code
      report stay green.

**Notes:** The fake must list a model that can answer and be inspected, so the
picker has something real to offer. The reopen assertion needs a stored turn,
which is why this follows the core journey.

**Outcome:** Two specs drive the settings through the built stack. The first
switches the conversation to French and watches the same turn's cards be read
again: Dark Magician becomes Magicien Sombre, and Blue-Eyes, which the catalog
holds only in English, stays with its EN-only marker, so both halves of the
language rule are asserted at once. The second switches the language, picks the
second model, sends a turn, and reloads the conversation: the reopened page shows
both requests, both answers, both card lists, and both settings, French and the
picked model. Making the turn's model observable is what the fixture work was
for: the fake now lists a second chat model and writes a different answer lead
when a turn is carried by it, since nothing else about a fake answer changes with
the name. The fixture catalog already carried the English and French printings of
one card and a card in only one language each, which is what the language
assertions rest on. The suite is now twenty-one tests across the three engines,
and typecheck, 445 vitest tests, lint, formatting, the dependency rules, and the
unused-code report at its baseline all pass.
