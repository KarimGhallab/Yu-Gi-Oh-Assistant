# 41 - The conversation's language is the player's to choose

**What to build:** The chat view offers English and French for the conversation.
Switching it changes what the conversation's cards are shown in: the cards of
the turn on screen come back in the new language, and the turns that follow
search and answer in it. The choice belongs to the conversation, so reopening
one restores it, and a turn carries the language the player is looking at, so a
turn started straight after a switch does not run on the old one.

**Blocked by:** 36 - The controls can name what they must send.

**Status:** ready-for-agent

- [ ] The control shows the conversation's language and switches it.
- [ ] Switching re-shows the cards of the current conversation in the new
      language, with no turn added to the history.
- [ ] The choice is kept on the conversation, so reopening it restores the
      choice.
- [ ] A turn started after a switch carries the language that is on screen.
- [ ] The control is reachable and usable without a mouse.
- [ ] Tests fake the network and assert the switch, the re-shown cards, and what
      a following turn carries.
- [ ] Build and lint pass, and the design record covers the control.

**Notes:** The server already does the hard part: a conversation carries its
language, the API can change it, a turn accepts and keeps it, and reading a
stored turn's cards back resolves them in the conversation's language and falls
back to the other one only when the preferred language has no such card. So
switching is a change to the conversation and a re-read, and the history keeps
its shape. Re-running the request was the alternative, and it would put a second
answer in the history for a question that was already answered. What this ticket
adds to the request path is the settings the other controls also hand to a turn.
