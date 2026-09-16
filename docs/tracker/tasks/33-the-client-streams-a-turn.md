# 33 - The client streams a turn

**What to build:** A player types a request and watches the assistant work. Their
message appears at once, the turn announces itself while it runs, including when
the server says it understood nothing structured and searched their own words,
the suggested cards appear as the server reports them, and the answer arrives as
it is written rather than all at once. When the turn ends, what remains is the
stored reply with its cards. When it fails, a banner says which part failed and
no half-written reply is left behind.

**Blocked by:** 32 - A conversation reopens with its history.

**Status:** Resolved (2026-09-16)

- [x] Submitting a request shows the player's message immediately, and the
      message the server confirms replaces it rather than appearing twice.
- [x] The turn is announced while it runs, and the announcement says when the
      search fell back to the player's own words.
- [x] The suggested cards appear as the turn reports them, and the answer
      appears as it is written.
- [x] The answer being written is announced to assistive technology, without
      rereading the whole conversation on every piece.
- [x] When the turn ends, the conversation is refetched, so the stored turn, its
      cards, and any title it gave the conversation are what a reload would
      show.
- [x] A turn that fails shows a banner naming the stage that failed, the
      half-written answer disappears, and the question stays.
- [x] A request the server refuses before the stream starts, whether a missing
      conversation, a model that is not installed, or an unreachable Ollama,
      surfaces the server's own message the same way.
- [x] A turn that found no cards shows the answer and no empty grid.
- [x] A second turn cannot be started while one is running, and the composer
      says so.
- [x] Tests fake the network at the fetch boundary with a scripted stream and
      assert the answer appearing in pieces, the cards appearing, the status
      announcement, the error banner with no leftover reply, and the refetch
      when the turn ends.
- [x] Build and lint pass.

**Notes:** The turn is a POST, so `EventSource` cannot send it, and the
transport's own error event shares a name with one of the turn's frames; read the
response body with a stream reader and validate each frame against the contracts
package, treating the frame name as data rather than as transport. The live turn
renders through the same conversation cache entry the read path uses, so the
message list and the card grid have one shape, and the refetch on the turn
ending or failing is what keeps the server authoritative. Frames the client does
not render yet, such as the filters the parse found, are still validated and
ignored, because showing them is feature 09. The copy for the statuses and the
failed stages is the client's to write, in English.

**Outcome:** A player can type a request and watch the turn work. The composer is
docked at the bottom of the conversation: a field on one hairline of amber, the
Send control as the surface's filled lamp, and a live status line beside it. The
question appears the moment it is sent, before the server has confirmed it; the
turn announces itself while it runs, and says when the search fell back to the
player's own words because nothing structured was understood; the cards appear as
the search reports them, before the prose that cites them; and the answer is
written out a piece at a time. When the turn ends, the stored turn replaces what
the client built, and the sidebar takes on any name the turn gave the
conversation. When it gives way, the half-written answer goes, the question
stays, and the composer shows the stage that failed and whatever the server said
about it, which is also what a request refused before the stream started shows.
An empty conversation's prompts are now requests themselves: choosing one asks
for it.

The turn is read from the response body rather than through the browser's event
source, because a turn is a POST. The event name a frame carries is data rather
than transport, which is what keeps the turn's own `error` frame from being read
as the transport failing, and every frame is validated against the shared
contracts before anything sees it; the filters a parse found are validated and
left unrendered, because showing them is feature 09. A body that ends mid-frame
is a turn that stopped, and a frame the contracts do not describe is a failure
the client reports in the player's words rather than a crash.

The answer being written is announced without the whole conversation being read
again: the live turn's prose is a polite log whose pieces are separate nodes, so
what a screen reader hears is the piece that just arrived. The region is mounted
when the turn starts, empty, so the first piece is an addition to it rather than
content it was met with. There is no second copy of the answer in the document.

The server stays authoritative in three places. A turn's question is reconciled
against the `userMessageId` the stream reports, so a conversation read back while
the turn is still running does not put the same question on screen twice. The
client rebuilds nothing on its own: the refetch is what the live turn is dropped
in favour of, and it is dropped only once the server's copy has actually been
read, so a refetch that fails leaves the turn, or the stored question, on screen
rather than deleting the only copy. And leaving a conversation aborts its turn
and unmounts its surface, so a reply cannot arrive into a conversation the player
has moved on from.

Verified in the client's tests and against a real turn. The client suite is 30
tests, thirteen of them this ticket's, all faking the network at the fetch
boundary with a response stream the test writes frame by frame: the question
showing before the server confirms it and the POST carrying it; the turn as the
server reports it, with cards before prose and the answer in pieces; the stored
turn replacing the live one when the turn ends, with the conversation refetched
and the question and answer appearing exactly once; a stage failure naming the
stage, dropping the half-written answer and keeping the question; a refusal
before the stream surfacing the server's own message; one request at a time, with
the composer out of action and saying so; an answer with no cards showing no
grid; each piece of the answer announced on its own; a frame split across two
pieces; a frame the contracts refuse; a conversation read back mid-turn not
doubling the question; and leaving the conversation aborting the turn. The full
suite is 317 tests.

Live in Chrome against a real turn: the store seeded beside the real
25,895-card index, the server on its own port pointed at the maintainer's Ollama,
and the whole turn run through the composer. The question appeared at once with
the field and Send out of action and the status announcing the work; the answer
arrived in pieces; eight cards arrived as links with their images; and when the
turn ended the live region was gone, the stored turn stood in its place with its
line breaks kept, the prose capped at 68 characters, the grid at three columns in
that window, and the field ready again. Run against a conversation whose model is
not installed, the turn was refused before the stream and the server's own
sentence appeared in the composer, with the question kept.

**Notes for later:** The conversation screen now carries three amber marks at once
(the sidebar's New fill, the composer's field wash, and Send), against the record's
"more than one filled control per screen is usually one too many". The field's
wash is a wash and the two fills belong to two regions, so the record says that
is the limit until the question is decided; deciding it is a design decision of
its own. Enter inserts a line break rather than sending, because the request may
span lines: the keyboard path is the field and then Send, and ticket 35 owns the
accessibility pass that will judge it. The frame reader splits on a blank line and
would not split a `\r\n` body, which this server does not send. A turn the client
abandons still runs to completion on the server and is stored, which is what makes
the conversation whole when the player comes back; whether the server should stop
instead is a question about the turn rather than about this client.
