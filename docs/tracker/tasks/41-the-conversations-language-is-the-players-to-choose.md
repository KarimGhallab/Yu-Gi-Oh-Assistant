# 41 - The conversation's language is the player's to choose

**What to build:** The chat view offers English and French for the conversation.
Switching it changes what the conversation's cards are shown in: the cards of
the turn on screen come back in the new language, and the turns that follow
search and answer in it. The choice belongs to the conversation, so reopening
one restores it, and a turn carries the language the player is looking at, so a
turn started straight after a switch does not run on the old one.

**Blocked by:** 36 - The controls can name what they must send.

**Status:** Resolved (2026-09-17)

- [x] The control shows the conversation's language and switches it.
- [x] Switching re-shows the cards of the current conversation in the new
      language, with no turn added to the history.
- [x] The choice is kept on the conversation, so reopening it restores the
      choice.
- [x] A turn started after a switch carries the language that is on screen.
- [x] The control is reachable and usable without a mouse.
- [x] Tests fake the network and assert the switch, the re-shown cards, and what
      a following turn carries.
- [x] Build and lint pass, and the design record covers the control.

**Notes:** The server already does the hard part: a conversation carries its
language, the API can change it, a turn accepts and keeps it, and reading a
stored turn's cards back resolves them in the conversation's language and falls
back to the other one only when the preferred language has no such card. So
switching is a change to the conversation and a re-read, and the history keeps
its shape. Re-running the request was the alternative, and it would put a second
answer in the history for a question that was already answered. What this ticket
adds to the request path is the settings the other controls also hand to a turn.

**Outcome:** The conversation's language is a control of the conversation, so it
lives in the pane header beside the name rather than in the composer: a caption
reading "Cards in" and a quiet select of the two languages, transparent, Ash
Grey, with the platform's own caret, and the model picker will sit beside it. It
is neither amber nor filled because the header is not the bench, and a
conversation already carries the two amber fills this screen allows.

Switching is a patch of the language and a re-read, nothing more: the server
resolves a stored turn's cards in the language the conversation is in, so the
same turn comes back in French with the history keeping its shape, and no answer
is asked for twice. The control shows the language that was asked for while the
change is on its way, so a switch does not look like it bounced back before it
lands, and a patch that fails leaves the conversation as it was with the server's
message under the row.

The turn carries the language the player is looking at, which is what keeps a
turn started straight after a switch off the old one. That means every turn now
names a language, including the ones sent from an example prompt, and the tests
that pinned a request body had to say so. The client also gained a general way to
change part of a conversation, which renaming now uses, so the two controls
cannot drift into two different patches.

Three tests fake the network for it: a switch, with the same turn's cards coming
back in the other language, the history not growing, and the turn that follows
going out with the language on screen; a conversation opened on the language it
was left in; and a switch that fails, which keeps the language the conversation
holds and says what the server said. The tab-order test counts the header's new
control as what it is, one more stop before the cards. The type check, 355 tests
across 32 files, lint, build, formatting, the dependency rules over 148 modules
and 382 dependencies, and the unused-code report at exactly its previous
findings all pass, and the design record gained the header's settings, the field
without its surface that they wear, and the patch's failure line.

Verified live against the real index on a scratch store with the index symlinked,
running the installed `llama3.1:8B`. The header showed the conversation's
language; switching to French re-read the same turn, whose eight cards came back
as "Dragon Ultime de Lumière", "Électro-Dragonqueue" and "Numéro 25 : Force
Focus" with nothing added to the history; the next request went out as
`{"text":"a dark monster","language":"fr"}` and was answered in French; a reload
kept the conversation in French with its French cards; and the cards that have no
French printing stayed in English, which is what the marker in ticket 43 is for.
