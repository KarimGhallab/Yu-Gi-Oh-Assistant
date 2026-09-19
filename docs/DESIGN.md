---
name: Yu-Gi-Oh Assistant
description: A local, grounded card-suggestion chat over a 25,895-entry bilingual catalog.
colors:
  surface: 'oklch(14.5% 0 none)'
  surface-panel: 'oklch(20.5% 0 none)'
  rail: 'oklch(26.9% 0 none)'
  ink: 'oklch(97% 0 none)'
  ink-muted: 'oklch(70.8% 0 none)'
  ink-faint: 'oklch(65% 0 none)'
  accent: 'oklch(76.9% 0.188 70.08)'
  accent-hover: 'oklch(82.8% 0.189 84.429)'
  accent-ring: 'oklch(87.9% 0.169 91.605)'
  accent-ink: 'oklch(27.9% 0.077 45.635)'
  danger: 'oklch(70.4% 0.191 22.216)'
typography:
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif'
    fontSize: '18px'
    fontWeight: 600
    lineHeight: '28px'
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: '20px'
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif'
    fontSize: '14px'
    fontWeight: 500
    lineHeight: '20px'
  mono:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    fontSize: '12px'
    fontWeight: 400
    lineHeight: '16px'
rounded:
  base: '0.25rem'
spacing:
  base: '0.25rem'
  '2': '0.5rem'
  '3': '0.75rem'
  '4': '1rem'
  '6': '1.5rem'
  '8': '2rem'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.base}'
    padding: '6px 10px'
    typography: '{typography.label}'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
  nav-row:
    textColor: '{colors.ink-muted}'
    rounded: '{rounded.base}'
    padding: '6px 8px'
    typography: '{typography.body}'
  nav-row-active:
    backgroundColor: '{colors.rail}'
    textColor: '{colors.ink}'
  brand-mark:
    textColor: '{colors.ink}'
    typography: '{typography.label}'
  pane-header:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.title}'
    padding: '16px 24px'
  pane-setting-label:
    textColor: '{colors.ink-faint}'
    typography: '{typography.body}'
  pane-setting-control:
    textColor: '{colors.ink-muted}'
    typography: '{typography.body}'
  bench-heading:
    textColor: '{colors.ink}'
    typography: '{typography.title}'
  bench-words:
    textColor: '{colors.ink-muted}'
    typography: '{typography.body}'
  notice-panel:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    padding: '32px'
  alert-line:
    textColor: '{colors.danger}'
    typography: '{typography.body}'
  card-tile:
    borderColor: '{colors.rail}'
    backgroundColor: '{colors.surface-panel}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
  card-tile-hover:
    borderColor: '{colors.accent}'
  card-detail:
    backgroundColor: 'oklch(14.5% 0 none / 0.7)'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
  card-detail-source:
    textColor: '{colors.ink-muted}'
    typography: '{typography.mono}'
  message-label:
    textColor: '{colors.ink-muted}'
    typography: '{typography.label}'
  message-prose:
    textColor: '{colors.ink}'
    typography: '{typography.body}'
  message-prose-link:
    textColor: '{colors.ink}'
    typography: '{typography.body}'
  message-searched-as-label:
    textColor: '{colors.ink-faint}'
    typography: '{typography.mono}'
  message-searched-as:
    textColor: '{colors.ink-muted}'
    typography: '{typography.mono}'
  message-unanswered:
    textColor: '{colors.ink-muted}'
    typography: '{typography.body}'
  message-unanswered-action:
    textColor: '{colors.ink}'
    typography: '{typography.body}'
  message-searched-with:
    textColor: '{colors.ink-faint}'
    typography: '{typography.mono}'
  composer-field:
    backgroundColor: '{colors.surface-panel}'
    textColor: '{colors.ink}'
    borderColor: 'oklch(76.9% 0.188 70.08 / 0.25)'
    rounded: '{rounded.base}'
    padding: '8px 12px'
    typography: '{typography.body}'
  composer-field-placeholder:
    textColor: '{colors.ink-faint}'
  search-readout-field:
    textColor: '{colors.ink-faint}'
    typography: '{typography.mono}'
  search-readout-ask:
    textColor: '{colors.ink-muted}'
    typography: '{typography.mono}'
  search-readout-offer:
    textColor: '{colors.ink-muted}'
    typography: '{typography.mono}'
  search-readout-note:
    textColor: '{colors.ink-muted}'
    typography: '{typography.mono}'
  search-readout-control:
    backgroundColor: '{colors.surface-panel}'
    textColor: '{colors.ink}'
    borderColor: 'oklch(76.9% 0.188 70.08 / 0.25)'
    rounded: '{rounded.base}'
    padding: '4px 6px'
    typography: '{typography.body}'
  search-readout-action:
    textColor: '{colors.ink-muted}'
    typography: '{typography.body}'
  nav-row-action:
    textColor: '{colors.ink-muted}'
    typography: '{typography.body}'
  status-line:
    textColor: '{colors.ink-muted}'
    typography: '{typography.body}'
---

# Design System: Yu-Gi-Oh Assistant

## Overview

**Creative North Star: "The Duelist's Workbench"**

A workbench is a surface with the thing you are working on laid out on it, and one
lamp above it. That is the whole system. The surfaces are dark, near-neutral, and
stepped rather than shadowed; the cards are the objects on the bench and get the
room; amber is the lamp, and it appears where something is being offered, chosen,
or focused, and nowhere else. The voice is quiet precision: small type set
tightly, machine facts in mono, hairlines instead of containers, and no ornament
between the player and the cards.

