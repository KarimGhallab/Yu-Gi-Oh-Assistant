# 26 - The turn says so when the search comes up short

**What to build:** A request the parser could not turn into filters is still
searched, on the player's own words, and the turn says the search was degraded
rather than pretending the request was understood. A search that matches nothing
says so plainly and leaves the card list empty, so the player knows to broaden
the request instead of wondering why no cards appeared.

**Blocked by:** 25 - A turn streams an answer and is saved.

**Status:** ready-for-agent

- [ ] A parse that degraded emits a `status` event saying the request was
      searched as free text, before the search runs.
- [ ] The degraded turn searches on the request text with no structured filters,
      and its `filters` event carries no filters.
- [ ] A search that matches nothing emits a `cards` event with an empty list and
      an answer that says nothing matched, written without asking the model, so
      no card can be invented.
- [ ] Both outcomes store the turn like any other, so reopening the conversation
      shows the question, the answer, and the empty card list where that is what
      happened.
- [ ] Integration tests cover a degraded parse and an empty result against the
      fakes, asserting the events, the answer content, and the stored rows.
- [ ] Build and lint pass.

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
