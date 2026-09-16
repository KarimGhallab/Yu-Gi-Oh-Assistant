# 28 - A turn honors the player's overrides

**What to build:** The player can steer a turn without restating everything: the
request may carry the language to search in, the model to use, and filters they
edited themselves. Edited filters are used as they are instead of parsing the
request again, the language scopes the search to one partition, and the chosen
model is what both stages use and what the conversation keeps for next time.

**Blocked by:** 25 - A turn streams an answer and is saved.

**Status:** Resolved (2026-09-16)

- [x] The request body may carry a language, a model, and filters, each
      optional, and each one omitted leaves the conversation's own setting in
      charge.
- [x] Edited filters are used instead of re-parsing, the request text becomes the
      free-text query, and the `filters` event echoes what was used.
- [x] The active language scopes the search, so a turn never mixes the two
      languages.
- [x] The model override drives both parsing and answering.
- [x] A language or model override is stored on the conversation, so the next
      turn defaults to it.
- [x] The precedence runs per-turn override, then the conversation's setting,
      then the configured default.
- [x] A model that is not installed is refused as a client error rather than
      silently answered by another one.
- [x] Integration tests cover an edited-filter turn, a language override, and a
      model override, asserting what the search was asked for and what the
      conversation kept.
- [x] Build and lint pass.

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

**Outcome:** A turn now takes its settings from the request where the request
names them and from the conversation otherwise. The route resolves them, refuses
a model the server does not have before anything is stored, writes a changed
language or model onto the conversation so a choice sticks, and hands the turn
the settings that are in force; the pipeline never has to know which source won.

The presence of `filters` in the body is what asks for them to be used, an empty
list included: a player who cleared every chip has said something different from
a player who did not touch them. That path parses nothing, so the request text
becomes the free text and no status is emitted, because nothing degraded. Every
other path parses as before.

An uninstalled model is refused with the same error the Ollama client raises for
a 404, so the player is told to install it rather than the turn dying in the
stream. That check means the model listing now happens before the player's
message is stored, which changes what an unreachable Ollama looks like: a 503
before the stream instead of an error event after the question was stored. That
is a deliberate trade, since a turn that cannot prepare cannot run at all, and it
is pinned by a test.

Verified live against the real index and server. An edited `frameType eq spell`
turn streamed its filters event at 105 ms, where a parsed turn takes about
twelve seconds, echoed the filters and the text as the query, and returned eight
Spell Cards. A French language override on an English conversation searched the
French cards, answered in French, and left the conversation in French. A model
override to `mistral:7b` ran the turn on it and left it on the conversation; that
model produced two contradictory type filters and the search matched nothing, so
the fixed answer was streamed, which is the model-quality problem the editable
chips exist for rather than anything this endpoint can catch. A model that is not
installed answered 404 with the install message, opened no stream, stored no
message, and left the conversation alone.

Recorded for feature 09, which sends these overrides. Sending `filters` from the
chips on every turn would skip parsing forever; the chips should send them only
when the player edited them, and send an empty list when the player cleared them.
A missing conversation and a missing model are both a 404 carrying only a
message, so a client cannot tell them apart without reading the text. The names
the picker sends have to match what the server reports, exactly, and there is
still no models endpoint to list them from. And the "nothing matched" answer is
English whatever the conversation's language, which is where feature 09 comes in.
