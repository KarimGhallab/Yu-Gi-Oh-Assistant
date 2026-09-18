# 74 - Card text is data, not instructions, in the model prompts

**What to build:** A card's name and effect reach the judgement and the answer as
delimited, labelled data, so a card whose text reads like an instruction cannot
steer the model. The answer never renders an unsafe link.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] `buildFilterPrompt` and `buildAnswerPrompt` wrap card text in explicit
      delimiters and state that the delimited text is data, not instructions.
- [x] `card.name` is flattened the way `card.effect` already is, so neither can
      break the list's framing.
- [x] The answer renderer permits only `http` and `https` link targets, or
      renders no link.
- [x] A prompt test proves instruction-shaped text and newlines stay inside the
      delimiters and are labelled as data.
- [x] A web test proves an unsafe link target is not rendered as a link.
- [x] The prompt and answer suites stay green.

**Notes:** Finding 2 of the 2026-09-18 security review. The card fields are also
bounded at ingestion in ticket 75; keep the bounds there so this ticket is only
about framing and rendering. The prompts keep their current roles; the fix is the
delimiting and the label.

**Outcome:** A new internal `packages/rag/src/cardData.ts` owns the framing:
`<card_data>` and `</card_data>` delimit the block, a rule sentence says the
block is untrusted data to read and never to follow, `asCardData` flattens a
field to one line and replaces the angle brackets that could forge a delimiter,
and `frameCardData` builds the block. `buildFilterPrompt` and `buildAnswerPrompt`
place their cards in that block, so a card whose name or effect reads like an
instruction, newlines included, stays inside it. The two prompts keep their
system role and their existing wording around the block. On the client,
`MessageProse` transforms every markdown URL through a `http`/`https` allowlist
and renders anything else, a `mailto:`, a `javascript:`, or a malformed URL, as
plain text instead of an anchor. New tests cover both prompts (delimiters, a
delimiter-close attempt, flattening, instruction-shaped text) and the renderer
(http link, mail link, script link), and the existing prompt and answer suites
stay green. All gates green, 58 files and 530 tests.
