# Testing against a stubbed Ollama

The tests never reach a real Ollama. Two fakes stand in at two seams: an
in-process `FakeOllamaClient` implementing `IOllamaClient` for the unit and
integration suites, and a real HTTP `FakeOllamaServer`, exported from the ollama
package's `testing` subpath, that the end-to-end suite points the real client at.
The application's dependencies are injected, so swapping the client is a
constructor argument rather than a network interception. The vitest suites own
unit and integration behavior; the end-to-end suite owns what crosses a process,
a socket, or a browser.

The first reason is that a suite has to run anywhere. Continuous integration and
a developer's machine must need no Ollama, no model downloads, and no network,
and must produce the same result twice. The fake returns canned models,
embeddings, and chat scripts, and records every call, so a test asserts the
behavior the application asked for rather than the quality of a model's answer.
The second reason is that the two suites ask different questions. A unit or
integration test wants a double it can inspect and script per call; the
end-to-end suite wants the real HTTP client exercised for real, so there the fake
is a server on a socket rather than a stand-in object. The same interface carries
both, which is why the seam is the interface and not a mocking library.

The doubles live where they belong. `FakeOllamaClient` and `TempDataDir`, which
gives a test an isolated data directory for its stores and index, live in
`packages/test-support`, and the HTTP server lives behind the ollama package's
`testing` subpath. Both are importable only by test files, a boundary the
dependency rules enforce, so production code cannot accidentally reach a fake and
the ollama package's own surface stays the only way to start one.

A fake is only as honest as its fixtures: the suites assert user-visible behavior
and the end-to-end suite asserts the wire, which is what keeps the fake from
quietly becoming the specification. A behavior that depends on a real model's judgment is out of scope
for the suites and is verified against the live stack when a ticket is landed,
which the product's operating context already asks for. Extending the interface
means extending both fakes, a deliberate tax that keeps the seam honest. And the
end-to-end suite needs the browser engines installed and a built stack, which is
why it runs in its own pipeline stage with its engines cached.

## Considered options

Running against a real Ollama was rejected because it needs a model and a
network and is neither fast nor deterministic. Doing that only in CI was rejected
because CI is the place that most needs to be cheap and hermetic. Mocking at the
HTTP layer for the unit suites was rejected because it tests the client rather
than the behavior; the injected interface is the narrower seam, and the HTTP fake
exists only where the wire is the point. Skipping the end-to-end suite was
rejected because cross-process wiring is exactly where a break stays invisible to
the in-process suites.
