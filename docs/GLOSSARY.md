# Glossary

The glossary of the terms this project uses for its own concepts. It expands the
short normative list in `docs/PRODUCT.md`: where the two disagree about a term,
the product doc wins, and a missing term is a gap in this file, not permission to
invent a new word. Code and docs use these terms with
these meanings, so a second name for an old idea is a defect.

Two families live here. The game's own terms come from the card data. The
application's terms describe what a turn does, from the request to the answer.

## The cards (the data)

- **Card** (or **card entry**): one card in one language, the unit the catalog
  stores and an answer may mention. Its shape is `cardSchema` in
  `packages/cards/src/card/schema.ts`. A field the source omits for a card kind,
  such as an attribute on a Spell or a level on a Link monster, is absent rather
  than zero.
- **Catalog** (or **card index**): the whole set of card entries, held in a
  local LanceDB table named `cards` (`packages/db/src/catalog/index/cardIndex.ts`).
  It is built once and read-only while the server runs. The current entry count
  lives in `docs/PRODUCT.md`.
- **Language partition**: the rows of one `Language` (`en`, `fr`) inside the
  catalog. A search never steps outside the active partition, and the same card
  id appears once per partition that carries it.
- **Suggestable card**: a card the catalog is allowed to offer. Tokens and Skill
  Cards are dropped when the dump is converted (`NON_SUGGESTABLE_TYPES`), so they
  can never be suggested.
- **Card id**: the source's own identifier, shared by a card's rows across
  language partitions. It is what deduplicates search results and what a turn
  stores when it suggests a card.
