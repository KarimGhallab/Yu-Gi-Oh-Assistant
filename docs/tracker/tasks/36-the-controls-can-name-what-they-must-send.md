# 36 - The controls can name what they must send

**What to build:** The vocabularies the chat view's new controls speak are
reachable from the package it already depends on: the two languages, the filter
fields, the operators, and the values each field accepts (card types, frame
types, attributes, link markers). Nothing is visible to a player because of this
ticket. What it buys is that the chips and the language control are built
against the same vocabulary the server validates a turn with, so the client
cannot offer a filter or a language the server would refuse, and there is no
second copy of the vocabulary to drift.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] The chat view can import the languages, the filter fields, the operators,
      and the per-field value vocabularies through the shared contracts package.
- [ ] The vocabularies are the ones the server validates a turn against, so
      anything the controls can build is accepted.
- [ ] The client takes on no new dependency to reach them.
- [ ] Build, lint, and the unused-code report pass without adding unused
      exports.

**Notes:** The client already renders the contract's shape rather than depending
on the catalog package, which was recorded when the card grid landed, so
carrying this vocabulary through the contracts package is the consistent choice
and it spares the client a dependency that would need installing. The values
matter as much as the field names: a chooser for a card type, a frame type, an
attribute, or a link marker has to offer the same set the schema accepts, or the
controls can build a filter the search refuses.
