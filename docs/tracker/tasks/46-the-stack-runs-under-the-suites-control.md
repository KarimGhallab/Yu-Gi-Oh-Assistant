# 46 - The stack runs under the suite's control

**What to build:** One command starts the whole stack and runs the browser
suite: a real card index seeded from fixture cards with no network, the fake
Ollama over HTTP, the built server, and the built client. A smoke test opens the
app and sees the empty state. From a developer's perspective, running the
end-to-end suite is a single command.

**Blocked by:** 45 - The fake Ollama server is importable.

**Status:** ready-for-agent

- [ ] The end-to-end test runner is a root dependency, and the maintainer can
      install the chromium, firefox, and webkit engines with one documented
      command.
- [ ] The suite has a home of its own with a TypeScript project that the
      workspace typecheck covers, a command to run it, a command to open its UI,
      and run artifacts kept out of the repository.
- [ ] The config declares the three engines and runs with one worker against a
      single stack.
- [ ] The harness starts the fake Ollama, seeds a real index from the fixture
      cards through the real embedding client over HTTP, starts the built server
      against that data directory with the client's origin allowed, serves the
      built client, and waits until it answers; teardown removes the temporary
      data directory.
- [ ] The fixture cards cover what the later journeys need: an archetype, a
      Spell, a Trap, and a card that exists in only one language.
- [ ] The fake answers the model listing, the model inspection, the embedding
      call, and the chat call (the parse, the filter, and the streamed answer),
      keyed off the request, with deterministic vectors so the ranking is
      stable.
- [ ] A smoke test opens the app on each engine and sees the empty state.
- [ ] Typecheck, lint, formatting, the dependency rules, and the unused-code
      report account for the new files and stay green.

**Notes:** This is the enabling slice: nothing else can be asserted before a
browser can reach the app. The index is seeded directly rather than through the
populate command, because that command fetches the real dump from the network.
The engine-agnostic rule starts here: the smoke test asserts the document, not
how it renders.
