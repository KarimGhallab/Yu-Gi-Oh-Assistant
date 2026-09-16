# 39 - A chip can be corrected and the turn re-run on it

**What to build:** A player corrects a chip or takes one away and sends the
request again, and the search runs with the set they corrected instead of
reading the request a second time. Taking every chip away is a deliberate
question with no constraints at all, not a request to be re-parsed. A request
sent without touching the chips is still parsed as usual, because the player has
said nothing about the filters.

**Blocked by:** 38 - The chat shows what the request was understood as.

**Status:** ready-for-agent

- [ ] A chip's operator or value can be changed, and the next turn is searched
      with the corrected set.
- [ ] A chip can be removed, which broadens the search the same way.
- [ ] Sending with every chip removed runs an unconstrained search rather than
      re-reading the request.
- [ ] A turn sent without touching the chips is still parsed from the request.
- [ ] What the turn reports back is the set that ran, so the chips show the
      correction that was used.
- [ ] Tests fake the network and assert the corrected, the emptied, and the
      untouched cases.
- [ ] Build and lint pass, and the design record covers editing a chip.

**Notes:** Ticket 28 built the override path this rides on, and recorded the
rule that keeps it safe: send the filters only when the player edited them, and
send an empty list when they cleared them. Sending the filters on every turn
would skip parsing forever, and a cleared set says something different from an
untouched one, which is why the empty list is sent rather than left out.