The bench is a direction rather than a finished expression. The incumbent
implementation carries the surfaces, the amber, the density, and the flatness;
the conversation surface, which is where the bench actually shows, is being
built: its history, its grid of framed cards, and the readout of what a search
was understood as are in place, and the amber rail around the active turn and the
model's reading set as marginalia follow.

Flatness is deliberate. Depth is tonal: three steps of near-black do the work
shadows would do elsewhere, and state changes are instant color swaps. Motion is
a small vocabulary rather than none: a few things move, each because the movement
is the change itself, and they are listed under Elevation.

**Key Characteristics:**

- Near-neutral, three-step dark surfaces with no shadows.
- One accent, amber, reserved for action, selection, and focus.
- Density as craft: 14px body text, 12px mono for machine facts, 4px radius.
- Hairline dividers instead of boxes, cards, or shadows.
- The platform's font stack; no webfonts, no imagery in the chrome.
- Keyboard first: every control reachable, focus always visible.

## Colors

A near-neutral dark room with a single warm light. Nothing is chromatic except
the accent and failure.

### Primary

- **Lamp Amber** (`oklch(76.9% 0.188 70.08)`): the only accent. The fill of a
  primary action, the mark on the row that is open, and the halo on a focused
  control. Never a surface, never body text.
- **Lampglow** (`oklch(82.8% 0.189 84.429)`): the same amber, one step brighter,
  used only for the hover state of an amber fill.
- **Halo Amber** (`oklch(87.9% 0.169 91.605)`): the focus ring, and only the
  focus ring.
- **Ember Ink** (`oklch(27.9% 0.077 45.635)`): text on an amber fill. A dark
  amber rather than a neutral black, so the fill reads as one warm object.

### Neutral

- **Room Black** (`oklch(14.5% 0 none)`): the room. The frame's background and
  the surface behind the conversation.
- **Bench Slate** (`oklch(20.5% 0 none)`): the sidebar, and any panel that needs
  to sit above the room without moving forward.
- **Rail Grey** (`oklch(26.9% 0 none)`): the rails: dividers, borders, and the
  fill of the row that is open.
- **Bone White** (`oklch(97% 0 none)`): primary text.
- **Ash Grey** (`oklch(70.8% 0 none)`): secondary text, inactive navigation.
- **Dust Grey** (`oklch(65% 0 none)`): tertiary text and placeholders.
- **Signal Red** (`oklch(70.4% 0.191 22.216)`): failure text. The one color that
  is not the lamp, and it is only ever a sentence about something going wrong.

### Named Rules

**The One Lamp Rule.** Amber marks what is actionable, chosen, or focused, and
nothing else. No amber headings, no amber decoration, no amber dividers. Its
rarity is what makes it read as light. A screen carries one filled control, and
it is the action the screen is for: the composer's Send is the lamp of the asking
surface, on the home surface and in a conversation alike, and the sidebar's New
is a quiet action beside it, because starting a conversation is not the act a
screen built around a prompt is asking for. A dialog that has taken the room is a
region of its own and the only one being read while it is open, so the lamp it
carries is not a second lamp on the screen: the fills behind it are not being
looked at. The prompt's field carries no amber and no border of its own, because
it is a surface rather than an outlined bench, and the focus ring is the only line
ever drawn around it.

**The No Second Accent Rule.** There is no secondary or tertiary color. Failure
is the only exception, it is text only, and it never becomes a fill.

## Typography

**Display Font:** the platform stack (`-apple-system`, `Segoe UI`, `Roboto`, `Noto Sans`, `Arial`)

**Body Font:** the same stack, at 14px

**Label/Mono Font:** `ui-monospace`, `SF Mono`, `Menlo`, `Consolas`

**Character:** the platform's own voice. No webfont is downloaded, so the app
looks native to the machine it runs on: appropriate for a tool that never leaves
that machine. Mono is used for machine facts, not for style: filters, counts,
stats, and identifiers.

### Hierarchy

- **Title** (600, 18px / 28px): the conversation header, and the heading of a
  notice. The largest type in the system.
- **Base** (400, 16px / 24px): the document default. Rarely used directly.
- **Body** (400, 14px / 20px): answers, messages, navigation rows, controls.
- **Label** (500, 14px / 20px): buttons and the brand mark. The brand also
  carries 0.025em of tracking.
- **Mono** (400, 12px / 16px): the interpretation readout, counts, card stats.

### Named Rules

**The No Display Rule.** Nothing shouts. 18px is the ceiling, and there is no
display or headline size to reach for. Hierarchy comes from color, space, and
hairlines, not from scale.

## Layout

The frame is two regions: a sidebar of conversations and the main region. At
48rem and wider the sidebar is a fixed 288px column beside the main region. Below
that it stands over the chat instead: a bar keeps the way in, the name and the way
to start a conversation, and pressing its mark brings the whole sidebar across
with the chat dimmed behind it, because on a narrow window the two cannot want the
width at the same time. The frame is one screen tall at every size and its regions
scroll inside it, so the bar stays where it is when the prompt takes the keyboard.
Every region that scrolls carries the system's own rail rather than the browser's
default, so the scrollbar is part of the workbench and not a strip of chrome
against the window's edge. The main region is the only thing that scrolls
vertically, and a
conversation surface holds one header, one content area, and one prompt docked at
its bottom edge. Until it has anything to say, that prompt stands in the middle
of the region with the requests that can be asked above it, because a
conversation that was started but not spoken in is still the start it was, and it
carries no name of its own yet: the header arrives with the first message, and
until then the sidebar is what identifies the conversation. The prompt moves down
to the foot as the first request is asked. The home surface draws the same bench
under its own title, because typing a request is how a conversation begins:
sending it starts the conversation and asks the request in it. The header carries
the conversation's name and nothing else, because the language its cards are read
in and the model that answers belong to the act of asking: they live on the
prompt's own surface, beside the field they are sent with. That surface is the
only enclosed thing on the screen, and the name is what gives way last when the
window is narrow, because a model's name can be long and it is the title that
says which conversation this is.

