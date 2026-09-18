# 68 - The listing names the model a conversation starts on

**What to build:** The models the API answers with carry the default the server
would pick, so a client shows the model a conversation will start on rather than
guessing it. The wire answers with the models and the default together, and the
server's rule for the default is named once.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] The models endpoint answers with the models and the default name together,
      and the default is absent when no installed model can answer.
- [x] The rule for the default is one named function in the server, and a caller
      that must have a default still fails when none can answer.
- [x] The client's models request and its hook read the listing.
- [x] The home surface shows the default from the listing and no longer derives
      it.
- [x] The models route test asserts the listing shape, the default, and its
      absence; the client tests stay green.
- [x] The repository gates stay green.

**Notes:** ADR-0007 is amended: the server names the default and the client never
derives it. The array schema becomes a listing schema.

**Outcome:** The models endpoint answers a listing of the models and the name of
the one a conversation would start on, absent when nothing installed can answer.
`firstAnsweringModel` is the one rule and `defaultModel` still fails for a caller
that must have one. The client reads the listing, and the home surface shows the
server's default instead of deriving it. All gates green.
