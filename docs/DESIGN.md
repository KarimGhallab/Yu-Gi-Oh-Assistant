---
name: Yu-Gi-Oh Assistant
description: A local, grounded card-suggestion chat over a 25,895-entry bilingual catalog.
colors:
  surface: 'oklch(14.5% 0 none)'
  surface-panel: 'oklch(20.5% 0 none)'
  rail: 'oklch(26.9% 0 none)'
  ink: 'oklch(97% 0 none)'
  ink-muted: 'oklch(70.8% 0 none)'
  ink-faint: 'oklch(55.6% 0 none)'
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
  message-label:
    textColor: '{colors.ink-muted}'
    typography: '{typography.label}'
  message-prose:
    textColor: '{colors.ink}'
    typography: '{typography.body}'
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
  search-readout-note:
    textColor: '{colors.ink-muted}'
    typography: '{typography.mono}'
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

Flatness is deliberate and the system has no motion yet. Depth is tonal: three
steps of near-black do the work shadows would do elsewhere, and the only
transition in the app is a color change that happens instantly.

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
- **Dust Grey** (`oklch(55.6% 0 none)`): tertiary text and placeholders.
- **Signal Red** (`oklch(70.4% 0.191 22.216)`): failure text. The one color that
  is not the lamp, and it is only ever a sentence about something going wrong.

### Named Rules

**The One Lamp Rule.** Amber marks what is actionable, chosen, or focused, and
nothing else. No amber headings, no amber decoration, no amber dividers. Its
rarity is what makes it read as light. The conversation screen is where the rule
is under the most pressure, because it shows the sidebar's New fill, the
composer's field wash, and the composer's Send fill at once. The wash is a wash
rather than a fill, and the two fills are the primary action of two different
regions; whether one screen should carry two filled controls at all is
undecided. Until it is, two fills in two regions is the limit, and a wash is the
whisper that does not count as a lamp.

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
  Prose is held to about 68 characters per line.
- **Label** (500, 14px / 20px): buttons and the brand mark. The brand also
  carries 0.025em of tracking.
- **Mono** (400, 12px / 16px): the interpretation readout, counts, card stats.

### Named Rules

**The No Display Rule.** Nothing shouts. 18px is the ceiling, and there is no
display or headline size to reach for. Hierarchy comes from color, space, and
hairlines, not from scale.

## Layout

The frame is two regions: a sidebar of conversations and the main region. At
48rem and wider the sidebar is a fixed 288px column beside the main region; below
that it stacks above it, capped at 16rem with its own scroll, so it never covers
the chat. The main region is the only thing that scrolls vertically, and it holds
one header, one content area, and (on the conversation surface) one composer
docked at its bottom edge.

Density is set by a 0.25rem spacing base: 0.75rem inside a row, 1rem for panel
padding and control height, 1.5rem for page padding on the horizontal axis, 2rem
for a notice's breathing room. Notice panels cap at 28rem so a sentence never
becomes a line; prose caps at 68 characters for the same reason. Structure comes
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

Motion is deliberately absent: state changes are instant color swaps. Whether
the system should grow a small transition vocabulary is an undecided decision
rather than a prohibition, so nothing here forbids motion; nothing adds it yet
either.

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
  app, and there is normally one per screen.
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
  Its mark points the way the list will go, into the panel to fold it away and out
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
- **Renaming:** the row becomes a field holding the name it has, with Save and
  Cancel. Opening it moves focus into the field and selects the name, so typing
  replaces it and Enter saves it; Escape, Cancel, or an empty name leaves the
  name it had and puts focus back on the row.
- **Deleting:** the one irreversible action asks first, in the row itself rather
  than in a dialog: the row asks the question and offers Delete and Cancel, the
  confirmation is what the Delete control is described by, and focus moves to it.
  Nothing else in the app is confirmed. What focus returns to when the row is
  gone is the conversation that took its place in the list, or the control that
  starts a new one when there is no list left.
- **The skip:** on a conversation address the first thing focus finds is a way
  past the list, because the list is as long as the player's history and every row
  has controls of its own. It is a Bench Slate panel that appears over the frame
  while it holds focus, and it lands on the request field, or on the conversation
  itself when there is nothing to ask in yet.