Density is set by a 0.25rem spacing base: 0.75rem inside a row, 1rem for panel
padding and control height, 1.5rem for page padding on the horizontal axis, 2rem
for a notice's breathing room. Notice panels cap at 28rem so a sentence never
becomes a line. Structure comes
from 1px hairlines in Rail Grey, not from enclosed boxes.

There is exactly one breakpoint in use, `48rem`. The system is otherwise fluid:
rows truncate, prose wraps, and the card grid reflows to fill the width it is
given, two cards wide on a phone and six or more on a desktop window.

## Elevation & Depth

Flat, and tonal. There are no shadows anywhere in the system and no blur of any
kind, including in the sidebar's own hierarchy. Depth is expressed as surface
steps: Room Black is the room, Bench Slate is a panel standing in it, and Rail
Grey draws the edge or fills the row that is open. A surface that needs to feel
closer moves up one step, not forward.

Motion is the exception, and it has a small vocabulary rather than none. State
changes are instant color swaps; a few things move, and each of them is the
change itself rather than an effect laid over it:

- **The prompt, docking.** Sending the first request of a conversation carries the
  prompt from the middle of the home surface to the foot of the conversation it
  just started, because it is one surface in both places and the move is what says
  so. It takes 420ms on `cubic-bezier(0.16, 1, 0.3, 1)` while the room settles
  faster, 180ms out and 260ms in, so the conversation is already there when the
  prompt lands on it. It keeps its size on the way, because it is one card in both
  places and only its position changes, and the words that were in it are the
  message that appears above it.
- **A card, opening.** Pressing a suggested card carries its printed face from
  the tile to the middle of the room, growing it as it goes, because the tile and
  the face are one object in two states and the move is what says so. It is the
  prompt's own movement: 420ms on `cubic-bezier(0.16, 1, 0.3, 1)`, with the room
  settling faster as it dims, and closing carries the face back down onto the
  tile. The name the two share is on exactly one of them at any moment, the tile
  on the way out and the face on the way in.
- **The composer, stepping aside for a card.** A card's face takes the room, so
  the prompt leaves it: the whole composer, readout and status included, sinks
  toward the bottom edge and fades, and rises back from that edge when the face is
  put down. It is the prompt's own movement in the other direction, 420ms on
  `cubic-bezier(0.16, 1, 0.3, 1)`, carried by the card's transition rather than
  running beside it, and the composer answers the room it is in rather than being
  handed a state to move for.
- **A caret, turning over.** A setting's caret turns while the list it opens is
  open, 150ms, so the control says which of its two states it is in.
- **The sidebar, folding and arriving.** On a wide window the panel's width is
  what changes when the list folds away, so that is what moves: 300ms opening and
  200ms closing, on `cubic-bezier(0.16, 1, 0.3, 1)`, with the list and the rail
  swapping as the panel moves. Its contents are clipped to it while it moves, so a
  label never spills over a panel that has not finished widening. On a narrow one
  the sidebar arrives instead, from the edge it lives on: 200ms on the same curve,
  with the chat dimming behind it in 150ms. Nothing is stacked on either: a
  drawer's shelf does not need a second movement to say it changed.
- **The status line, with a light in it.** While a turn runs, a band of Bone White
  travels through the Ash Grey sentence, one pass every 1.8s, linear, so a line
  that says work is going on is seen to be going on. It is the only loop in the system,
  and it lives only as long as the work it reports. The line is drawn twice to do
  it, the second drawing hidden from assistive technology, so the live region
  still announces the sentence once.

A player who has asked for reduced motion gets the state changes without the
movement: the prompt where it lands and the cross-fade, the card face where it
lands, the composer where it lands, the caret already turned, and the panel
already at its width.

## Browser surfaces

The parts of the screen the system did not draw still carry it. A scrollbar, the
pointer's caret, and the platform's own menu are all surfaces the browser paints,
and left alone each arrives in a grey from no palette and a size from no scale.
They are themed from the palette like anything the app draws itself.

A scrollbar is a rail, and the system has exactly one grey for a rail: its thumb
is Rail Grey and its track is transparent, so the rail is the only thing on it
and nothing is drawn beside the one the player is dragging. It is thin, and it is
thumb-only, with no arrow buttons at its ends. It goes on every region that
scrolls and nowhere else: the request field, the list a setting opens, the
conversation and the bench, and the sidebar's own list and its folded rail. The
standard `scrollbar-width` and `scrollbar-color` properties are what draw it,
because reaching for the browser's non-standard scrollbar pseudo-elements puts
the engine back on the path that draws the arrow buttons and fights the thing it
was meant to remove.

The distinction is not cosmetic. A scrolling region that does not opt in does not
merely get a plainer bar: on a window whose scrollbars are overlaid, the unthemed
bar is drawn wider, in a grey the palette does not contain, and against the edge
of the window rather than the edge of the region, so it reads as chrome that
belongs to the browser and not to the app. Opting in is what makes a scrollbar
part of the workbench.

## Shapes

