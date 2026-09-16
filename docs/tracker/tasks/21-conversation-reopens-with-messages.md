# 21 - A conversation reopens with its messages

**What to build:** Reopening a conversation restores what was said in it. From a
player's perspective: after closing the app and coming back, opening a past
conversation shows its messages in order, so the conversation can continue where
it left off. From a developer's perspective: the store now exposes the message
append that feature 07's turn writes through, so the read path and the cascade in
ticket 22 are exercised against real rows rather than seeded directly.

**Blocked by:** 20 - SQLite store and conversation create/list.

**Status:** Resolved (2026-09-16)

- [x] `GET /api/conversations/:id` returns the conversation together with its
      messages in the order they were written.
- [x] An unknown conversation id is answered with a not-found response, not an
      empty conversation.
- [x] The store can append a user or assistant message to a conversation, which
      is the seam feature 07 uses.
- [x] Appending the first user message to a conversation that has no explicit
      title gives the conversation that message as its title; a conversation with
      an explicitly set title keeps it.
- [x] A message carries its role, content, and creation time, and the fields
      feature 07 fills later (parsed filters and suggested card ids) round-trip
      when present.
- [x] A message appended in one request is visible to the next read across
      requests.
- [x] Every request and response body is validated through the contracts
      package.
- [x] Integration tests drive the Hono app's `request()` against a temporary
      SQLite file and assert the response and the persisted rows.
- [x] Build and lint pass.

**Notes:** The `messages` table belongs to this ticket because the read path and
the delete cascade both depend on it. Writing messages as part of a turn is out
of scope (feature 07); this ticket only provides the repository it uses. The
`filters_json` and `card_ids_json` columns exist so that a reopened conversation
can re-render the parsed filters and the suggested cards without recomputation;
the filter shape is the card filter vocabulary from feature 04.

**Outcome:** `packages/db` gained a `MessageRepository` behind the store:
`append` writes the message and names the conversation in one transaction, and
`list` reads a conversation's messages by id, which is the write order rather
than the timestamp order. `conversations.find` was added for the read path, and
migration 2 creates `messages` with a reference to `conversations`. The
conversation is named only when the role is user and the stored title is still
null, and the message content is used verbatim, untruncated. The title write also
touches the conversation's `updated_at`, so naming moves it to the front of the
list; an ordinary message in an already-named conversation does not, which is
the same rule ticket 22's rename follows. An id that is not digits names a
conversation that cannot exist, so a padded, signed, or exponent spelling is a
404 rather than a coerced hit.

`MessageRole` is declared twice, in `packages/db` for persistence and in
`packages/contracts` for the wire, because neither package may import the other;
the route maps between them and the response contract catches drift. The filter
and card id columns are nullable and are re-validated with Zod on read, so an
absent value stays absent while an empty set stays an empty set, and a stored row
that no longer satisfies the filter vocabulary raises instead of reaching
retrieval. Code that writes through `append` must reject empty content itself:
the store persists what it is given, while the wire contract requires a
non-empty message, so the request schema of the turn in feature 07 is where that
belongs. The append transaction is not composable, so a whole turn cannot be
wrapped around it later.
