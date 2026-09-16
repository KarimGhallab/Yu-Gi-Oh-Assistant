# 27 - The turn fails cleanly

**What to build:** When the model or the server falls over partway through a
turn, the player is told the turn failed rather than being shown a half-written
answer that looks finished. The stream ends with an error, nothing partial is
stored as a reply, and the question the player asked is still in the
conversation.

**Blocked by:** 25 - A turn streams an answer and is saved.

**Status:** Resolved (2026-09-16)

- [x] A failure while parsing, searching, or answering ends the stream with an
      `error` event rather than a silent stop.
- [x] Whatever the answer had written before the failure is discarded and never
      stored as the assistant message.
- [x] The player's message is stored by then, so reopening the conversation shows
      the question with no reply rather than losing the turn.
- [x] A conversation id that names nothing is refused before the stream opens,
      and so is a body that does not parse, so a failure to start never looks
      like a turn that started and then failed.
- [x] The failure is logged with enough context to tell which conversation and
      which stage failed.
- [x] Integration tests drive a model that fails partway through the answer and
      assert the error event, the absent reply, and the stored question.
- [x] Build and lint pass.

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

**Notes from 25:** Two things the implementation left for this ticket. Hono's
`streamSSE` writes its own `event: error` frame, with a bare message, only when
it is given an `onError` callback, so a failure raised inside the turn closes the
stream silently today; the error frame this ticket promises has to be framed by
the turn itself and validated against the contract like every other frame, not
delegated to the helper. And on Node a client that disconnects does not abort the
turn: the model call runs to completion and the answer is still stored. Both are
harmless for a local single-user app, but each is a decision worth recording.
`dependencies.logger` is also untouched by the turn so far, so the stage and
conversation context this ticket's criterion asks for is new work. The error event
joins the same discriminated union the status now belongs to, and an error can
arrive after a status, so the union is what a client narrows on rather than the
order it received frames in.

**Outcome:** A turn that gives way now says so and stops. The stream carries an
`error` event with the stage it died at, so a client can phrase its banner, and
with a message: a failure the domain already understands explains itself the way
the API's error boundary lets it, and anything else is given a flat sentence
while its detail stays in the log. The log splits the same way, a warning for an
understood failure and an error for anything else, and either way it names the
conversation, the stage, and the real message.

The pipeline body sits in one try, with the stage set before the work it labels.
Reading the selected model's capability is reported as part of the parse stage
rather than a stage of its own, because that is what it is part of, and the two
refusals that happen before the stream opens stay plain client errors so the
client can tell a rejected request from a turn that died in flight.

The answer is stored once and only when it is complete, so a failure at any stage
leaves the question with no reply, which is exactly what reopening shows. The
store happens between `answer.end` and `turn.end`, which is where the spec puts
it, so the contract now says what `answer.end` means: the prose is complete, not
that the turn survived. `turn.end` carrying the stored id is what ends a turn.

Verified live against the real index and server, for the two stages that can be
forced from outside: with the embedding server pointed at a dead port the parse
succeeded, streamed its filters, and then failed with the search stage and the
message naming the unreachable server, and with a conversation whose model is not
installed the turn failed at the parse stage in 111 ms with the message telling
the player to install it. Both stored the question and no reply, and both logged
the conversation, the stage, and the message. A model that dies mid-answer cannot
be forced from outside, so the answer stage is covered by the integration tests,
which now stand in for a stream that throws, for a model that answers with
nothing, and for a search that cannot run.

Three things are known and left. A disconnected client still lets the turn run to
completion and stores the answer, which the ticket accepted for a local
single-user app (recorded in ticket 25's notes). The error frame is named `error`,
which collides with the event `EventSource` fires for a transport failure, so
feature 08 has to read this stream with `fetch` and a stream reader, which is
what a POST stream needs anyway. And an invalid response from Ollama is a domain
error whose message can embed a slice of the server's own reply, which is the
same thing the HTTP error boundary already does, so it stays consistent rather
than being special-cased here.
