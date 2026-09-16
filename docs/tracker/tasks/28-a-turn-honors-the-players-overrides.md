# 28 - A turn honors the player's overrides

**What to build:** The player can steer a turn without restating everything: the
request may carry the language to search in, the model to use, and filters they
edited themselves. Edited filters are used as they are instead of parsing the
request again, the language scopes the search to one partition, and the chosen
model is what both stages use and what the conversation keeps for next time.

**Blocked by:** 25 - A turn streams an answer and is saved.

**Status:** ready-for-agent

- [ ] The request body may carry a language, a model, and filters, each
      optional, and each one omitted leaves the conversation's own setting in
      charge.
- [ ] Edited filters are used instead of re-parsing, the request text becomes the
      free-text query, and the `filters` event echoes what was used.
- [ ] The active language scopes the search, so a turn never mixes the two
      languages.
- [ ] The model override drives both parsing and answering.
- [ ] A language or model override is stored on the conversation, so the next
      turn defaults to it.
- [ ] The precedence runs per-turn override, then the conversation's setting,
      then the configured default.
- [ ] A model that is not installed is refused as a client error rather than
      silently answered by another one.
- [ ] Integration tests cover an edited-filter turn, a language override, and a
      model override, asserting what the search was asked for and what the
      conversation kept.
- [ ] Build and lint pass.

**Notes:** Edited filters are why this ticket does not re-parse: the player has
already corrected the parse, and parsing again would overwrite the correction.
What is left of the request text is still used, as the free-text query, because
the semantic half of the search is exactly what the correction was not.

The precedence rule exists because the same turn can be reached from the
conversation's own settings or from a control the player just moved, and the
control wins. Storing the winner on the conversation is what makes a choice
stick, which feature 09 relies on when it sends its controls' values with every
turn. A named model that is not installed is a client error rather than a quiet
fallback, since a fallback would answer with a model the player did not choose
while looking like the one they did.
