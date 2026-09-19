# 79 - The machine facts clear the contrast minimum

**What to build:** The small machine facts a search is explained with (the
readout's field names, `Searched as`, the missing-image note on a card, and the
marker that says which language a card is in) are readable against the surface
each one sits on, and the fix is the one system value rather than a patch per
component.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] The `ink-faint` token is raised so text set in it clears 4.5:1 on Room
      Black, Bench Slate, and Rail Grey. A value near 65% L meets this and stays
      a visible step below Ash Grey; the exact value is fixed by measurement.
- [x] The change is the token and nothing else: no component hand-picks a
      replacement color.
- [x] The new value is recorded in `DESIGN.md` and `.impeccable/design.json`.
- [x] A browser measurement of the token on the three surfaces is recorded in
      the ticket outcome.
- [x] The bundled detector reports no low-contrast finding for the machine
      facts.

**Outcome:** The `ink-faint` token is raised to `oklch(65% 0 none)` by overriding
Tailwind's `--color-neutral-500` in the stylesheet, so every machine fact keeps
the `text-neutral-500` class and the whole system moves with the token rather
than one component at a time.

Measured in the browser on the running app, against the three surfaces the facts
sit on: Room Black 6.12:1, Bench Slate 5.54:1, and Rail Grey 4.68:1, all clear of
the 4.5:1 minimum. Ash Grey is still a step above, at 5.86:1 on Rail Grey. The
bundled detector reports no low-contrast finding for the facts; its only
low-contrast hit is the disabled Send, the known false positive, since an
inactive control is exempt. `DESIGN.md` and `.impeccable/design.json` carry the
new value, and the production stylesheet resolves `--color-neutral-500` to it.

Full gates are green: 62 files and 554 tests, typecheck, lint, prettier,
dependency-cruiser 223 modules with no violations, knip unchanged, syncpack, the
path check, and the build, including the client's Tailwind build.
