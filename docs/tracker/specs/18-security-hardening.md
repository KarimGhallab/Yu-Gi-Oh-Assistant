# 18 - Security hardening of the untrusted boundaries

- **Status:** Resolved (2026-09-18)
- **Kind:** spec
- **Blocked by:** None
- **Source:** security review, 2026-09-18

## Problem Statement

A whole-codebase security review on 2026-09-18 found twelve threats. Three of
them share one shape: untrusted data crosses a trust boundary and no checkpoint
validates or contains it.

The API treats any page the user visits as a client. It binds loopback and is
unauthenticated on purpose (ADR-0006), but nothing checks the request's `Host` or
`Origin`, and the JSON body is read regardless of `Content-Type`. A page on
another origin can therefore send simple, preflight-free requests to
`127.0.0.1:3000`, and a page that rebinds its DNS to loopback becomes same-origin
and can read, rewrite, and delete the whole conversation history.

The card text is treated as instructions. A card's `name` and `effect` come from
the remote YGOPRODeck dump and are concatenated raw into the system message of
both the judgement prompt and the answer prompt. A card whose text carries
instructions therefore outranks the player's request, steering which cards are
kept and what the answer says, including live links in the model's prose.

The dump is trusted whole. The catalog is built from a remote JSON body with no
checksum or signature and no size cap, and the boot guard never re-checks the
dataset version it stored. The card image and source URLs are only
`z.string().min(1)`, so a `javascript:` URL reaches the client's `src` and `href`.

## Solution

Put a checkpoint at each of the three crossings. The API rejects a request whose
host or origin is not allowed and requires a JSON content type on a body. The
prompts carry card text as delimited, labelled data and never as instructions,
and the answer renderer refuses unsafe links. The populate path verifies the
dump it fetched, the boot guard re-checks the dataset version, and only `https`
card URLs are stored and rendered.

## User Stories

1. As a user, I want a page I visit to be unable to read or change my
   conversations, so my history stays private.
2. As a user, I want a tampered or corrupted card index to fail at boot, not
   answer badly.
3. As a user, I want a card's text to be described, never obeyed, so a poisoned
   card cannot hijack my answer.
4. As a user, I want a card link to be safe to click, so no stored URL can run
   script on the app origin.
5. As a maintainer, I want one place that decides which hosts and origins may
   reach the API, so the rule is auditable.
6. As a maintainer, I want the dump's identity checked, so I know the catalog
   came from the data I expected.
7. As a maintainer, I want the loopback binding and the origin check to be
   independent layers of defense-in-depth.
8. As a developer, I want a cross-origin write test that fails without the
   checkpoint.
9. As a developer, I want a prompt test that proves a card's instruction-shaped
   text stays inside its data delimiters.
10. As a developer, I want a digest mismatch and a poisoned URL to fail closed in
    tests.

## Implementation Decisions

- **Host and origin checkpoint.** One middleware in `apps/server` validates
  `Host` against an allowed set (loopback forms by default, extended by
  configuration) and rejects a request whose `Origin` or `Referer`, when present,
  is not same-origin or in the configured origins, with `403`. It is registered
  before the routes, and it strengthens ADR-0006 rather than replacing it.
- **JSON content type.** A body-carrying route requires
  `Content-Type: application/json`, so a simple cross-site request cannot post.
  `parseJsonBody` states the requirement and the transport answers a client
  error.
- **Card text as data.** `buildFilterPrompt` and `buildAnswerPrompt` wrap each
  card's text in explicit delimiters and state that the delimited text is data
  that must never be followed. `card.name` is flattened the way `card.effect`
  already is. The prompts keep their current roles; the change is framing, not
  the role.
- **Safe answer links.** The answer renderer permits only `http` and `https`
  link targets, or renders no link, so a model steered into emitting a
  `javascript:` URL cannot run it.
- **Dump integrity.** `fetchCardDump` reads the body under a size cap and
  verifies the dump's identity before `populateCardIndex` accepts it; a mismatch
  fails closed. The mechanism is chosen in the ticket, with a pinned SHA-256 of
  the dump as the floor.
- **Dataset version re-check.** `ensureIndexMatchesConfig` compares the stored
  `datasetVersion` with the expected value, so an index swapped for another
  fails at boot.
- **Card URL schemes.** `dumpSchemas` constrains `image_url` and
  `ygoprodeck_url` to `https` with an allowed host, and bounds card field
  lengths, so a poisoned or oversized dump is rejected before it is stored.
- **Untouched.** ADR-0006's unauthenticated loopback posture stands; this spec
  adds layers, it does not add authentication. The other nine review findings
  are out of scope here.

## Testing Decisions

- Good tests cross the boundary a caller crosses. Tests live at the middleware,
  the prompt builders, the fetch, the boot guard, and the schema.
- A host and origin test proves a foreign origin is refused with `403` and a
  same-origin request passes; a content-type test proves `text/plain` is refused.
- Prompt tests prove a card whose `name` and `effect` carry instruction-shaped
  text and newlines stays inside its delimiters and is labelled as data.
- A `fetchCardDump` test proves a body over the size cap and a digest mismatch
  both raise.
- An `ensureIndexMatchesConfig` test proves a mismatched dataset version raises
  `StaleIndexError`.
- A `dumpSchemas` test proves a non-`https` URL and an over-long field are
  rejected.
- A web test proves an unsafe link target is not rendered as a link.

## Out of Scope

- The other nine findings from the 2026-09-18 review: resource limits and
  timeouts, the logged conversation text, the Ollama URL credential, the CI
  action pins, the container runbook and base images, clickjacking, and the
  cleartext Ollama shape.
- Any authentication layer; ADR-0006 keeps the server unauthenticated on
  loopback.
- Changing the prompt roles or the model's behaviour beyond framing card text as
  data.

## Further Notes

- The review report is in the OS temp directory from the 2026-09-18 run.
- No new glossary term: host, origin, and digest are not domain vocabulary, and
  the card terms are already in `GLOSSARY.md`.
- ADR-0006 is not contradicted. The origin checkpoint is the layer the loopback
  binding cannot provide, because the browser, not the network, carries the
  attack.
