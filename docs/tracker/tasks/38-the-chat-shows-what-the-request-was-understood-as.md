# 38 - The chat shows what the request was understood as

**What to build:** After a turn, the chat view shows one chip per filter that
turn was searched with, reading as the field, the operator, and the value, so a
player can tell whether the assistant understood the request. A request that
could not be turned into constraints says so instead, as a search of the
player's own words with no chips beside it. Reopening a conversation shows the
chips of its last turn, so a player coming back to one sees what it was last
asking for.

**Blocked by:** 36 - The controls can name what they must send.

**Status:** ready-for-agent

- [ ] The filters a turn reports are shown as one chip each.
- [ ] A turn that degraded to free text says the request was searched as written
      and shows no chips.
- [ ] Reopening a conversation shows the filters its last reply was searched
      with.
- [ ] The chips are readable and announced without a mouse, and the degraded
      state is announced.
- [ ] Tests fake the network and assert what is shown for a parsed turn, a
      degraded turn, and a reopened conversation.
- [ ] Build and lint pass, and the design record covers the chips.

**Notes:** Both sources already exist: a turn streams the filters it is about to
search with, and a stored reply carries its own filters. The client reads and
validates that event today and renders nothing, so this is its first consumer.
Taking the filters from the turn's own report rather than from the stored reply
is what makes the chips right while a turn is still running.
