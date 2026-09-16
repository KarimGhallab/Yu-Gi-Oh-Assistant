# 43 - A card that is not in the conversation's language says so

**What to build:** A suggested card that is not in the conversation's language
carries a marker naming the language it is in, so a player is not silently
missing an option. A card in the conversation's own language carries nothing, as
it does today.

**Blocked by:** 41 - The conversation's language is the player's to choose.

**Status:** ready-for-agent

- [ ] A card in the other language carries the marker, and a card in the
      conversation's language does not.
- [ ] The marker names the language rather than relying on a colour or a shape
      on its own, and it is announced.
- [ ] Tests fake the network and cover a marked card and an unmarked one.
- [ ] Build and lint pass, and the design record covers the marker.

**Notes:** Nothing new has to travel for this. A card already carries its
language, a conversation carries its own, and the read that resolves a stored
turn's cards already falls back to the other language when the active one has no
such card. That fallback is why the case arises at all, because a live turn
searches one language partition and never mixes them; the switch is what puts a
card in front of a player whose language does not have it.
