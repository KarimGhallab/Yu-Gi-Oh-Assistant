# Model selection in the interface, with the application deciding structure

The model a turn runs on is chosen by the player in the client. It is a setting
of the conversation, remembered there and overridable per turn, and the server
offers only the models the configured Ollama instance actually has. Whether a
model can be held to a schema is the application's own judgement, because Ollama
reports no such capability, and a model that cannot is still usable through a
prompt and a single repair.

The machine has whatever models its owner pulled into Ollama, so there is no
fixed model for the deployment to configure and no server-side default that would
not be a guess. The instance is asked every time rather than remembered, because
what is installed changes the moment a model is pulled or removed; the list is
sorted by name so the same machine offers the same order, and a conversation
that has not been told picks the first installed model that can complete. The
listing the server reports carries that default beside the models, so the client
shows the model the server would pick rather than deriving it a second time, and
the rule has one owner. A model
the player names but the instance does not have is refused before anything is
streamed, rather than quietly answered by another one, because a player who chose
a model and got a different one has been misled. The choice being part of the
conversation, like the language, is what makes reopening one restore the settings
it was last used with.

Structured output is the reliability knob for the machine-facing stages: the
parse and the judgement are handed a JSON shape when the model supports it, and
validated either way. Ollama exposes no capability for it, so the application
answers the question with the completion capability it does report, on the
reasoning that a model able to complete is the one that accepts a format. A model
without it is not turned away: the parse falls back to a prompt plus one repair,
and the judgement falls back to the search's own ranking. A weaker model makes
the first stage less reliable, but it does not stop a turn from running.

The picker can only list what is installed, so a conversation whose stored model
has since been removed is refused with a clear error rather than silently
re-pointed. What a model's capabilities mean for the player, the note on an
option and the warning above the prompt, is written once in the client and read
by every surface that offers the choice, because the same fact worded in two
places is a fact that drifts. Because the model is validated before the
turn starts, a bad choice fails fast instead of midway through a stream. Both the
structured path and the prompt path have to be maintained, and the structured one
is preferred whenever it is available. And the resolved model is carried to the
pipeline per turn, so the pipeline never has to know which setting won.

## Considered options

A model fixed by configuration was rejected because the choice belongs to the
conversation on a machine whose models the player controls. Trusting a model to
return valid JSON was rejected because validation plus one repair is what keeps a
bad answer from failing an otherwise answerable turn. Treating structured-output
support as something Ollama reports was impossible; deriving it from completion
is the honest approximation the application can make.
