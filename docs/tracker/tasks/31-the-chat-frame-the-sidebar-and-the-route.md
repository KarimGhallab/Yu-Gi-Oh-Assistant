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

**Status:** ready-for-agent

- [ ] A player sees a chat frame with the conversation sidebar and the chat
      area, and can reach the controls in both without a mouse.
- [ ] The sidebar lists the conversations that can be reopened, newest first,
      and marks the one that is open.
- [ ] Starting a new conversation creates it on the server and opens it at its
      own address.
- [ ] Opening that address shows that conversation, and a reload or a bookmark
      opens the same one.
- [ ] An address that names a missing or malformed conversation says so and
      offers a way back, rather than showing an empty screen or failing.
- [ ] A failed request surfaces the server's own message as something a player
      can read, and a response that does not match the shared contract is
      refused rather than trusted.
- [ ] Tests fake the network at the fetch boundary and assert what is rendered:
      the list, the marked conversation, and a new conversation being opened.
- [ ] The layout stays usable in a narrow window, with the sidebar not covering
      the chat.
- [ ] Build and lint pass.

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