One radius, 4px, on the things you press or select: buttons, navigation rows,
inputs, small thumbnails. Surfaces, panels, and card images are square-cornered,
and the card images keep their own printed proportions untouched. Nothing is
clipped, rotated, or stacked, and there are no pills except in throwaway tooling.
Borders are never more than 1px, and rectangles are never nested more than one
level deep.

## Components

### Buttons

- **Shape:** 4px radius, 1rem of vertical rhythm (`padding: 6px 10px` at 14px/500).
- **Primary:** Lamp Amber fill, Ember Ink text. The only filled control in the
  app, and there is normally one per screen. A dialog is a screen of its own
  while it is open, so it carries its own.
- **Hover / Focus:** hover steps the fill to Lampglow. Focus draws a 2px Halo
  Amber outline at 2px offset, in addition to nothing else: no shadow, no scale.
- **Secondary / Ghost:** none exist. A second action is a text link at Bone
  White, or an amber text button when it is the primary action of a notice.

### Icons

- **Set:** one hand-drawn set, the platform's voice drawn as geometry rather than
  borrowed from an icon font or a second library. It is a control's mark, never
  decoration.
- **Shape:** a 24-unit drawing box, 1.5px stroke, round caps and joins, rendered
  at 16px, and sitting before the word it belongs to with a 6px gap.
- **Alignment:** a mark beside a word sits on the word's optical centre rather
  than on the box the row centres, so it is raised a pixel at 12px and two at
  14px. A line box is mostly the font's descent, which a word of caps and no
  descenders never fills, so centring the box leaves the mark looking low.
- **Color:** `currentColor`, so an icon is the color of the control it sits in
  and can never introduce one of its own. It is never amber: amber marks the
  action, the selection, and the focus, and a mark inside a control is none of
  those. Set in Ember Ink on the lamp it stays legible without becoming a second
  lamp.
- **Naming:** an icon never carries meaning alone. Where it is the whole control,
  the control is named for what it acts on, and where it sits beside a word, it
  is silent to assistive technology so the word is what is read.
- **Use it for:** the controls of the frame and of the composer, and nothing
  else. The cards, the conversation, and the notices carry no icons.

### Navigation

- **Style:** the conversation list is a `nav` of rows, one per conversation, plus
  a step of space above its first one, because a focused row draws its ring
  outside itself and the first row has the header above it: without the step the
  ring is half-drawn under the header, which reads as a stray line rather than as
  the control that has the keyboard.
  the brand mark, the fold control, and the new-conversation control above it,
  the last of which carries the plus.
- **Default / Hover / Active:** Ash Grey text on the panel; hover lifts the whole
  row to Bone White over a 60% Rail Grey wash; the open conversation takes the
  Rail Grey fill at full strength with Bone White text and `aria-current="page"`
  on its name. The fill belongs to the row rather than to the name, so a row's
  own controls sit on the surface they belong to, and the row draws the focus
  outline for its name: a ring around the name alone would box the row in two.
- **A row's actions:** renaming and deleting sit on the row's own surface, right
  of the name, as two marks in Ash Grey that lift to Bone White when the row is
  pointed at or holds focus, each named for its conversation so a screen reader
  hears "Rename Graveyard toolbox" rather than a list of marks. The word is what
  goes, the name is not, because opacity is not what assistive technology reads
  and neither is a glyph. They are quiet at rest and always in the tab order.
- **Folded:** the fold control collapses the list to a 4rem rail, a column on a
  wide window and a row that scrolls sideways on a narrow one, and folds it back.
  The panel's width is animated, opening slower than it closes, because the width
  is the whole of what changed and the list and the rail swap along with it. Its
  mark points the way the list will go, into the panel to fold it away and out
  of it to bring it back, so the drawing says what the control is about to do
  rather than only that a control was there.
  A folded conversation is a square mark carrying the first letter of its name,
  which is enough to recognise one by and not enough to name it: the mark is
  named for its conversation for assistive technology, and the letter itself is
  the only thing on screen that identifies it. Folding closes a row that was
  being renamed or confirmed, because that field is not on screen in a rail.
- **A folded conversation's name:** pointing at or focusing a mark shows the
  whole name beside it, in a Bench Slate panel with a 1px Rail Grey hairline and
  no shadow, placed from the mark's own box and fixed to the window, because the
  rail scrolls and anything inside it would be clipped by it. The mark is what
  answers, not the rail: pointing at the rail itself does nothing, and no hover
  opens the list. The name is a convenience rather than the way a conversation is
  carried, since the mark is already named for assistive technology, so nothing
  about a conversation depends on hovering.
- **Renaming:** the name is asked for in a dialog, as a deletion is, because the
  row is what is being named and a row that turns into a field stops saying which
  conversation the question is about. The dialog holds the name it has, offered
  selected, so typing replaces it and anything else is one arrow key away, and
  Enter saves it, because a dialog with one field is a dialog whose Enter is Save.
  Escape, Cancel, or an empty name leaves the name it had and puts focus back on
  the row.
- **Deleting:** the one irreversible action asks first, in a dialog of its own
  rather than in the row it was asked from. The row is what the question is
  about, so the row goes on being a row while the question takes the room: a
  question answered in the row would change the list under the eye that is still
  reading it. Nothing else in the app is confirmed. What focus returns to when the
  row is gone is the conversation that took its place in the list, or the control
  that starts a new one when there is no list left.
- **The skip:** on a conversation address the first thing focus finds is a way
  past the list, because the list is as long as the player's history and every row
  has controls of its own. It is a Bench Slate panel that appears over the frame
  while it holds focus, and it lands on the request field, or on the conversation
  itself when there is nothing to ask in yet.
