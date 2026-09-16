# 27 - The turn fails cleanly

**What to build:** When the model or the server falls over partway through a
turn, the player is told the turn failed rather than being shown a half-written
answer that looks finished. The stream ends with an error, nothing partial is
stored as a reply, and the question the player asked is still in the
conversation.

**Blocked by:** 25 - A turn streams an answer and is saved.

**Status:** ready-for-agent

- [ ] A failure while parsing, searching, or answering ends the stream with an
      `error` event rather than a silent stop.
- [ ] Whatever the answer had written before the failure is discarded and never
      stored as the assistant message.
- [ ] The player's message is stored by then, so reopening the conversation shows
      the question with no reply rather than losing the turn.
- [ ] A conversation id that names nothing is refused before the stream opens,
      and so is a body that does not parse, so a failure to start never looks
      like a turn that started and then failed.
- [ ] The failure is logged with enough context to tell which conversation and
      which stage failed.
- [ ] Integration tests drive a model that fails partway through the answer and
      assert the error event, the absent reply, and the stored question.
- [ ] Build and lint pass.

**Notes:** The error event may arrive at any point in the sequence, which is why
the client has to treat it as terminal: feature 08 closes the stream on it and
refreshes the conversation, so a failed turn reads as what it is, a question
without an answer. The rule this ticket enforces is that an assistant message is
only ever written complete. Partial prose is not history worth keeping, and a
half-answer that looks finished is worse than a visible failure.

Refusing an unknown conversation and a malformed body before the stream opens is
what keeps those two failures as plain client errors instead of a stream that
starts and then errors, which would leave the client unable to tell a rejected
request from a turn that died mid-flight.
