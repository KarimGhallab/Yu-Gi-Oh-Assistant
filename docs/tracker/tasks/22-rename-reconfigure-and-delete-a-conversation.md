# 22 - Rename, reconfigure, and delete a conversation

**What to build:** A conversation becomes manageable. From a player's
perspective: a conversation can be renamed so it is findable later, its language
and model can be changed and are remembered so reopening restores that context,
and a conversation that is no longer wanted can be deleted along with everything
said in it. From a developer's perspective: the store's update and delete
complete the repository spec 05 promised.

**Blocked by:** 20 - SQLite store and conversation create/list; 21 - A
conversation reopens with its messages.

**Status:** Resolved (2026-09-16)

- [x] `PATCH /api/conversations/:id` updates the title, the language, and the
      model, any subset of them, and returns the updated conversation.
- [x] The settings that were changed are still there when the conversation is
      re-read, so reopening restores the context.
- [x] Updating touches the conversation's modified time.
- [x] `DELETE /api/conversations/:id` removes the conversation and all of its
      messages in one transaction, so no orphaned messages remain.
- [x] An unknown id is answered with a not-found response for both endpoints.
- [x] A malformed patch body is rejected with a client error rather than
      reaching the store.
- [x] Deleting one conversation leaves the others, with their messages, intact.
- [x] Every request and response body is validated through the contracts
      package.
- [x] Integration tests drive the Hono app's `request()` against a temporary
      SQLite file and assert the response and the persisted rows, including the
      cascade.
- [x] Build and lint pass.

**Notes:** The cascade is why this ticket is blocked by 21: the messages table
and its read path have to exist before the deletion's effect on them can be
demonstrated. Since the client's requests go through the same routes as feature
08 will use, the patch and delete semantics settled here are the ones the
conversation UI will rely on. Ticket 21 already declared `messages` with a
reference to `conversations` that deletes its messages, and `node:sqlite` enables
foreign keys by default, but this ticket owns proving the cascade in a test and
should turn the pragma on explicitly rather than rest on the default.

**Outcome:** The conversation repository gained `update` and `delete`.
`update` moves only the fields it names, using `COALESCE` so an absent field
keeps its stored value, returns the row it wrote, and always moves the modified
time while leaving the creation time alone. That means an empty patch is
accepted and only reorders the conversation, which the conversation UI must not
trigger on open or save. A title cannot be cleared through the API: a
conversation is named, renamed, or left alone. `delete` is a single
`DELETE FROM conversations`, which is one transaction; the messages go with it
through the reference the schema declares, and the explicit
`PRAGMA foreign_keys = ON` in `openAppStore` is what does not leave that to the
driver's default. The suite cannot tell that pragma line from the default, since
they agree today, but it does catch orphaned messages, so the behaviour is
guarded even though the line is not.

The routes answer a patch with the updated conversation and a delete with an
empty 204, the one response that has nothing to validate through the contracts
package. An id is a conversation only when it is written canonically, so a
padded, signed, exponent, or hexadecimal spelling is a 404 like any other unknown
conversation, on all three id-taking endpoints. The conversation repository's
tests moved into the `store/conversations/` folder, leaving the store-opening
and migration tests to `store/app/`.
