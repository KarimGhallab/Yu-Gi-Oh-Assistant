# 02 - Ollama integration

- **Status:** `ready-for-agent`
- **Kind:** spec
- **Blocked by:** 01
- **Source:** architecture grilling, 2026-09-15

## Problem Statement

The product depends on an Ollama instance that may be local or remote, and the
available models differ from machine to machine. Some models support structured
output and some do not. The application needs one typed, testable boundary for
listing models, computing embeddings, and streaming chat completions, with clear
errors when the server or a model is unavailable.

## Solution

A `packages/ollama` client that owns all Ollama communication behind an
interface: list models with capability flags, embed a batch of texts, and stream
a chat completion. Endpoints and model names come from configuration. The client
is consumed through the composition root so tests substitute a fake.

## User Stories

1. As a player, I want to see which models are available on the configured
   Ollama server, so that I can pick one that is already installed.
2. As a player, I want a clear error when the Ollama server is unreachable, so
   that I know what to fix.
3. As a player, I want a clear error when a model is missing, so that I know to
   pull it.
4. As a developer, I want the endpoint configurable, so that I can point at a
   local or a remote server.
5. As a developer, I want separate chat and embedding endpoints, so that the
   embedding model can run on a different host than the chat model.
6. As a developer, I want to know whether a model supports structured output, so
   that the parsing stage can choose its strategy.
7. As a developer, I want embeddings batched, so that ingesting thousands of
   cards is not one request per card.
8. As a developer, I want chat completions streamed, so that the UI can render
   tokens as they arrive.
9. As a developer, I want model responses validated at the boundary, so that a
   malformed response fails loudly instead of downstream.

## Implementation Decisions

- One interface, implemented by a concrete client, covering three operations:
  model listing, embedding, and chat completion streaming.
- Configuration keys: `OLLAMA_BASE_URL`, `OLLAMA_EMBEDDING_BASE_URL` (optional
  override, defaulting to the base URL), `OLLAMA_CHAT_MODEL`,
  `OLLAMA_EMBEDDING_MODEL`, `OLLAMA_EMBEDDING_DIMENSIONS`.
- Model listing proxies Ollama's model list and flags which models support
  structured output, so the client can present the flag and the parsing stage
  can consult it.
- Embedding issues batched requests and returns vectors of the configured
  dimensions.
- Chat completion supports streaming and an optional JSON schema in the
  `format` parameter, matching Ollama's structured-output capability.
- Responses are validated with Zod before use.
- Errors are typed: unreachable server, unknown model, and invalid response are
  distinguishable and carry a message that names the fix.
- The interface is resolved at the composition root (feature 01), never imported
  as a singleton by feature code.

## Testing Decisions

- Good tests assert the client's external behavior: the request it issues and
  the typed result or error it returns. They do not assert internal call order.
- Unit tests run the client against a fake HTTP server (or a request-level
  interceptor) covering: model listing with and without structured output,
  batched embedding, streamed chat chunks, and each typed error.
- The reusable fake Ollama client introduced in feature 01 is the substitute
  used by later integration tests; this feature tests the real client.
- No test requires a running Ollama or network access.

## Out of Scope

- Prompt construction, filter parsing, retrieval, and answer generation.
- Model selection UI and persistence (feature 09).
- Card ingestion (feature 03) beyond the embedding call it consumes.

## Further Notes

- Ollama's `/api/embed` returns L2-normalized vectors; do not re-normalize.
- The embedding model and dimensions are a durable contract with the index. The
  client must not be the place that records that contract; feature 03 does.
