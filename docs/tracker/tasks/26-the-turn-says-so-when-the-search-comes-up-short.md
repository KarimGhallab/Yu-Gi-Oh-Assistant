# 26 - The turn says so when the search comes up short

**What to build:** A request the parser could not turn into filters is still
searched, on the player's own words, and the turn says the search was degraded
rather than pretending the request was understood. A search that matches nothing
says so plainly and leaves the card list empty, so the player knows to broaden
the request instead of wondering why no cards appeared.

**Blocked by:** 25 - A turn streams an answer and is saved.

**Status:** Resolved (2026-09-16)

- [x] A parse that degraded emits a `status` event saying the request was
      searched as free text, before the search runs.
- [x] The degraded turn searches on the request text with no structured filters,
      and its `filters` event carries no filters.
- [x] A search that matches nothing emits a `cards` event with an empty list and
      an answer that says nothing matched, written without asking the model, so
      no card can be invented.
- [x] Both outcomes store the turn like any other, so reopening the conversation
      shows the question, the answer, and the empty card list where that is what
      happened.
- [x] Integration tests cover a degraded parse and an empty result against the
      fakes, asserting the events, the answer content, and the stored rows.
- [x] Build and lint pass.

**Notes:** The degraded path is what keeps a vague request useful: parsing gives
up, the player's words become the free-text query, and the turn reports that
rather than erroring or searching with nothing at all. The status event is the
only signal that the filters the client is about to render are empty because
parsing failed rather than because the request named no constraint, and feature
09 depends on that distinction to keep its chips usable in that state.

The empty result is deliberately not a model call. The reply is known before the
answer stage would run, and asking a model to say that nothing matched invites it
to say something else instead. The answer becomes part of the stored turn, so a
conversation that matched nothing reads back the same way later.

**Outcome:** The stream gained a `status` event, carrying a code rather than a
sentence because what a status line says is the client's copy to write. The code
is `free-text-only`, the phrase the parsing spec itself uses.

It fires on both short-comings, which was a deliberate widening of the criterion.
A parse that gave up is the obvious case, but a parse can also come back with
nothing usable: an empty answer is valid by the parsing spec, and a turn with no
constraints and no free text has nothing to search, so the turn searches the
player's own words either way. Announcing only the failure would have left the
client rendering an empty chip area with no way to tell the player why, and the
word the status carries, free text only, is true of both. What it deliberately
does not fire on is a parse that kept a query of its own, even the request word
for word: the model did read something into the request, and saying otherwise
would hide that.

The empty search from ticket 25 is now pinned as this ticket described it: the
cards event exists and is empty, the answer is the fixed line with no second
model call, and reopening the conversation returns the turn with no card ids. A
degraded turn is pinned at three model calls, the two parse attempts and the
answer, so a parse that degrades costs one extra call and never the turn.

Verified live against the real index: a request that could match nothing (a level
12 LIGHT Spell Card with 5000 attack) parsed into five filters, streamed an empty
card list, answered from the fixed line in the same millisecond it emitted
`turn.end`, and stored the turn with no card ids. The degraded status could not be
observed live, and the reason is worth knowing: with structured output the
grammar makes unparseable JSON nearly impossible, so a capable model never fails
twice, and in practice this status will be seen for the empty parse rather than
for a failure.

The one string the server still owns is that fixed answer, and it is English even
for a French conversation. That is the product copy feature 09 introduces, and it
is recorded there rather than invented here.
