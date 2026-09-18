# 52 - The runbook gets a stranger running

**What to build:** A stranger who clones the public repository can install what
the app needs, point it at their own Ollama and card data, and bring the app up,
without reading the source. The stale template README becomes the runbook, and a
committed environment template names every setting the server reads.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] The README states the prerequisites (Node 26.5.0, pnpm 11.20.0, Ollama)
      and how to get them.
- [ ] The `ollama pull` commands name the embedding model and at least one chat
      model, and say the chat model is the player's choice from what is
      installed.
- [ ] A committed environment template lists every configuration variable the
      server reads, each with its default and a one-line explanation.
- [ ] The populate step and the dev, build, and start commands are documented as
      commands a reader can paste, not an invocation they have to assemble.
- [ ] Following the runbook on a clean checkout with Ollama running brings the
      app up and answers a request.
- [ ] The repository gates stay green.

**Notes:** The root scripts delegate to workspaces for populate and start, so
the runbook either names the filtered commands or the ticket adds a root alias
first; either way the reader pastes one command. The index and the dump are not
in the repository, so the runbook has to carry the populate step rather than
point at committed data.
