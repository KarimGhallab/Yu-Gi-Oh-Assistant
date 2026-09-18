# Two stages: understand and choose, then answer

A turn runs in two stages. The first stage is deterministic and
machine-readable: the parse turns the request into filters and an optional
rewrite with a JSON schema and temperature 0, and the judgement asks the model
which of the pool really answer the request, also with a JSON shape and
temperature 0. The second stage is the grounded answer: free prose written only
from the cards the first stage kept, at temperature 0, in the conversation's
language. Structured output is the first stage's tool; the answer is prose and
is not constrained by a schema.

Separating _what_ to recommend from _why_ is what the split buys. The suggestion
is an exact, inspectable set of card ids before any prose is written, so the
interface can render the cards while the answer streams, and the player can
correct the filters and run the turn again. The answer is written from those
cards and nothing else, which is what makes a suggested card impossible to
invent. A single call that both chose cards and wrote the answer would have no
set to inspect and no boundary that keeps the model from naming a card it was
never given.

Structured outputs are what make the first stage reliable enough to act on. The
parse and the judgement are validated against their schemas before anything
downstream reads them, and a model that cannot be constrained by a schema is
still handled: the parse falls back to a prompt plus a single repair, and the
judgement to the search's own ranking. A capability Ollama does not report, so
the application decides it per model.

A turn makes several model calls (parse, judgement, answer) rather than one, so
its latency is the sum, and the parse is skipped entirely when the player edited
the filters, because parsing again would overwrite the correction. Each stage
degrades on its own without failing the turn: a parse that gives up becomes a
degraded search on the player's own words, a judgement that fails falls back to
the top of the ranking, and an empty judgement is an honest empty result. The
judgement is a judge and not a ranker: it returns the ids it kept and the cards
keep the order the search ranked them in. A stage that cannot degrade, such as
the search or the answer, fails the turn, which then says which stage gave way
and stores no reply.

## Considered options

One call that picks cards and writes the answer was rejected because the
grounding the product promises depends on the chosen cards being the answer
model's entire input. A free-text parse with no schema was rejected because a
machine-readable first stage is what makes its failure explicable, repairable,
and safe to fall back from. More than one repair was rejected because the turn is
already answerable from the request alone, so a second attempt spends latency on
a model unlikely to comply.
