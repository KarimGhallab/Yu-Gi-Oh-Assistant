# One filter schema, two retrieval modes

A single filter schema in `packages/cards` is the vocabulary shared by the parse
prompt, the parser, the search, and the client's controls, and retrieval has two
modes underneath it rather than one.

The schema names the fields a structured filter can constrain: type, race,
attribute, level, ATK, DEF, link value, link markers, and archetype. Each field
carries only the operators that fit its kind: comparison for the numeric fields,
text for the archetype, equality for the enumerated fields, and containment for
the link markers. The game's own bounds are declared once here, level 1 to 12 and
ATK and DEF 0 to 9000, so the prompt, the parser, the search, and the controls
refuse the same values instead of each holding its own idea of what a card can
be. A filter set is combined with AND and an empty set matches every card, and a
filter on a field a card does not carry never holds. Two equality filters on one
field are a contradiction an AND search can never satisfy, so the group is
dropped rather than left to match nothing; the free text still carries the
alternatives. The vocabulary a prompt is built from is derived from this schema
(`describeFilterFields`), which is what keeps the two from drifting.

One schema is the point: a field the index does not carry can never be filtered
on, and the model, the search, and the interface cannot disagree about what a
filter is. Adding a filterable field is therefore a change to the schema, the
predicates, and the index together, not a change to one of them.

Retrieval has two modes because a request can carry constraints, text, or both.
With free text it embeds the query and asks for the nearest documents, closest
first, by cosine similarity. With filters only it scans the partition and returns
matching rows in a stable identity order, so the same filter-only request is
reproducible. In both modes the structured filters narrow the language partition
before the search runs. `topK` bounds either result, weak matches below
`minScore` are dropped, and the survivors are deduplicated by card id keeping the
best score and ordered by score. A filter-only match has no distance to report
and scores as a certain structural match, so the two scales are not directly
comparable; where relevance has to be judged, the judgement stage does it, not
the score.

The consequences are deliberate bounds. Race is equality-only, because the
source keeps a monster's race and a Spell or Trap's property in one field and a
substring match on it would be wrong more often than right. The frame type is
carried on a card but is not a filter field, so it cannot be searched on. And an
XYZ monster's rank, which is 13 and up, is outside the level bounds, so it cannot
be searched by level; that is accepted rather than papered over with a wider
bound that would let an invalid level through everywhere. The strategy also means
a query with neither text nor filters would return the catalog's arbitrary top
rows, which is why the turn always hands retrieval at least one of the two.

## Considered options

Free-text-only retrieval was rejected because "level 4 dragons" is not reliably a
similarity query, and exact constraints deserve exact matching. Deriving the
prompt's vocabulary by hand, per prompt, was rejected because it drifts from the
schema it is supposed to describe. A single mode that treats filters as words was
rejected because it would give up the reproducible order a filter-only request
deserves and the exactness the filters exist to provide.
