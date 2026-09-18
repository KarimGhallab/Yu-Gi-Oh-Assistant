# 69 - One owner for the model policy

**What to build:** One pure module turns the listing and the chosen model into
the choices, the note, the missing state, and the warnings. The two prompt
surfaces read it instead of each deciding for itself what a model's capabilities
mean, so the same fact is worded once even though it shows in two places.

**Blocked by:** 68 - The listing names the model a conversation starts on.

**Status:** Resolved (2026-09-18)

- [x] A shared client module turns the models and the chosen name into the
      selected model, the missing state, the picker choices, the body note, and
      the alert lines.
- [x] The terse option label and the body sentence live in that module together.
- [x] The prompt surface builds its picker from the choices and its missing
      state from the module; the composer reads the note and the alerts and
      prepends its own settings error.
- [x] No surface derives the missing state, the option labels, or the note
      itself.
- [x] The policy has a direct test for a model with and without structured
      output, a chosen model the listing lacks, a listing with no model that can
      answer, the option labels, and the body note; the app tests stay green with
      their existing copy.
- [x] The repository gates stay green.

**Notes:** ADR-0007 records that the presentation policy lives in one client
module. The policy consumes the model listing; it introduces no domain term.

**Outcome:** A shared client module turns the listing and the chosen name into
the selected model, the missing state, the picker choices, the body note, and
the alerts. The prompt surface builds its picker from the choices; the composer
reads the note and the alerts and prepends its settings error. The terse option
label and the body sentence live together. A direct test covers the policy and
the app tests keep their existing copy. All gates green.
