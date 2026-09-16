# 42 - A turn that finds nothing answers in the conversation's language

**What to build:** When a search comes up with no cards, the reply is written in
the conversation's language rather than always in English, so the answer to an
empty search reads in the language the player chose, the way every other reply
does.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] An empty search in a French conversation replies in French, and an English
      conversation still replies in English.
- [ ] The reply is the fixed sentence for that case rather than something a
      model writes.
- [ ] Both languages are covered by a test.
- [ ] Build and lint pass.

**Notes:** Ticket 28 recorded this as the gap this spec owns: the reply a turn
gives when nothing matched is English whatever the conversation's language, and
it is deliberately not left to a model to improvise. That makes the French
sentence a piece of product copy to be written and reviewed rather than
translated by the machine.