- **Mobile treatment:** on a narrow window the sidebar is a bar and a drawer. The
  bar is what the header becomes: the mark that opens the list, the monogram with
  the name, and the way to start a conversation, on one row across the top of the
  chat. Pressing the mark brings the sidebar across from the edge it lives on, the
  chat dimmed behind it, and the drawer takes the whole height it is given. It
  carries the list and a way out of it, and no header: a header inside would say
  what the bar already says, while a mark at its top closes it, so the list is
  never a place a player is stuck in. The drawer takes the keyboard as it opens and
  gives it back to the mark as it closes. Escape, a press on the dimmed chat, and
  choosing a conversation all close it, the last of those because the drawer
  watches where the player went rather than which control was pressed, and it is
  out of the document's tab order while it is shut rather than merely off screen.
  A touch screen has nothing to hover, so folded marks are not this surface's
  business: there is no rail below the breakpoint, only the list.

### Prose (an answer)

- **What it is:** the assistant's answer, rendered from the Markdown the model
  writes rather than shown as it typed it. What a model may use is asked for in
  its prompt, and what it uses anyway is mapped onto the system here, so an answer
  cannot reach a size, a color, or a container this system does not have.
- **Bold:** the same Bone White at weight 600. Emphasis is weight rather than
  scale, the way the rest of the system carries hierarchy.
- **Headings:** every level a model reaches for comes out at Body scale and weight
  600 in Bone White. It is a heading to a screen reader and never a display size,
  because the conversation's own title is the only thing at Title scale.
- **Lists:** plain, one indent step, markers in Dust Grey, and no box: a list is a
  list rather than another container.
- **Code:** 12px mono in Ash Grey, inline or in a block, because mono is the voice
  of machine facts here.
- **Links:** Bone White with a 1px Rail Grey underline at 2px offset, the
  underline stepping to Lamp Amber on hover, with the recorded focus ring. A link
  is an action, which is what lets it take the lamp, and it opens in a new tab
  like a card's own link. It is the only action the prose carries.
- **Blockquote and rule:** the hairline the system divides with, in Rail Grey,
  with quoted words in Ash Grey.
- **Raw HTML and images:** dropped, never rendered. Nothing an answer carries may
  be a picture this app did not choose, and the only images it loads are the
  cards' printed faces under the answer.
- **An empty search:** an answer that found no cards shows the filters the
  search ran with under the prose, in the readout's own vocabulary and at mono
  scale: the field in Dust Grey and what it asked of it in Ash Grey. It is a
  record rather than a control, set apart by space, because the controls that
  remove a filter are the readout's, below. An answer with cards shows no such
  line: the cards are the result.
- **While it arrives:** the prose is Markdown from the first token, and the
  announcement is drawn apart from it. A visually hidden live region carries one
  node per piece, so a screen reader hears the answer arriving rather than the
  whole of it again on every piece, which is the same drawing twice that the
  status line makes.

### Unanswered request

- **What it is:** the line a request carries when its turn never produced a
  reply, saying that it was not answered, and the one action that asks it again.
  It is a row of the history rather than a notice over the conversation, because
  the request is what it is about and the request is a row.
- **Text:** Body in Ash Grey, the same voice as the rest of the conversation.
- **Action:** the request's retry is a text button at Bone White, underlined in
  Rail Grey and stepping to Lamp Amber on hover, with the recorded focus ring.
  It is the treatment the prose's links and the surfaces' quiet actions share,
  and it is not a fill: the lamp of the screen is still the composer's Send.
- **Keyboard:** the retry is a button, reached by Tab in the order the turn is
  read, and it is not a hover.
- **Searched as:** a request that reported a search before it gave way keeps it,
  because that search is the request's own; a request with none shows no readout,
  because the last one belongs to the answer before it.

### Cards (the grid)

- **Shape:** square corners, 1px Rail Grey border, image at its native
  proportions, never cropped. The frame is sized by the card's printed ratio, so
  a card is never letterboxed by a guess.
- **Background:** the card image is the surface; the frame behind it is Bench
  Slate.
- **Name:** Body, Bone White, under the frame. It is the control's label, so a
  card is announced by its name and the image itself carries no text.
- **Pressing:** a card is a button, not a link. Pressing it opens its printed face
  in the middle of the room, where the effect and the stats can be read, and the
  source link travels with the face rather than sitting on the tile.
- **Selection:** hovering or focusing a card steps its border to Lamp Amber. This
  is the accent doing the work the One Lamp Rule allows it.
- **Layout:** a wrapping grid, `repeat(auto-fill, minmax(9rem, 1fr))` with 0.75rem
  gutters and no sideways scroll. A suggestion is a set to compare, so it reflows
  to two cards wide on a phone and six or more on a desktop window.
- **Missing image:** the frame stands and says so in Body scale, Ash Grey, and
  silent to assistive technology; the name remains, so a card is never an empty
  box.
- **Not in this language:** a card the conversation's language has no printing of
  still appears, saying which language it is in under its name. It is 12px mono
  in Dust Grey, text of its own rather than part of the control, so the card is
  still announced by its name and the note is read after it. Nothing about it is
  a color or a shape, because a card being in the other language is a fact worth
  knowing rather than a warning.

### Card detail (the face opened)

- **What it is:** the printed face of one suggested card, in the middle of the
  room, large enough to read. The card is the whole of the content: the facts the
  tile cannot make legible are on the face itself, so nothing is drawn over it and
  nothing restates it. It is what the tile's own link used to be for, done in the
  room instead of in another tab.
