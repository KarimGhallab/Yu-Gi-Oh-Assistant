# 74 - Card text is data, not instructions, in the model prompts

**What to build:** A card's name and effect reach the judgement and the answer as
delimited, labelled data, so a card whose text reads like an instruction cannot
steer the model. The answer never renders an unsafe link.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] `buildFilterPrompt` and `buildAnswerPrompt` wrap card text in explicit
      delimiters and state that the delimited text is data, not instructions.
- [ ] `card.name` is flattened the way `card.effect` already is, so neither can
      break the list's framing.
- [ ] The answer renderer permits only `http` and `https` link targets, or
      renders no link.
- [ ] A prompt test proves instruction-shaped text and newlines stay inside the
      delimiters and are labelled as data.
- [ ] A web test proves an unsafe link target is not rendered as a link.
- [ ] The prompt and answer suites stay green.

**Notes:** Finding 2 of the 2026-09-18 security review. The card fields are also
bounded at ingestion in ticket 75; keep the bounds there so this ticket is only
about framing and rendering. The prompts keep their current roles; the fix is the
delimiting and the label.
