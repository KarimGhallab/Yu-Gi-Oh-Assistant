# 31 - The chat frame, the sidebar, and the conversation route

**What to build:** The app becomes a chat. A player sees a sidebar of past
conversations with the one they are in marked, a control to start a new one, and
the chat itself beside them. Opening a conversation from an address works,
including after a reload or from a bookmark; an address that names no
conversation says so rather than showing a broken screen; and starting a new
conversation creates it and opens it. This is also where the one place that talks
to the server lands, so every later ticket calls it instead of reaching for the
network itself.

**Blocked by:** 29 - The client's toolchain is ready.

**Status:** Resolved (2026-09-16)

- [x] A player sees a chat frame with the conversation sidebar and the chat
      area, and can reach the controls in both without a mouse.
- [x] The sidebar lists the conversations that can be reopened, newest first,
      and marks the one that is open.
- [x] Starting a new conversation creates it on the server and opens it at its
      own address.
- [x] Opening that address shows that conversation, and a reload or a bookmark
      opens the same one.
- [x] An address that names a missing or malformed conversation says so and
      offers a way back, rather than showing an empty screen or failing.
- [x] A failed request surfaces the server's own message as something a player
      can read, and a response that does not match the shared contract is
      refused rather than trusted.
- [x] Tests fake the network at the fetch boundary and assert what is rendered:
      the list, the marked conversation, and a new conversation being opened.
- [x] The layout stays usable in a narrow window, with the sidebar not covering
      the chat.
- [x] Build and lint pass.

**Notes:** Ask the maintainer to install the router and the server-state library
the spec names (React Router and TanStack Query). The empty state's example
prompts, the message history, and the card grid are ticket 32; this one renders
the frame, the navigation, and the shared API client. A conversation is created
only when the player asks for one, so the root address and an unknown address
show the empty state rather than creating a conversation on arrival, which would
litter the sidebar with untitled rows.

Which conversation is open belongs in the address rather than in client state,
so a reload is the same as a first visit. The scaffold's API status line goes
away with this ticket: a request that fails is what a player sees now, and each
surface says so in its own place.

**Outcome:** The app is a chat. The sidebar lists what the server has, marks the
conversation that is open, and starts a new one; the address carries which
conversation is open, so a reload, a bookmark, or a shared link is the same as a
first visit; and an address naming a conversation that is not there says so with
the way back to the conversations. The conversation page shows the conversation
it fetched, and the placeholder where the history goes is ticket 32's to fill.

The one way to the server landed as a transport plus the conversation endpoints.
The transport validates every answer with the shared contracts before anything
downstream can see it, and refuses an answer the contracts do not describe rather
than trusting it. It reports three kinds of failure, because the surfaces need to
tell them apart: a server that could not be reached, a server that refused, which
carries the server's own message and the status, and an answer the client cannot
read. It asks for "something with a parse method" rather than naming zod, so the
client depends on the contracts package and not on how its schemas are built. The
wrapping request carries the caught cause, so a server that is down and a
contract that drifted can be told apart while debugging.

Three behaviours were decided rather than inherited. Queries do not ask a server
again once it has answered: the library's default would have retried a missing
conversation and a failing index three times over roughly seven seconds, showing
the player "One moment" instead of what happened, so only a server the client
could not reach at all is asked again, and only twice more. Queries run whatever
the browser believes about the network, because the server is on this machine
either way. And starting a conversation refreshes the sidebar without holding the
navigation behind that request.

A conversation that was never named is presented as "New conversation" wherever
it appears, which is the same word the control that starts one uses, since a
conversation is named by its first message and a fresh one has none. That control
reads "New" and is named "New conversation" for assistive technology, so the
product's name is not truncated to make room for a two-line button. A missing or
malformed id takes the same path, because the client does not restate the
server's rule for what an id may be: it asks, and shows what the server said.

Verified in the client's tests and in a browser. The client suite is 24 tests:
six over the transport (a parsed answer, a refusal carrying the status and the
message, a body that is not JSON, a payload the contract does not describe, a
server that cannot be reached, a refusal that explains nothing), three over the
query client's retry policy, and twelve over the chat, all faking the network at
the fetch boundary and asserting what is rendered: the list in the server's
order, the marked conversation found by its current-page marker, starting one and
landing on it, opening one at its address, the empty state not starting anything,
the missing conversation and the way back, the server's message for a failed
request, a refused contract whose payload is not rendered, the same message
beside the control when a create fails, a failed conversation opening that asks
again on request, a malformed address, and the keyboard path through the frame.

Live in Chrome against the running server, with three seeded conversations: the
sidebar listed them newest first with the untitled one labelled, the open one
marked, and a long title truncated; `/c/999` answered "That conversation does not
exist" with the server's own message and the way back, with the sidebar still
usable beside it; and the frame measured as intended at both widths, with the
sidebar stacked above the chat at a 500 pixel viewport, nothing overlapping, and
a 288 pixel sidebar beside a chat that starts where it ends at 1280.

**Notes for later:** A reload or a bookmark of a conversation address needs the
host to serve the client for unknown paths, which is deployment work for spec 10,
along with the icon the browser asks for and does not get today. The transport
turns a successful empty body into an unreadable answer, which will matter when
deleting a conversation answers with no content in ticket 34. The keyboard test
asserts an exact tab order, which ticket 33 will have to revisit when the
composer joins the frame.