- **Surface:** the room dimmed a step further behind the face, which keeps its
  printed ratio, uncropped and unrounded, inside 78% of the window's height and
  the width it is given. There is no panel and no frame: the card is the object
  and the room is behind it.
- **Chrome:** two controls and nothing else. A close mark at the room's top right,
  drawn in the icon set's stroke, and the card's source as a quiet 12px mono link
  under the face, underlined in Rail Grey and stepping to Lamp Amber on hover. A
  dialog takes the room while it is open, so it carries its own close and its own
  action, and it introduces no second accent: the face and the close stay neutral,
  and only the focus ring lights.
- **Accessible name:** the printed name is already in the face, so the dialog's
  own name is the card's name, visually hidden, and the card is announced by it.
- **Keyboard:** the close mark takes the keyboard as the face opens, Tab stays
  between it and the source, Escape and a press in the room outside call it off,
  and focus goes back to the tile that asked.
- **Motion:** the tile grows into the face and the face shrinks back onto the
  tile, 420ms on `cubic-bezier(0.16, 1, 0.3, 1)`, with reduced motion getting the
  face where it lands with no travel.

### Cards / Containers (panels)

- **Corner Style:** square.
- **Background:** Room Black or Bench Slate, one step apart.
- **Shadow Strategy:** none. See Elevation.
- **Border:** 1px Rail Grey, and only on the edge that separates, usually the
  bottom of a header.
- **Internal Padding:** 1.5rem to 2rem.

### Inputs / Fields

- **Style:** a Bench Slate or transparent field, 4px radius, 14px Bone White
  text, Dust Grey placeholder. The prompt's own field is the surface itself: no
  border and no wash, so nothing is outlined until the keyboard is in it.
- **Focus:** the same 2px Halo Amber outline at 2px offset. There is no inner
  glow and no border-color change. Where a field and other controls share one
  surface, the outline goes on the surface, so the keyboard lights the whole
  prompt rather than a box inside it.
- **A setting in the prompt:** a quiet word on the prompt's surface rather than a
  box. No frame, no fill, and the platform's caret replaced by one drawn at the
  icon set's own stroke, so it is the same mark as the other controls. The text
  is Ash Grey, stepping to Bone White over a Rail Grey surface when it is pointed
  at, and it takes the same 2px Halo Amber outline as every other control. Its
  name is the setting and the value it holds, read as one, so what it is set to
  is never a control that only says what it is for. The whole value is offered
  where it stands, because the control truncates in the layout and who is
  answering should not be behind opening the list.
- **The list a setting opens:** drawn rather than borrowed from the platform, so
  a choice can carry what it is beside its name. It opens above the control, one
  surface step up over the card and carrying no shadow, because this system has
  no elevation to give it and the step is what says it is above. One row per
  choice, the row in force filled a step further and in Bone White, the rest in
  Ash Grey, and a model's note in 12px mono after its name, because what a model
  can and cannot do is a machine fact rather than prose. A row that says a model
  cannot answer is a row that cannot be taken: it is muted and carries no
  highlight, so it reads as unavailable while its note stays readable, rather
  than being dimmed under an opacity that would make the reason the hardest thing
  in it to read. It is not selectable, because offering a choice that cannot work
  is offering a mistake. The keyboard
  walks the list with the arrows, Escape calls it off and comes back to the control,
  picking closes it and comes back too, and moving the keyboard out of it closes
  it without taking the focus anywhere.
- **A setting that failed, or that is not there:** a patch that fails says so
  above the prompt, in the recorded alert line, and the control goes back to what
  the conversation actually holds. A model that cannot produce structured filters
  says so in its own row and again above the prompt as a quiet note, not in the
  alert line, because answering without a schema is a trade the player may have
  chosen knowingly. A model the machine no longer has still shows in the control,
  so it is never blank, and is named above the prompt with what to do about it in
  the alert line, because a conversation left on a missing model is a state to
  see rather than a silence. A model that cannot answer a turn at all is named as
  such in its row and above the prompt in the alert line, because that is not a
  trade the player chose but a dead end. Where there is no conversation yet, the
  model control also offers the machine's own model as a choice, so a
  conversation can be started on whatever the machine answers with rather than on
  a name this app would have had to guess.

### Composer

- **Where:** docked at the bottom edge of the conversation, below the message
  area, with no hairline between them: the surface step is what holds it apart,
  and the focus ring is the only line ever drawn around it. It is the only thing
  on that surface that does not scroll. The home surface carries the same prompt
  without the same footing: it stands nearer the middle of an empty screen. The
  request typed there starts a conversation and is asked in it, which is what the
  sidebar's New does with the request already in hand, and the settings it will
  be run with are chosen there as they are here. Until that conversation exists
  the field keeps its words, so a start that failed leaves the request where it
  was typed. Sending is also when the prompt is seen moving: the card is named in
  the view transition that carries it from the middle of the home surface to the
  foot of the conversation that request just started. A card's face takes the room
  in the same surface, and the composer steps out of it: the whole surface, readout
  and status included, sinks toward the bottom edge and fades, and rises back when
  the face is put down.
- **Surface:** the field and the actions the request is run with share one
  surface, because they are one act rather than a field with a row of controls
  under it. It is the field's own Bench Slate surface grown to hold them: 4px
  radius, no border and no wash, holding itself apart from the room by the
  surface step alone, and the only enclosed thing on the conversation screen.
  The keyboard lights the whole of it rather than a box inside it.
