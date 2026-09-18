# 43 - A card that is not in the conversation's language says so

**What to build:** A suggested card that is not in the conversation's language
carries a marker naming the language it is in, so a player is not silently
missing an option. A card in the conversation's own language carries nothing, as
it does today.

**Blocked by:** 41 - The conversation's language is the player's to choose.

**Status:** Resolved (2026-09-17)

- [x] A card in the other language carries the marker, and a card in the
      conversation's language does not.
- [x] The marker names the language rather than relying on a color or a shape
      on its own, and it is announced.
- [x] Tests fake the network and cover a marked card and an unmarked one.
- [x] Build and lint pass, and the design record covers the marker.

**Notes:** Nothing new has to travel for this. A card already carries its
language, a conversation carries its own, and the read that resolves a stored
turn's cards already falls back to the other language when the active one has no
such card. That fallback is why the case arises at all, because a live turn
searches one language partition and never mixes them; the switch is what puts a
card in front of a player whose language does not have it.

**Outcome:** A card the conversation's language has no printing of says which
language it is in, under its name: the card's own language as a code, "EN only"
or "FR only", in 12px mono and Dust Grey, which is the treatment the system gives
machine facts that are not prose. A card the language has carries nothing.

The marker is text of its own rather than part of the card's link, and that is
the point of it: the link stays labelled by the card's name, so a player hears
the card and then, separately, that it is in the other language. A marker folded
into the label would have made the two one thing, and the name is what the record
says a card is announced by. It names the language in words rather than leaning
on a color or a shape, and nothing about it is Signal Red, because a card being
in the other language is a fact worth knowing rather than something going wrong.

The conversation's language reaches the cards through the history, so a switch
moves the cards and their markers together: the same turn re-read in French comes
back with the cards that exist in French unmarked and the ones that only exist in
English saying so. Nothing new travels on the wire for any of this, which is what
the ticket said when it was written.

One test fakes the network for it: a French conversation holding a French card
and a card only printed in English, where the French one carries no marker and is
still found by its name alone, and the English one carries "EN only" with its own
link still named by the card. The type check, 357 tests across 32 files, lint,
build, formatting, the dependency rules over 148 modules and 382 dependencies,
and the unused-code report at exactly its previous findings all pass, and the
design record gained the marker under the cards and the tile that holds it.

Verified live against the real index on a scratch store: an English turn for
light monsters with at least 2500 attack, switched to French, re-read its eight
cards as six French names and two that only exist in English, "Cyber End Dragon,
the Final Strike Dragon" and "Light and Darkness Dragonlord". Exactly those two
carried "EN only" under their names, and the marker sat outside the link, which
is what keeps each card announced by its name.
