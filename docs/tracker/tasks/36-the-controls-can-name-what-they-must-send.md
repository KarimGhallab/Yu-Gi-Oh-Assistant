# 36 - The controls can name what they must send

**What to build:** The vocabularies the chat view's new controls speak are
reachable from the package it already depends on: the two languages, the filter
fields, the operators, and the values each field accepts (card types, frame
types, attributes, link markers). Nothing is visible to a player because of this
ticket. What it buys is that the chips and the language control are built
against the same vocabulary the server validates a turn with, so the client
cannot offer a filter or a language the server would refuse, and there is no
second copy of the vocabulary to drift.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-17)

- [x] The chat view can import the languages, the filter fields, the operators,
      and the per-field value vocabularies through the shared contracts package.
- [x] The vocabularies are the ones the server validates a turn against, so
      anything the controls can build is accepted.
- [x] The client takes on no new dependency to reach them.
- [x] Build, lint, and the unused-code report pass without adding unused
      exports.

**Notes:** The client already renders the contract's shape rather than depending
on the catalog package, which was recorded when the card grid landed, so
carrying this vocabulary through the contracts package is the consistent choice
and it spares the client a dependency that would need installing. The values
matter as much as the field names: a chooser for a card type, a frame type, an
attribute, or a link marker has to offer the same set the schema accepts, or the
controls can build a filter the search refuses.

**Outcome:** The vocabulary now lives where it is derived from: the description
of the filterable fields moved out of the parse path and into the card domain,
beside the filter schema it reads, and the parse prompt takes it from there.
That is what let the contracts package carry it, since contracts already depends
on the card domain and cannot reach into the retrieval package, and it leaves
one derivation rather than two growing apart.

The description kept its shape and gained its types: the field is a filter field
of the domain, the operators are operators of the domain, the enumerated values
are the enum members, and the value type stays the JSON schema's own word for
it, `integer` or `string`. Narrowing those derived strings is done with guards
rather than assertions, and a field or an operator the schema carries that the
enums cannot name is raised rather than quietly left out of what the model and
the controls are told they may use.

Contracts re-exports the description, the two languages, the filter fields, the
operators, the four value vocabularies, the filter schemas, and the filter types,
so the chat view reaches all of it through the package it already depends on and
takes on no dependency of its own. Nothing a player can see changed.

The derivation's test moved with it and gained the check that makes its promise
real: for every field and every operator, what the vocabulary offers has to be
exactly what the filter schema accepts, which cross-checks the schema as it is
read for a prompt against the schema as the server validates with. The client
gained its own test that imports the vocabulary through contracts, walks it, and
reads back a filter built from it, which is what proves the door opens from the
chat view's side rather than only from the server's.

Verified: the type check, 340 tests across 31 files, lint, build, formatting,
the dependency rules over 142 modules and 361 dependencies, and the unused-code
report at exactly its previous findings. The description is not in the client
bundle yet, because no application code imports it until the chips do; the
languages and the value vocabularies already ride with the contract.