- **Mobile treatment:** the sidebar stacks above the conversation rather than
  sitting beside it, because the two want the width. Folded there it is the header
  row and one row of marks, with a mark's name shown below it rather than beside
  it. A touch screen has nothing to hover, so there the marks are the control and
  the fold control is what opens the list. The list scrolls inside the sidebar's
  16rem cap.

### Cards (the grid)

- **Shape:** square corners, 1px Rail Grey border, image at its native
  proportions, never cropped. The frame is sized by the card's printed ratio, so
  a card is never letterboxed by a guess.
- **Background:** the card image is the surface; the frame behind it is Bench
  Slate.
- **Name:** Body, Bone White, under the frame. It is the link's label, so a card
  is announced by its name and the image itself carries no text.
- **Selection:** hovering or focusing a card steps its border to Lamp Amber. This
  is the accent doing the work the One Lamp Rule allows it.
- **Layout:** a wrapping grid, `repeat(auto-fill, minmax(9rem, 1fr))` with 0.75rem
  gutters and no sideways scroll. A suggestion is a set to compare, so it reflows
  to two cards wide on a phone and six or more on a desktop window.
- **Missing image:** the frame stands and says so in Body scale, Ash Grey, and
  silent to assistive technology; the name and the link remain, so a card is
  never an empty box.

### Cards / Containers (panels)

- **Corner Style:** square.
- **Background:** Room Black or Bench Slate, one step apart.
- **Shadow Strategy:** none. See Elevation.
- **Border:** 1px Rail Grey, and only on the edge that separates, usually the
  bottom of a header or the top of a composer.
- **Internal Padding:** 1.5rem to 2rem.

### Inputs / Fields

- **Style:** a Bench Slate or transparent field, 4px radius, 14px Bone White
  text, Dust Grey placeholder. On the bench surface the field is bordered in a
  25% amber wash rather than a rail, because that surface is where the player
  acts.
- **Focus:** the same 2px Halo Amber outline at 2px offset. There is no inner
  glow and no border-color change.

### Composer

- **Where:** docked at the bottom edge of the conversation, below the message
  area, separated by a 1px Rail Grey hairline on its top edge. It is the only
  thing on that surface that does not scroll.
- **Field:** a textarea on a Bench Slate surface, 4px radius, one hairline of
  25% amber rather than a rail, Body text in Bone White, Dust Grey placeholder.
  Focus draws the same 2px Halo Amber outline as every other control, and the
  border does not change. Opening a conversation puts the keyboard in this field,
  because opening one is how a player arrives to ask, so the conversation
  address needs no further stop to start typing.
- **Send:** the primary button, the filled lamp of this surface, carrying the
  arrow. It is out of action while a turn runs, while the field stays usable so
  the next request can be written as the answer arrives.
- **Status:** Body, Ash Grey, sitting beside the Send control as a live region.
  It says the turn is running, and how the search was arrived at when the request
  could not be turned into filters; it is empty when nothing is running.
- **Readout:** what the last search was understood as, on its own line above the
  field, in 12px mono. One fact per filter: the field it constrains in Dust Grey
  and what it asks of that field in Ash Grey, set apart by space and nothing
  else, because a filter is a machine fact rather than a control. A search that
  carried no filters says only that, and a turn that reported it could not
  understand the request says so and repeats the words it fell back on. It is not
  a second live region: the status line is what announces a turn, and the readout
  is what is left on screen once the turn is over.
- **Failure:** the alert line above the field, because the composer is the control
  the failed turn came from. The field stays usable, so the player can ask again.

### Notice Panel (empty state, missing conversation, failure)

- **Shape:** a centred column, nothing enclosed, maximum 28rem of body text.
- **Heading:** Title, Bone White, when the notice is the whole page. A notice
  standing in for content inside a page, such as an empty conversation, is below
  that page's own heading, so it takes a `h2` at the Label scale instead and the
  page keeps a single title.
- **Body:** Body, Ash Grey.
- **Action:** one primary button or link, or none.
- **Use it for:** everything that stands in for content that is not there, so the
  empty state, a conversation that does not exist, and a request that failed all
  speak in the same voice.

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
- **Do** use 1px Rail Grey hairlines to separate, and cap prose at about 68
  characters and notices at 28rem.
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
- **Don't** put a filter in a chip, a pill, or a tag. The readout is mono facts
  set apart by space, and a filter is not something the player presses.
