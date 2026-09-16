# 34 - Rename and delete a conversation from the sidebar

**What to build:** A player can rename a conversation and delete one they no
longer want, from the sidebar. Renaming takes effect where the conversation is
listed and where it is open; deleting the conversation that is open leaves the
player somewhere sensible rather than on an address that no longer exists.

**Blocked by:** 31 - The chat frame, the sidebar, and the conversation route.

**Status:** Resolved (2026-09-16)

- [x] A conversation can be renamed from the sidebar, and the new name is shown
      once it is saved.
- [x] A rename that fails leaves the old name in place and says what went wrong.
- [x] A conversation can be deleted, after confirming, and stops being listed.
- [x] Deleting the conversation that is open moves the player somewhere sensible
      instead of leaving them on a dead address.
- [x] Renaming and deleting are reachable and usable without a mouse.
- [x] Tests fake the network and assert the rename, the delete, the
      confirmation, and what becomes of the open conversation.
- [x] Build and lint pass.

**Notes:** A conversation that was never named carries no title, so the sidebar
needs a way to present that rather than an empty row. Deleting is the one
irreversible action in the app, so it asks first; renaming does not. This ticket
only needs the frame from ticket 31, so it can run alongside tickets 32 and 33.

**Outcome:** A conversation can be renamed and deleted from the row it lives in.
The server already had both (ticket 22), so this is the client: a request whose
answer is its status, which is what a delete's 204 is, and the two endpoints and
mutations over it.

A row keeps its conversation link and gains two quiet text controls, Rename and
Delete, named for their conversation so a screen reader hears "Rename Graveyard
toolbox" rather than a list of Renames. They are revealed when the row is pointed
at or holds focus, but they are always in the tab order and always announced,
because opacity is not what assistive technology reads.

Renaming turns the row into a field holding the name it has, with the name
selected so typing replaces it, and Save and Cancel beside it; Enter saves and
Escape leaves. The rename takes effect in both places a conversation is named,
which is the list and the page, because the mutation refreshes everything that
reads conversations. A rename that fails keeps the old name, closes the field and
shows the server's own message above the list.

Deleting asks first, in the row itself rather than in a dialog: the row asks the
question and offers Delete and Cancel, and the confirmation is both an alert and
what the Delete control is described by, so a screen reader user is told what
they are being asked rather than hearing the same button twice. Nothing is
deleted until it is confirmed; a delete that fails leaves the conversation and
the player where they were. Deleting the conversation that is open moves to the
empty state, and deleting one that is not leaves the player on the conversation
they were reading, with focus on the row that took the deleted one's place.

Verified in the client's tests: six of them here, faking the network at the fetch
boundary, over the rename and where it shows, a rename that fails, the
confirmation and the removal, a deletion that is called off, deleting the open
conversation, and reaching the row's actions from the keyboard. The full suite is
329 tests.