- **Type** (`CardType`): the source's card type verbatim, such as `Normal
Monster` or `Spell Card`. A filter field.
- **Frame type** (`FrameType`): the source's coarser grouping, such as `effect`,
  `xyz`, or `spell`. Carried on the card, but not a filter field.
- **Race** (`CardRace`): the source keeps a monster's race and a Spell or Trap's
  property in one field, and the catalog does the same. One enumerated
  vocabulary of 25 monster races and 7 Spell or Trap properties. A filter field.
- **Attribute** (`CardAttribute`): the monster attribute, such as `DARK` or
  `LIGHT`, present only on monsters. A filter field.
- **Level**: the printed level, absent rather than zero when the source reports
  none, since a Link monster reports 0 and that is not a level. A filter field,
  bounded 1 to 12.
- **ATK** and **DEF**: the printed stats, absent when the source omits them.
  Each is a filter field, bounded 0 to 9000.
- **Link value** and **link markers**: a Link monster's rating and its arrows
  (`LinkMarker`). Both are filter fields, and markers match by containment.
- **Type line** (`typeLine`): the printed type words, such as `Warrior` and
  `Effect`. Carried, not a filter field.
- **Archetype**: the named family a card belongs to, when it has one. A filter
  field, matched as text.
- **Effect** (`effect`): the card's own text. It is the main semantic payload of
  a card and the bulk of what an answer explains.
- **Document**: the text composed for a card and embedded for search: its name,
  its archetype line, and its effect (`composeCardDocument`). The filterable
  fields are left out on purpose, so a shared attribute does not pull every card
  of a kind together.
- **Embedding** (or **vector**): the model's numeric representation of a
  document, stored alongside the card row.
- **Dump**: the raw YGOPRODeck JSON the catalog is built from. It is not in the
  repository.
- **Populate**: the command that fetches the dump and builds the index in one
  pass (`populateCardIndex`).
- **Dataset version**: a hash of the cards that were indexed
  (`computeDatasetVersion`), so any change to the card data is a new version.
- **Index metadata**: the dataset version, the embedding model, and the vector
  dimensions an index was built with. The boot guard compares it with the running
  configuration, so a stale or mismatched index fails loudly instead of answering
  badly.

## The exchange (request to answer)

- **Request**: what the player asks for, in prose. One request starts one turn.
- **Turn**: one exchange: a stored request, the search it resolved to, the cards
  it found, and the answer it produced. The unit the stream reports.
- **Turn pipeline** (or **pipeline**): the one module that owns the turn's stage
  sequence, resolve, retrieve, select, answer, and yields one neutral event
  stream (`runPipeline`). The turn and the RAG command are adapters over it, and
  the stages themselves are `rag`'s; the server owns the sequence, not the
  stages.
- **Message**: one stored utterance in a conversation, from the player or the
  assistant. A turn writes the player's message first and the assistant's once
  the answer is complete.
- **Conversation**: an ordered set of messages with its own settings and title.
  It holds turns; the store keeps it.
- **Settings**: the language and the model in force for a turn. They belong to
  the conversation and may be overridden per turn, and a turn only ever sees the
  resolved pair.
- **Filters** (or **card filters**): the structured constraints parsed from a
  request, a set combined with AND. An empty set matches every card. The set is
  the vocabulary shared by parsing, retrieval, and the interface.
- **Filter**: one member of that set: a field, an operator that fits the field,
  and a value of the field's kind (`cardFilterSchema`).
- **Filter field** (`CardFilterField`): which card field a filter constrains:
  type, race, attribute, level, atk, def, linkVal, linkMarkers, archetype.
- **Operator** (`FilterOperator`): how a filter compares. Equality (`eq`, `ne`),
  comparison (`gt`, `gte`, `lt`, `lte`), or text (`contains`, `startsWith`,
  `endsWith`). Which ones fit a field follows from the field's kind.
- **Edited filters**: filters the player changed in the readout. The turn uses
  them as they stand and does not parse the request again, because parsing would
  overwrite the correction.
- **Query** (or **free text**): the words a search actually ranks. It may be the
  player's request or the parse's own rewrite.
- **Rewrite** (or **rephrased query**): the parse's wording of the request, in
  the request's language, when it kept one. It is what the turn's search records
  as its `query`, so a reopened conversation shows what was searched.
- **Bounds**: the game's own limits on a numeric filter, level 1 to 12 and ATK
  and DEF 0 to 9000. Declared once in the filter schema, so the prompt, the
  parser, the search, and the controls all refuse the same values.

## Parsing

- **Parse**: turning a request into filters plus a query, with the chat model at
  temperature 0 (`parseCardRequest`).
- **Parse outcome** (`ParseOutcome`): how a parse ended. `parsed` when the model
  produced a usable result, `degraded` when parsing gave up.
- **Degraded search**: a search that runs on the request's own words because the
  parse could not turn it into filters or a query. It is a normal outcome rather
  than a failure, and it is announced so the player knows the request was not
  understood.
- **Repair**: the one extra pass a parse that failed validation is allowed. The
  model is shown its rejected answer and the validator's complaint. There is
  never a loop, because the turn is already answerable from the request alone.
- **Contradiction**: two equality filters on one field, which an AND search can
  never satisfy. The group is dropped rather than left to match nothing
  (`dropContradictions`), since the alternatives are still in the free text.
- **Vocabulary** (`FilterFieldVocabulary`): the description of every filterable
  field, derived from the filter schema and handed to the parse prompt, so the
  prompt, the parser, and the interface cannot drift from the schema.
- **Structured output**: constraining a model to a JSON shape it was given. It is
  a capability the application decides for a model, since Ollama reports none. A
  model without it is parsed by prompt and a single repair.

## Retrieval

- **Retrieval**: finding candidate cards in the index for a query
  (`retrieveCards`).
- **Semantic search**: embedding the query text and returning the nearest
  documents, closest first (the catalog's `search`).
- **Filter-only lookup** (or **scan**): a search with no text, only filters,
  which returns matching rows in a stable identity order (the catalog's `scan`).
- **Ranked card** (`RankedCard`): a candidate with its score. A semantic match
  carries a cosine similarity, higher meaning closer. A filter-only match has no
  distance to report and carries 1 as a certain structural match, so the two
  scales are not directly comparable.
- **topK**: how many rows the index returns for one search. A ranking input, not
  a display setting.
- **minScore**: the weak-match floor. A candidate below it is dropped.
- **Dedup**: keeping one entry per card id, the best-scoring one.
- **Candidate**: a card retrieval returned. A candidate is not a suggestion until
  a turn offers it.

## Choosing and answering

- **Pool**: the top of the ranking the model is asked to judge
  (`retrieval.filterPool`). It bounds a judgement to what a local model reads
  well, which also bounds how low a card may rank and still be kept.
- **Shown**: the ceiling on how many cards a turn offers (`retrieval.shown`). A
  selection is trimmed to it.
- **Judgement** (or **filter**, as a verb): asking the model which of the pool
  really answer the request (`filterCandidates`). Its answer is a list of card
  ids, and the request it is judged against is the player's own words, not the
  rewrite. An id the pool does not hold is dropped.
- **Selection** (`CardSelection`): what choosing came to: the cards, the pool
  size, and whether the judgement fell back.
- **Fallback** (`fellBack`): a judgement that failed is not a failed turn. The
  search's own ranking stands and its top `shown` cards are offered. A judgement
  that succeeds and keeps nothing is not a fallback; it is an honest empty
  result.
- **Suggested cards**: the cards a turn offers, in the order they were ranked.
  They are emitted before the answer, so the grid can render while the prose is
  still arriving, and they are stored as ids.
- **Grounded answer**: prose written only from the suggested cards
  (`streamGroundedAnswer`), at temperature 0 and in the conversation's language.
  The cards are the whole of what the model is given to talk about, which is what
  makes a suggested card impossible to invent.
- **Answer delta**: one piece of the answer as it streams.
- **Status** (`TurnStatus`): a code telling the client something about the turn
  before it goes on, currently `free-text-only`, meaning the search ran on the
  player's own words. The code belongs to the domain; the sentence the player
  reads is the client's to write.
- **Turn stage** (`TurnStage`): which part of a turn gave way: `parse`, `search`,
  or `answer`.

## The API

- **Turn event** (`TurnEvent`): one frame of the turn's stream, named by
  `TurnEventName`: `turn.start`, `status`, `filters`, `cards`, `answer.delta`,
  `answer.end`, `turn.end`, and `error`. A client tells them apart by name rather
  than by order.
- **SSE**: the transport a turn is streamed over.
- **Store** (`IAppStore`): the SQLite-backed application state, split into
  conversations and messages. It is injected, never reached as a singleton.

## Interface vocabulary

- **Readout**: the line under a request that shows the filters the turn searched
  with and lets the player edit them (`SearchReadout`). One fact in it is called
  a chip in the implementation.
- **Interpretation** (`SearchInterpretation`): how a turn's search was
  understood: the filters it reported, the words it fell back on, and what the
  server said about how it got there. It is one record, stored with the reply,
  so a reopened conversation reads what a turn searched rather than rebuilding it
  from the filters alone. The readout is where it is shown.
- **Correction**: the edited filters the player submits with the next turn
  (`correct`).
- **Request prompt** (or **composer**): the input a request is typed into
  (`Composer`).
- **Cards grid**: the suggested cards shown under a turn (`CardGrid`).
- **Offer**: the control that adds a filter the request never named.

## Terms that are easy to mix up

- A **request** is what the player wrote. A **query** is what the search ranked,
  which may be the request or the parse's **rewrite**.
- A **turn** is one exchange. A **message** is one stored utterance. A
  **conversation** is the set of messages a turn happens in.
- A **card** is a catalog entry. A **candidate** is a card retrieval returned. A
  **suggested card** is a candidate a turn actually offered.
- **Filters** is the set. A **filter** is one member. To **filter** is the
  model's judgement, a different act that shares the word.
- **topK** is how many the index returns. The **pool** is how many of those the
  model judges. **Shown** is how many reach the player.
- **Parsed**, **degraded**, and **fell back** are three different outcomes. A
  parse can be degraded and its search still succeed; a judgement can fall back
  and its turn still answer.