- **Field:** a textarea on that surface, Body text in Bone White, Dust Grey
  placeholder, five lines tall before it scrolls so a request of a few lines can
  be read back at once. Its scrollbar is the system's own rail, thin, without a
  track, thumb only, and in Rail Grey, like every other scrollbar in the app.
  Opening the app, as much as opening a conversation, puts the keyboard in this
  field, because arriving is how a player comes to ask, so no address needs a
  further stop to start typing. Enter sends and Shift+Enter is a line, because a
  prompt that is one surface with its Send is a prompt whose Enter belongs to the
  Send; the Send control carries the word as well, for the pointer and for anyone
  who does not know the key.
- **The actions:** on the same surface, under the field: the language the cards
  are read in at its left edge, and the model that answers beside the Send at its
  right, so what the request will be run with is read in the same glance as the
  request. Both are quiet words rather than boxes, and each opens its list above
  itself, into the room rather than over the Send it stands beside. The model's
  name can be long, so it is the field that keeps the width and the name that
  gives way.
- **Send:** the primary button, the filled lamp of this surface, carrying the
  arrow. It is out of action while a turn runs, while the field stays usable so
  the next request can be written as the answer arrives.
- **Status:** Body, Ash Grey, the last line above the surface, as a live region.
  It says the turn is running, and how the search was arrived at when the request
  could not be turned into filters; it is empty when nothing is running. While the
  work is going on, a light passes through what it says: the sentence is drawn
  again in Bone White behind a moving mask, so the line reads as busy without
  anything about it blinking. It is the only moving thing on the surface, and it
  stops when the work does. It sits with the readout and the alert lines rather
  than beside the Send, because the Send is on the prompt's surface now and a
  sentence of moving text beside it would crowd the actions that belong there.
- **Readout:** what the last search was understood as, on its own line above the
  field, in 12px mono. One fact per filter: the field it constrains in Dust Grey
  and what it asks of that field in Ash Grey, set apart by space and nothing
  else, so a filter never becomes a pill or a box. A fact is written as a
  sentence: the field starts it, so the field carries the capital, and the value
  after the operator stays lowercase, which is how `Attribute is dark`, `Type is
normal monster` and `Race is beast-warrior` are read. The catalog's own value
  words are the ones lowered, because the line is machine facts and a shouted
  `DARK` in it reads as a second kind of thing; a value the player typed, such as
  an archetype, is left exactly as they wrote it. Each fact is also the control
  that corrects it, lifting to Bone White on hover and taking the focus ring,
  because the player is the one who knows what they asked for, and the readout
  offers beside them the filter the request never named, because a request the
  model read wrongly is not the only search a player wants to run. The offer
  carries the set's plus, since it is one more of something, and wears the line's
  own 12px mono in Ash Grey, because it is an action read on a line of machine
  facts rather than a thing apart from them. The facts beside it carry nothing: a
  mark on a fact would say it was a control before it was a fact. Either way the
  set they have said is what the next turn is searched with instead of the
  request being read again. A search that carried no filters says only that, and
  a turn that reported it could not understand the request says so and repeats
  the words it fell back on. It is not a second live region: the status line is
  what announces a turn, and the readout is what is left on screen once the turn
  is over.
- **Searched as:** the words a request was searched with, when the parse rewrote
  it into card wording rather than searching the player's own. It sits under the
  request it answered, in the readout's 12px mono, for everyone: the words a
  search ran on are the request's own claim, so they do not wait for a pointer,
  and a player reading by keyboard or on a touch screen reads them the same as
  one pointing at the turn. A request whose search ran on the player's own words
  has nothing to show: the readout already says it was searched as written.
- **A filter being corrected or added:** the readout becomes the controls that
  say it: the field it constrains, then the operator and the value, gathered the
  way that field takes them: a fixed set where the domain has one, the catalog's
  own list for an archetype, whose hundreds of values only the index knows, and a
  number inside the bounds the field runs between where the field is a stat, so a
  level cannot be asked for above 12 nor a stat above 9000. A value the catalog no
  longer lists is still offered, so a stored filter can be read back and kept
  rather than quietly lost. Correcting fixes the field, because the field is the
  part the readout is sure of, and adding offers the fields the search supports,
  gathering the next operator and value the way the field that was chosen takes
  them. They wear the recorded field treatment at 14px, because a control is read
  by a person rather than by the parser, and they are one group with Save or Add,
  Remove when there is one to remove, and Cancel beside them, each carrying the
  set's mark before its word: the tick on the one that keeps the filter, the bar
  on the one that takes it away, and the cross on the one that makes nothing.
  A mark sits beside its word rather than instead of it, so the word is what the
  group says and the mark is only what it looks like. Escape calls the whole
  thing off. The keyboard comes back to the fact the
  controls were about, which is the last one when it was just added, or to the
  request field when the last filter was the one taken away.
- **Failure:** the alert line above the field, because the composer is the control
  the failed turn came from. The field stays usable, so the player can ask again.

### Dialog (the question a row's control asks)

- **Shape:** the room dimmed a step further and the question centred in it, on a
  Bench Slate surface at a 4px radius, capped at 28rem so a sentence never becomes
  a line. No shadow: the dimmed room is what says the dialog stands above it.
- **Heading:** Title, Bone White, and the question itself: "Delete this
  conversation?", "Rename this conversation?".
- **Body:** what the question needs to be answered: the words of a deletion, with
  the conversation's own name in Bone White and the irreversibility said there
  rather than in the color of a control, because this system has no red fill and
  these words are read anyway; or the field a new name is typed in, on the
  recorded field treatment, taking the width it is given and holding the name it
  has.
