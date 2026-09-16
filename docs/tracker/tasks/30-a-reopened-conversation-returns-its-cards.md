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

**Status:** Resolved (2026-09-16)

- [x] The conversation response carries, for each assistant message, the cards
      that turn showed, in the order they were ranked.
- [x] Each card carries what a grid needs to render it: its name, its image, and
      its source link.
- [x] The cards are read in the conversation's language, and a card missing from
      that language still comes back in the other one rather than being dropped.
- [x] A player message, and an assistant message that showed no cards, carry
      none.
- [x] The cards are read from the index rather than duplicated into the store,
      so the index stays the single source of truth for card data.
- [x] Integration tests through the app's request seam cover a stored turn
      coming back with its cards, a turn that showed nothing, and a card that
      exists in only one language.
- [x] Build and lint pass.

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

**Outcome:** Reopening a conversation now answers with the cards a turn
suggested, not the ids behind them. The index gained one read, by id, that
returns the cards in the order it was asked for, prefers the language it is
given, and falls back to whichever language has a card; the conversation read
calls it once for every id in the conversation and maps each stored message to
the message the API answers with.

The wire dropped its card ids rather than gaining cards beside them. Every card
carries its own id, so a client loses nothing, the store keeps the ids as the
truth, and no client ever has to know that resolving them was a step. Nothing
outside the store, the turn that writes it, and this projection read those ids,
which is why the swap was safe rather than additive.

Three behaviours were decided rather than inherited. The language falls back
instead of filtering, since the partitions share their ids and a card the
conversation's language lacks is worth showing in the one that has it. An id no
language holds any more is left out of the answer rather than failing the whole
conversation, which is the only way a stored card can disappear, and the grid
losing one card beats the conversation not opening. An empty set of ids never
opens the index, so a conversation whose replies suggested nothing costs no read
at all. A missing index still fails loudly: the boot guard is what should have
prevented it, and retrieval depends on the index just as much.

Verified at three levels. The new read has its own tests for order, the
preferred language, the fallback, an unknown id, and an empty request that opens
nothing. The request-seam tests cover a stored turn coming back with its cards,
a turn that showed nothing, a player message carrying none, and a conversation
whose stored ids are deliberately out of numeric order, so the answer can only
match by keeping the order the turn ranked. Live against the real 25,895-card
index, with the remote Ollama unreachable and so no model call: a French
conversation holding three real ids answered with those three cards in French,
each with its image and its source link, and the same ids in an English
conversation answered with the English names, which is the preference and the
per-language names working on real data. The raw response carries no ids.

**Notes for later:** The read does not deduplicate ids a conversation repeats
across its turns, which only makes the predicate slightly longer on a
card-heavy conversation. A rebuild that changes the dataset while the server
runs would leave stored ids the new index cannot resolve; they are silently left
out, which is worth remembering if an index ever ships without a boot guard
behind it.
