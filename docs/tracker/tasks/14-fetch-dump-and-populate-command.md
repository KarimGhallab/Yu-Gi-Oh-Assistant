# 14 - Fetch the card dump and wire the populate command

**What to build:** One run downloads the YGOPRODeck dump in English and French
(raw JSON saved under the data directory), converts it, embeds it, and writes the
index, exposed as `pnpm -F @ygo-assistant/server db:populate`. From a developer's
perspective: run one command and get a populated index, with the data directory
kept out of version control.

**Blocked by:** 12 - Card domain and YGOPRODeck conversion; 13 - Build and read
the local card index.

**Status:** Resolved (2026-09-15)

- [x] English and French dumps are fetched and their raw JSON is saved under the
      data directory.
- [x] The data directory, holding the raw dump and the index, is gitignored.
- [x] The command converts, embeds, and writes the index and its metadata in one
      run, and is wired as `db:populate` on the server app.
- [x] Tests drive the path against a fake dump server and a fake Ollama client;
      no test reaches YGOPRODeck.
- [x] Build and lint pass.