- **Actions:** exactly two, together at the dialog's right: the answer that
  changes nothing as a plain text button in Bone White, and the answer that acts
  as the lamp. It is the only region being read while it is open, which is what
  lets it carry a fill of its own.
- **Keyboard:** the keyboard is put on the dialog itself, and the surface draws
  the focus ring, so the region that just took the room is shown to be the one
  holding the keyboard whether the dialog was opened by pointer or by key. The
  first thing it offers, the field of a question about a name or the answer that
  changes nothing of a question about a deletion, is one Tab away, and the
  keyboard stays among what the dialog offers rather than walking off into a list
  that is not being read. Escape, and a press anywhere in the room outside, call
  the whole thing off. Focus goes back to the row that asked, which the list
  owns.
- **Use it for:** the two things a row's own controls ask that need the room: a
  deletion, and a name. Anything that can be answered without it is answered in
  the row it is about.

### Notice Panel (empty state, missing conversation, failure)

- **Shape:** a centred column, nothing enclosed, maximum 28rem of body text.
- **Heading:** Title, Bone White, when the notice is the whole page. A notice
  standing in for content inside a page is below that page's own heading, so it
  takes a `h2` at the Label scale instead and the page keeps a single title.
- **Body:** Body, Ash Grey.
- **Action:** one primary button or link, or none.
- **Use it for:** everything that stands in for content that is not there, so a
  conversation that is opening, one that does not exist, and one that could not be
  opened all speak in the same voice. The empty surface is not one of these: it is
  the bench, which is content rather than something standing in for it.

### Bench (the home surface and an empty conversation)

- **What it is:** the workbench before there is anything on it: the request to be
  typed as the object, and the requests that can be asked as its tools. The home
  surface and a conversation with nothing in it draw the same one, because a
  conversation that was started but not spoken in is still the start it was.
- **Composition:** a centred column. The title and its words, then the requests,
  then the prompt. The prompt keeps the width it has at the foot of a
  conversation, because the two are one card and the move between them is what
  says so; only the words and the tools are held to a 28rem measure and centred.
- **Title:** Title scale in Bone White. The home surface carries it, and so does a
  conversation with nothing in it: a conversation has no name until it has
  something to name, so its header holds off and the bench keeps its own title
  instead. The sidebar still names the conversation while it is empty.
- **Words:** Body in Ash Grey, one line: they say what to do, not what the tool
  is.
- **Tools:** the requests themselves, as plain text in Ash Grey, stepping to Bone
  White when pointed at, because a request is something to say and four of them as
  fills would be four lamps. They sit above the prompt, so what can be asked is
  read before the field it is typed in. Fifty are kept and four are drawn
  from them, without repeating, once per surface, so a player who comes back meets
  a different handful, and none of them is a card they had to know the name of
  first.
- **Leaving:** asking a request fills the bench, so the prompt is carried down to
  the foot of the conversation it just filled, in the movement the home surface
  already makes. The bench is drawn only when the conversation is at rest: a
  request handed over from the home surface is already on its way and its prompt
  lands at the foot rather than passing through the middle.

### Alert line

- **Style:** Body size, Signal Red, sitting beside the control that failed.
- **Use it for:** the message the server gave, verbatim. Never a rewrite, never a
  code, and never an amber or neutral color.

## Do's and Don'ts

### Do:

- **Do** keep amber for the action, the open row, and the focus ring, and count
  the amber elements on a screen; more than two is usually one too many.
- **Do** step surfaces by one token (Room Black, Bench Slate, Rail Grey) when
  something needs to come forward, and keep them square.
- **Do** use 1px Rail Grey hairlines to separate, and cap notices at 28rem.
- **Do** set machine facts (filters, counts, card stats, identifiers) in 12px
  mono, and everything a person reads in the platform stack.
- **Do** give a new full-page surface its own Room Black background. The frame
  carries it today and the document body stays transparent.
- **Do** keep every control reachable by keyboard with a visible 2px Halo Amber
  outline, and keep `aria-current` on the open conversation.
- **Do** keep an icon at 16px on a 1.5px stroke, the color of the control it
  sits in, beside the word it belongs to, or named for what it acts on when it is
  the whole control. The set is hand-drawn, and it does not grow a second weight,
  a fill, or a second size.
- **Do** keep the pointer's affordances the pointer's: a folded conversation's
  mark, the fold control, and the list itself are each reachable without hovering,
  so no name and no conversation is behind a hover.

### Don't:

- **Don't** introduce a second accent, a gradient, or a colored heading; the
  one exception is Signal Red as text about a failure.
- **Don't** go above 18px anywhere. If something needs more weight, change its
  color, its space, or its hairline instead.
- **Don't** add shadows, blur, or elevation effects. If a surface needs to
  communicate hierarchy, use a tonal step.
- **Don't** add motion without deciding the motion question first; the system is
  instant today by design, not by accident.
- **Don't** introduce a webfont, an icon font, or an icon as decoration. The set
  is hand-drawn, one stroke weight, and it marks controls only: the cards, the
  conversation, and the notices carry no icons at all.
- **Don't** crop, round, tilt, or restyle a card image. The card is a record of a
  real object and keeps its printed proportions.
- **Don't** use a box, a card container, or a nested rectangle where a hairline
  and a spacing step would do.
- **Don't** put a filter in a pill, a tag, or a box. A filter is a mono fact set
  apart by space, and where it is a control it is the fact itself rather than a
  container drawn around it.
