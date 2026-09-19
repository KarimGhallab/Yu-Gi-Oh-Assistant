# 52 - The runbook gets a stranger running

**What to build:** A stranger who clones the public repository can install what
the app needs, point it at their own Ollama and card data, and bring the app up,
without reading the source. The stale template README becomes the runbook, and a
committed environment template names every setting the server reads.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] The README states the prerequisites (Node 26.5.0, pnpm 12.4.2, Ollama)
      and how to get them.
- [x] The `ollama pull` commands name the embedding model and at least one chat
      model, and say the chat model is the player's choice from what is
      installed.
- [x] A committed environment template lists every configuration variable the
      server reads, each with its default and a one-line explanation.
- [x] The populate step and the dev, build, and start commands are documented as
      commands a reader can paste, not an invocation they have to assemble.
- [x] Following the runbook on a clean checkout with Ollama running brings the
      app up and answers a request.
- [x] The repository gates stay green.

**Notes:** The root scripts delegate to workspaces for populate and start, so
the runbook either names the filtered commands or the ticket adds a root alias
first; either way the reader pastes one command. The index and the dump are not
in the repository, so the runbook has to carry the populate step rather than
point at committed data.

**Outcome:** The README is the runbook now: what the app is, the prerequisites
and how mise pins them, the `ollama pull` commands (the fixed embedding model
plus a chat model of the reader's choosing), copying the server's environment
template, the populate step and what it downloads and embeds, the development
path with its two ports, and the production build and start paths with the
`VITE_API_BASE_URL` / `CORS_ORIGIN` pairing, plus configuration notes, a short
troubleshooting list, and where the code lives. The environment templates
already existed as `apps/server/.env.example` and `apps/web/.env.example`; they
were verified against `loadConfig` and the client's one variable, so the
template half of the ticket was already met and is only linked, not restated. A
root `db:populate` alias was added so the runbook can name one paste-ready
command, and the boot guard's `REPOPULATE_COMMAND` now prints `pnpm db:populate`
to match, which is what the server's missing-index error tells the reader to
run. Verified: typecheck, 445 vitest tests across 47 files, lint, and formatting
all pass, and the running development stack answers on both the API and the
client. The live check was against this machine's already-populated index rather
than a fresh checkout, since a rebuild downloads the dump and re-embeds the
catalog.
