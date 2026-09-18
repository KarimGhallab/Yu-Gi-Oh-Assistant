# 19 - Turn recovery and the empty bench

- **Status:** ready-for-agent
- **Kind:** spec
- **Blocked by:** None
- **Source:** design critique, 2026-09-18

## Problem Statement

A turn does not always finish. The stream can die, the server can fail a stage,
or the player can leave the conversation and come back. When that happens the
conversation tells the player something untrue. The readout above the composer
still shows the previous turn's search as if it belonged to the request that was
never answered, and the unanswered request sits in the history with no reply and
no way to ask it again except by retyping it.

A search that finds nothing is answered with the same sentence every time. It
says to broaden the request without naming anything the player could widen, and
it is the whole answer a failed turn ends on.

Before a search returns cards, the bench is bare. The surface a player first
meets on the home and empty-conversation screens is a prompt and four
sentences, with none of the workbench the product is built around visible yet.

## Solution

Give the conversation an explicit state for a request that was never answered:
say so beside the request, offer to ask it again, and stop presenting the
previous search as if it were its own. Make the empty answer name what to relax
and point at the controls that relax it. Keep the readout and the prompt in view
when there is nothing else to show, so a player who has not been answered yet
still sees the bench rather than a generic chat.

## User Stories

1. As a user, I want a request that was never answered to say so, so I know the
   turn stopped rather than that the assistant ignored me.
2. As a user, I want to ask an unanswered request again with one action, so I do
   not have to retype what I already wrote.
3. As a user, I want the retried request to run the search it ran before, so
   asking again does not change what was being looked for.
4. As a user, I want the readout to stop showing a search that belongs to a
   previous turn, so I am not misled about what will be searched.
5. As a user, I want a search that found nothing to name the filter to relax, so
   I know what to change rather than only that nothing matched.
6. As a user, I want the no-result answer to keep the filters I ran with beside
   it, so the empty result reads as a search that came back empty rather than a
   dead end.
7. As a user, I want to relax a filter from the no-result state, so the recovery
   is an action rather than a hint.
8. As a user, I want a search that ran on my own words, with no filters, to say
   so, so broadening means something specific.
9. As a first-time user, I want the home and empty-conversation screens to show
   what the product is for, so the first screen is not a bare prompt.
10. As a user, I want an empty conversation to keep its prompt and examples in
    view, so I can start without navigating back.
11. As a keyboard user, I want to reach the retry and the relax action without a
    mouse.
12. As a screen-reader user, I want an unanswered request and its retry
    announced as a state, so I hear what happened.
13. As a developer, I want the unanswered state derived from what the server
    stored, so the client does not add a field the server would have to keep.
14. As a developer, I want the empty answer asserted where it is written, so the
    copy is checked in the language it is read in.

## Implementation Decisions

- **The unanswered state is derived, not stored.** A conversation whose last
  stored message is a player request is one whose turn never produced a reply,
  whether the stream died, a stage failed, or the player left and returned. The
  client already holds this: `ConversationPage` knows the stored messages and
  whether a turn is in flight. No contract or database change is introduced.
- **Retry belongs to the request.** The unanswered request carries a control
  that asks it again. Asking again sends the stored request text with the
  conversation's settings, and, when the stored message carries the search it
  ran with, sends those filters as the correction, so the same search is run
  rather than the request being read a second time. It is the mirror of a turn
  that was refused before it started, which today leaves the question on screen
  to be sent again.
- **No stale readout.** While the last stored message is unanswered and no turn
  is running, the composer does not render the previous search as the readout.
  The readout belongs to the answer a search produced, and returns when the
  retried turn reports its own search.
- **The empty answer names the search.** The server's no-result copy is written
  per language, as it is today, and is now given the filters the turn ran with.
  When there were filters, the sentence names the fields that constrained the
  search using the same domain labels the readout uses, and points at the
  readout's controls to remove one. When the search ran on the player's words
  alone, the sentence says so and invites different words. The mechanism is a
  copy builder fed by the search, not a model left to improvise.
- **The filters stay beside a no-result answer.** The turn's interpretation is
  rendered with the answer in the history as machine facts, using the readout's
  own filtering vocabulary, so the empty result shows what was searched instead
  of leaving the bench bare.
- **The empty surfaces keep the bench.** The home surface and an empty
  conversation keep the prompt as the object on the bench and the examples as
  its tools. The composition is recorded in `DESIGN.md` as these states are
  built, so the direction is written down rather than guessed per screen.
- **Failure copy is unchanged.** The stage-named failure line the composer
  already draws stays; this spec ties an unanswered request to a retry rather
  than replacing the alert line.

## Testing Decisions

- Good tests assert what a player can see and do through the whole client. The
  client seam is the existing `AppTest` harness (`renderApp`, `stubFetch`,
  `turnStream`), which renders the real `App` against a stubbed server in
  `apps/web/src/AppTest/`. Prior art: `App.turn.test.tsx`,
  `App.conversationActions.test.tsx`, and `App.history.test.tsx`.
- The server copy is asserted at the existing pipeline seam, where the answer is
  written, so the sentence is checked in its language and not through the client.
- A test proves that a conversation whose last stored message is an unanswered
  request shows the retry, and that the previous search is not rendered as the
  readout.
- A test proves that asking an unanswered request again sends the same request
  text, and, when the stored message carried a search, sends those filters as
  the correction.
- A pipeline test proves the no-result answer names the fields the search ran
  with, that a search with no filters says it ran on the words alone, and that
  each language has its own sentence.
- A test proves the home and empty-conversation surfaces show the prompt and the
  examples when there are no messages.

## Out of Scope

- The other design-critique findings: contrast, dialog focus, the `Searched as`
  reveal, and the two amber fills. They are specs 20 and 21.
- Changing retrieval, ranking, or the cards a search returns.
- The card grid and card detail, which could not be exercised live and are
  judged from source only.
- Any new stored message or field; the unanswered state is derived.

## Further Notes

- The 2026-09-18 design critique is stored under `.impeccable/critique/`. Its
  report is the source of the findings.
- No new glossary term. Request, turn, filters, suggested cards, grounded
  answer, and readout are already domain vocabulary.
- The critique could not render a card grid live, so this spec deliberately
  does not touch the card surface.
