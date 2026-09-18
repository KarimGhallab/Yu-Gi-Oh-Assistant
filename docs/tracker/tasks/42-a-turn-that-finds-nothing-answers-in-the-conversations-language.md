# 42 - A turn that finds nothing answers in the conversation's language

**What to build:** When a search comes up with no cards, the reply is written in
the conversation's language rather than always in English, so the answer to an
empty search reads in the language the player chose, the way every other reply
does.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-17)

- [x] An empty search in a French conversation replies in French, and an English
      conversation still replies in English.
- [x] The reply is the fixed sentence for that case rather than something a
      model writes.
- [x] Both languages are covered by a test.
- [x] Build and lint pass.

**Notes:** Ticket 28 recorded this as the gap this spec owns: the reply a turn
gives when nothing matched is English whatever the conversation's language, and
it is deliberately not left to a model to improvise. That makes the French
sentence a piece of product copy to be written and reviewed rather than
translated by the machine.

**Outcome:** The sentence a turn gives when the search found nothing is now a
table keyed by the language the catalog is indexed in, so the copy cannot fall
back to English quietly: a language the catalog gains fails the type check until
someone writes what an empty search says in it.

The French is written rather than translated, in the same voice as the English
and in the same register, and it is the maintainer's to review because it is a
sentence a player reads:

`Je n’ai trouvé aucune carte qui corresponde à cette demande. Essayez d’élargir
votre recherche.`

A test covers it beside the English one: a conversation created in French, an
empty search asked in a way that needs no parse, and the reply in French and not
in English, with the model having been called exactly once, for the parse, which
is what makes it the fixed sentence rather than the model's. The type check, 356
tests across 32 files, lint, build, formatting, the dependency rules over 148
modules and 382 dependencies, and the unused-code report at exactly its previous
findings all pass. No interface changed, so the design record did not.

Verified live against the real index on a scratch store with the index symlinked:
a French conversation asking for cards with an attack of 9999 or more was
answered `Je n’ai trouvé aucune carte qui corresponde à cette demande. Essayez
d’élargir votre recherche.` over an empty card grid, and the same request in an
English conversation was answered with the English sentence.
