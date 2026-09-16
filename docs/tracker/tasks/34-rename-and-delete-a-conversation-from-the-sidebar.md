# 34 - Rename and delete a conversation from the sidebar

**What to build:** A player can rename a conversation and delete one they no
longer want, from the sidebar. Renaming takes effect where the conversation is
listed and where it is open; deleting the conversation that is open leaves the
player somewhere sensible rather than on an address that no longer exists.

**Blocked by:** 31 - The chat frame, the sidebar, and the conversation route.

**Status:** ready-for-agent

- [ ] A conversation can be renamed from the sidebar, and the new name is shown
      once it is saved.
- [ ] A rename that fails leaves the old name in place and says what went wrong.
- [ ] A conversation can be deleted, after confirming, and stops being listed.
- [ ] Deleting the conversation that is open moves the player somewhere sensible
      instead of leaving them on a dead address.
- [ ] Renaming and deleting are reachable and usable without a mouse.
- [ ] Tests fake the network and assert the rename, the delete, the
      confirmation, and what becomes of the open conversation.
- [ ] Build and lint pass.

**Notes:** A conversation that was never named carries no title, so the sidebar
needs a way to present that rather than an empty row. Deleting is the one
irreversible action in the app, so it asks first; renaming does not. This ticket
only needs the frame from ticket 31, so it can run alongside tickets 32 and 33.
