# 32 - A conversation reopens with its history

**What to build:** Opening a conversation shows what was said in it and what the
assistant suggested. The player's requests and the assistant's answers appear in
the order they happened, and each answer is followed by the cards it was built
from, shown as a grid of images with the card's name and a link back to its
source. A conversation with nothing in it yet shows examples of what can be asked
instead of a blank page.

**Blocked by:** 30 - A reopened conversation returns its turns' cards; 31 - The
chat frame, the sidebar, and the conversation route.

**Status:** ready-for-agent

- [ ] Opening a conversation shows its messages in the order they were said,
      with the player's requests told apart from the assistant's answers.
- [ ] Each assistant turn shows the cards that turn suggested, in the order the
      server ranked them, with the card's image and its name.
- [ ] Each card links to its source, and the link is reachable and labelled
      without a mouse.
- [ ] A card whose image fails to load still reads as a usable item rather than
      an empty box.
- [ ] A conversation with no messages shows example prompts that say what the
      assistant can do.
- [ ] An answer keeps its line breaks, so one written as a list does not
      collapse into a single paragraph.
- [ ] Tests fake the network and assert the rendered history, its order, the
      card names, images, and links, and the empty state.
- [ ] Build and lint pass.

**Notes:** Ask the maintainer for the card package dependency if the grid's
typing needs it. The grid renders a card from the shape the contracts already
carry, so stored turns and the live turn of ticket 33 render through the same
component; a second card renderer for the live case is the thing to avoid. The
filters a turn was searched with are not shown here: displaying and editing them
is feature 09. The empty state's prompts are text in this ticket, and making them
start a conversation is ticket 33, where the composer exists.
