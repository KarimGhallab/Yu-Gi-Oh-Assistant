# 16 - Model listing and policy

- **Status:** Resolved (2026-09-18)
- **Kind:** spec
- **Blocked by:** 02, 09
- **Source:** architecture review, 2026-09-18

## Problem Statement

The model policy has three homes. `Composer` and `PromptSurface` each read the
listing to decide whether the chosen model is missing, what note a model's
capabilities earn, and which models may be chosen, and the structured-output note
is written twice, once as a short option label and once as a sentence above the
prompt. `EmptyState` separately re-derives the server's default. So one fact is
decided in three places, the copy can drift, and the default the control shows is
the client's guess at a rule the server owns.

## Solution

Give the listing one wire shape and the client one policy. The server answers
with the models and the default it would pick, and a single pure module turns
that listing and the chosen name into the choices, the note, the missing state,
and the warnings every surface needs. The surfaces render what the policy
returns instead of deciding for themselves.

## User Stories

1. As a player, I want the model I will start on shown before I send, so I can
   change it first.
2. As a player, I want the model shown to be the one the server would pick, so
   the control never shows one model and the turn run another.
3. As a player, I want a model that cannot answer a turn to be marked as such and
   not offered.
4. As a player, I want a model that cannot be held to a schema to say so, in the
   picker and above the prompt, in words that agree.
5. As a player, I want a model I chose that is no longer installed to say so and
   how to install it.
6. As a player, I want a settings change that failed to say so above the prompt.
7. As a developer, I want one module to turn the listing and the choice into
   choices, notes, and warnings, so a surface renders rather than decides.
8. As a developer, I want the option label and the body sentence owned together,
   so the same fact cannot be worded twice.
9. As a developer, I want the default named by the server, so the client never
   derives a second answer.
10. As a developer, I want the policy pure and testable on its own, so its cases
    do not need the app.
11. As a developer, I want the wire shape to carry the listing and the default
    together, so one request answers both.
12. As a developer, I want the default rule named once in the server, so the
    picker and the conversation cannot disagree.
13. As a maintainer, I want the surfaces to keep their existing copy, so nothing
    on screen changes.
14. As a maintainer, I want no change to which model a turn runs on, so behaviour
    is unchanged.

## Implementation Decisions

- **The wire shape.** The models endpoint answers `{ models: Model[]; default?:
string }` as `modelListingSchema`, replacing `modelListSchema`. An absent
  default means no installed model can answer.
- **The server rule.** `firstAnsweringModel(models): Model | undefined` is the
  rule: the first model that can complete, from the name-sorted listing.
  `defaultModel` stays the throwing wrapper for a caller that must have one, and
  the models route reports `firstAnsweringModel(...)?.name` beside the models.
- **The client listing.** The models request and `useModels` read the listing,
  so a caller has the models and the default from one place.
- **The policy.** A new shared client module exports `describeModel(models,
selected): ModelPolicy`. The record carries:
  - `selected?`, the installed model the chosen name names, when there is one;
  - `missing`, whether a name was chosen that the listing does not hold;
  - `choices`, one per installed model with its option label and disabled when it
    cannot complete, plus the missing name as its own choice;
  - `note?`, the sentence for a model that cannot produce structured output;
  - `alerts`, the model facts a player must read: not installed, cannot answer.
    The settings error is not the policy's; the surface that owns the mutation
    prepends it.
- **The wordings.** The terse option label and the body sentence live in the
  policy together, so the same fact is written once even though it is shown in
  two registers.
- **The surfaces.** `PromptSurface` builds its picker from `choices` and its
  missing state from `missing`; `Composer` reads `note` and `alerts` and
  prepends its settings error; `EmptyState` reads `default` and passes `models`.
- **The record of the decision.** ADR-0007 is amended: the server names the
  default and the client never derives it, and the presentation policy lives in
  one client module.

## Testing Decisions

- Good tests cross the seam a caller crosses. The policy is pure, so its test
  calls it directly and needs no app, no query client, and no fetch.
- `modelPolicy.test.ts` covers a chosen installed model with and without
  structured output, a chosen model the listing lacks, a listing with no model
  that can complete, the default, the option labels, and the body note.
- The models route test asserts the listing shape and the default, and that the
  default is absent when nothing can answer.
- The client app tests stay the integration and keep their existing copy
  assertions, so the screen is proven unchanged.
- Prior art: the client's shared-module tests and the route tests.

## Out of Scope

- How a turn's model is validated or carried to the pipeline; unchanged.
- How structured-output support is derived (completion implies it); unchanged.
- Any change to the picker's markup or to the copy a player reads.
- Moving the policy into the contract or the domain packages.

## Further Notes

- ADR-0007 is amended rather than replaced, because this sharpens the selection
  it already describes.
- `docs/GLOSSARY.md` gains **Model listing**; the policy itself is presentation
  rather than domain, so it introduces no term.
- The rule for the default moves onto the listing, so the picker and the
  conversation creation cannot disagree.
