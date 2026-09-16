# 40 - A filter can be added

**What to build:** A player constrains a search with a filter the request never
named, choosing from the fields the search supports. Each field offers only what
it accepts: a number for a level or a stat, text for a race or an archetype, and
a fixed set for a card type, a frame type, an attribute, or a link marker. The
added filter joins the set the next turn runs with.

**Blocked by:** 39 - A chip can be corrected and the turn re-run on it.

**Status:** ready-for-agent

- [ ] A filter can be added by choosing a field, an operator, and a value.
- [ ] Only the operators a field accepts are offered, and the value is gathered
      in the kind that field needs.
- [ ] A field with a fixed set of values offers those values rather than asking
      the player to spell one.
- [ ] The added filter is part of the set the next turn is searched with.
- [ ] Adding is reachable and usable without a mouse.
- [ ] Tests fake the network and assert an added filter reaching the search.
- [ ] Build and lint pass, and the design record covers adding a filter.

**Notes:** This is where the vocabulary ticket pays off: nothing offered may be
something the server would refuse, and the pairing of a field with its operators
is the schema's own. It is the same surface as correcting a chip, which is why
it follows that one.
