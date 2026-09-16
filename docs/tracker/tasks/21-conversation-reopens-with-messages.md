# 21 - A conversation reopens with its messages

**What to build:** Reopening a conversation restores what was said in it. From a
player's perspective: after closing the app and coming back, opening a past
conversation shows its messages in order, so the conversation can continue where
it left off. From a developer's perspective: the store now exposes the message
append that feature 07's turn writes through, so the read path and the cascade in
ticket 22 are exercised against real rows rather than seeded directly.

**Blocked by:** 20 - SQLite store and conversation create/list.

**Status:** ready-for-agent

- [ ] `GET /api/conversations/:id` returns the conversation together with its
      messages in the order they were written.
- [ ] An unknown conversation id is answered with a not-found response, not an
      empty conversation.
- [ ] The store can append a user or assistant message to a conversation, which
      is the seam feature 07 uses.
- [ ] Appending the first user message to a conversation that has no explicit
      title gives the conversation that message as its title; a conversation with
      an explicitly set title keeps it.
- [ ] A message carries its role, content, and creation time, and the fields
      feature 07 fills later (parsed filters and suggested card ids) round-trip
      when present.
- [ ] A message appended in one request is visible to the next read across
      requests.
- [ ] Every request and response body is validated through the contracts
      package.
- [ ] Integration tests drive the Hono app's `request()` against a temporary
      SQLite file and assert the response and the persisted rows.
- [ ] Build and lint pass.

**Notes:** The `messages` table belongs to this ticket because the read path and
the delete cascade both depend on it. Writing messages as part of a turn is out
of scope (feature 07); this ticket only provides the repository it uses. The
`filters_json` and `card_ids_json` columns exist so that a reopened conversation
can re-render the parsed filters and the suggested cards without recomputation;
the filter shape is the card filter vocabulary from feature 04.
