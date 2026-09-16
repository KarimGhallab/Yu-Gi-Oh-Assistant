# 22 - Rename, reconfigure, and delete a conversation

**What to build:** A conversation becomes manageable. From a player's
perspective: a conversation can be renamed so it is findable later, its language
and model can be changed and are remembered so reopening restores that context,
and a conversation that is no longer wanted can be deleted along with everything
said in it. From a developer's perspective: the store's update and delete
complete the repository spec 05 promised.

**Blocked by:** 20 - SQLite store and conversation create/list; 21 - A
conversation reopens with its messages.

**Status:** ready-for-agent

- [ ] `PATCH /api/conversations/:id` updates the title, the language, and the
      model, any subset of them, and returns the updated conversation.
- [ ] The settings that were changed are still there when the conversation is
      re-read, so reopening restores the context.
- [ ] Updating touches the conversation's modified time.
- [ ] `DELETE /api/conversations/:id` removes the conversation and all of its
      messages in one transaction, so no orphaned messages remain.
- [ ] An unknown id is answered with a not-found response for both endpoints.
- [ ] A malformed patch body is rejected with a client error rather than
      reaching the store.
- [ ] Deleting one conversation leaves the others, with their messages, intact.
- [ ] Every request and response body is validated through the contracts
      package.
- [ ] Integration tests drive the Hono app's `request()` against a temporary
      SQLite file and assert the response and the persisted rows, including the
      cascade.
- [ ] Build and lint pass.

**Notes:** The cascade is why this ticket is blocked by 21: the messages table
and its read path have to exist before the deletion's effect on them can be
demonstrated. Since the client's requests go through the same routes as feature
08 will use, the patch and delete semantics settled here are the ones the
conversation UI will rely on. Ticket 21 already declared `messages` with a
reference to `conversations` that deletes its messages, and `node:sqlite` enables
foreign keys by default, but this ticket owns proving the cascade in a test and
should turn the pragma on explicitly rather than rest on the default.
