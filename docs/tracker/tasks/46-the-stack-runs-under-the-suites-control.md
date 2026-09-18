# 46 - The stack runs under the suite's control

**What to build:** One command starts the whole stack and runs the browser
suite: a real card index seeded from fixture cards with no network, the fake
Ollama over HTTP, the built server, and the built client. A smoke test opens the
app and sees the empty state. From a developer's perspective, running the
end-to-end suite is a single command.

**Blocked by:** 45 - The fake Ollama server is importable.

**Status:** Resolved (2026-09-18)

- [x] The end-to-end suite is its own workspace package that owns the imports it
      needs, with the test runner among its devDependencies, and the maintainer
      can install the chromium, firefox, and webkit engines with one documented
      command.
- [x] The suite has a home of its own with a TypeScript project that the
      workspace typecheck covers, a command to run it, a command to open its UI,
      and run artifacts kept out of the repository.
- [x] The config declares the three engines and runs with one worker against a
      single stack.
- [x] The harness starts the fake Ollama, seeds a real index from the fixture
      cards through the real embedding client over HTTP, starts the built server
      against that data directory with the client's origin allowed, serves the
      built client, and waits until it answers; teardown removes the temporary
      data directory.
- [x] The fixture cards cover what the later journeys need: an archetype, a
      Spell, a Trap, and a card that exists in only one language.
- [x] The fake answers the model listing, the model inspection, the embedding
      call, and the chat call (the parse, the filter, and the streamed answer),
      keyed off the request, with deterministic vectors so the ranking is
      stable.
- [x] A smoke test opens the app on each engine and sees the empty state.
- [x] Typecheck, lint, formatting, the dependency rules, and the unused-code
      report account for the new files and stay green.

**Notes:** This is the enabling slice: nothing else can be asserted before a
browser can reach the app. The index is seeded directly rather than through the
populate command, because that command fetches the real dump from the network.
The engine-agnostic rule starts here: the smoke test asserts the document, not
how it renders.

**Outcome:** The suite is its own workspace package, `@ygo-assistant/e2e`, so
the root keeps only tooling it runs: the package owns the cards, db, and ollama
imports and the Playwright runner, and the root scripts delegate to it. The
config runs chromium, firefox, and webkit on one worker against a single stack,
and the harness owns that stack: it starts the fake Ollama, seeds a real index
from seven fixture cards through the real embedding client over HTTP, boots the
built server against a temporary data directory with the client's origin
allowed, serves the built client, and removes the directory on the way out. The
fake answers the listing, the inspection, the embedding, and the chat call,
telling the parse, the filter, and the answer apart by the format the request
carries and deciding every answer from the request itself, so it is safe to run
in parallel. The fixtures carry an archetype, a Spell, a Trap, a French printing
of an English card, and a pair that exists in only one language each. Before the
workspace was split out, the harness was driven by hand through a whole turn:
the scripted filters, the two cards, four answer pieces, and the stored reply,
with the index and the store behind it. The smoke test opens the empty state on
all three engines. Typecheck, 445 vitest tests across 47 files, the three-engine
suite, lint, formatting, the dependency rules over 204 modules and 549
dependencies, syncpack, the tsconfig-paths check, and the unused-code report at
its exact pre-ticket baseline all pass, and `pnpm e2e:install` is the one
documented command for the engines.
