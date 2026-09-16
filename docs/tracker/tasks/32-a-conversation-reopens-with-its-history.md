# 32 - A conversation reopens with its history

**What to build:** Opening a conversation shows what was said in it and what the
assistant suggested. The player's requests and the assistant's answers appear in
the order they happened, and each answer is followed by the cards it was built
from, shown as a grid of images with the card's name and a link back to its
source. A conversation with nothing in it yet shows examples of what can be asked
instead of a blank page.

**Blocked by:** 30 - A reopened conversation returns its turns' cards; 31 - The
chat frame, the sidebar, and the conversation route.

**Status:** Resolved (2026-09-16)

- [x] Opening a conversation shows its messages in the order they were said,
      with the player's requests told apart from the assistant's answers.
- [x] Each assistant turn shows the cards that turn suggested, in the order the
      server ranked them, with the card's image and its name.
- [x] Each card links to its source, and the link is reachable and labelled
      without a mouse.
- [x] A card whose image fails to load still reads as a usable item rather than
      an empty box.
- [x] A conversation with no messages shows example prompts that say what the
      assistant can do.
- [x] An answer keeps its line breaks, so one written as a list does not
      collapse into a single paragraph.
- [x] Tests fake the network and assert the rendered history, its order, the
      card names, images, and links, and the empty state.
- [x] Build and lint pass.

**Notes:** Ask the maintainer for the card package dependency if the grid's
typing needs it. The grid renders a card from the shape the contracts already
carry, so stored turns and the live turn of ticket 33 render through the same
component; a second card renderer for the live case is the thing to avoid. The
filters a turn was searched with are not shown here: displaying and editing them
is feature 09. The empty state's prompts are text in this ticket, and making them
start a conversation is ticket 33, where the composer exists.

**Outcome:** A conversation opens on what was said in it. The history is the
server's own order, and each turn names its speaker, so a request and an answer
are told apart without relying on alignment: the player's words sit in Ash Grey
and the answer in Bone White, and both keep their line breaks, so an answer
written as a list stays a list. Prose is held to sixty-eight characters while the
cards under it take the width.

The answer's cards are a grid of the cards the turn suggested, in the order the
server ranked them. Each card is one link to the source its facts came from,
carrying the card's name as its label, with the printed face above it in a frame
sized by the card's own ratio, so nothing is cropped. The frame is Bench Slate
with a Rail Grey hairline, and hovering or focusing a card steps that hairline to
Lamp Amber. A card whose image will not load, including one the catalog carries
no image for, keeps its frame, its name, and its link, and the frame says so in
Body scale, silent to assistive technology so the link is still announced by the
card's name alone.

A conversation with nothing in it opens on what can be asked: a notice-scale
heading and four example prompts, in the player's own words, that say what the
assistant can do without describing the feature.

Two decisions were made rather than inherited. The card type is derived from the
message contract rather than imported from the cards package, so the client needs
no new dependency and the grid renders the stored `cards` of a message and the
`cards` of a live turn as the same thing, which is what ticket 33 needs; the
dependency question in this ticket's notes is therefore answered as no. And the
card grid reflows to fill its width instead of being the sideways tray the design
record described, because a suggestion is a set to compare rather than a strip to
browse, and because the server shows eight of them; `docs/DESIGN.md` was
reconciled to the grid, which now also carries the card tile as a component.

The notice panel gained a heading level, because a notice standing in for content
inside a page is below that page's own heading: an empty conversation takes a
`h2` at the label scale so the page keeps a single title at the title scale.

Verified in the client's tests and in a browser. The client suite is 17 tests,
five of them this ticket's, all faking the network at the fetch boundary: the
history in the order it was said with the speakers told apart, an answer's cards
in the order the server ranked them with their images and the first card's source
link, a card whose image fails keeping its name and its link, an empty
conversation's prompts, and the keyboard path from the frame to a card's source
and on to the next card. The full suite is 304 tests.

Live in Chrome against a store seeded beside the real 25,895-card index, with
seven suggested cards: the history read in order with the answer's line breaks
intact, the images hotlinked and loading, the frames carrying the card's own
ratio (measured 421 by 614) with nothing cropped, six columns at 1280 and two at
375, the focused card drawn with the amber outline, and an empty conversation
opening on its prompts. The answer's prose measured as `pre-wrap` with a
sixty-eight character measure.

**Notes for later:** The line-break behaviour has no automated assertion, because
the client suite has no layout engine and asserting a CSS class would pin the
styling rather than the behaviour; it was verified in the browser and belongs
with the Playwright flow spec 10 owns. The keyboard test asserts an exact tab
order, which ticket 33 will have to revisit when the composer joins the frame.
Seeding exposed one wart outside this ticket: a conversation whose first message
spans lines is named with the newline in it, which the sidebar and the page title
truncate but do not collapse, so a title tidier than `truncate` belongs wherever
naming is next touched.
