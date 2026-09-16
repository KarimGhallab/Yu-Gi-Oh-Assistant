# 30 - A reopened conversation returns its turns' cards

**What to build:** Reopening a conversation gives back what the assistant
suggested, not just the ids of those cards. A turn stores the ids of the cards it
showed, because they are what the answer was built from, so the conversation read
projects them back to cards: the name, the image, and the source link a grid
needs, read from the index in the conversation's language. From a developer's
perspective: the conversation endpoint answers with each assistant message's
cards, so a client that reloads a conversation never has to know an id resolution
step exists.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] The conversation response carries, for each assistant message, the cards
      that turn showed, in the order they were ranked.
- [ ] Each card carries what a grid needs to render it: its name, its image, and
      its source link.
- [ ] The cards are read in the conversation's language, and a card missing from
      that language still comes back in the other one rather than being dropped.
- [ ] A player message, and an assistant message that showed no cards, carry
      none.
- [ ] The cards are read from the index rather than duplicated into the store,
      so the index stays the single source of truth for card data.
- [ ] Integration tests through the app's request seam cover a stored turn
      coming back with its cards, a turn that showed nothing, and a card that
      exists in only one language.
- [ ] Build and lint pass.

**Notes:** The stored ids stay the truth and the cards are a projection the read
performs, so nothing about the turn's write path changes. A card that exists in
both languages comes back in the conversation's language, which is what the
client will want when it renders names in the language the player is working in,
and a card that exists in only one comes back in that one, so nothing is
silently missing. Reading by id does not exist yet: the index offers a vector
search and a filter scan, and the language partitions share their card ids, so
this adds the read and prefers the conversation's language with the other as a
fallback. Storing a snapshot of the cards on the message instead was considered
and rejected: it duplicates what the index owns and drifts from it, and it would
pin every past turn to the language it was answered in.

The live turn stream already carries full cards, so this is what makes reopening
a conversation show the same thing the player watched arrive.
