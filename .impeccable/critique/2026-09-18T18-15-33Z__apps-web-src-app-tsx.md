---
target: the web client (apps/web)
total_score: 32
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 0
p2_count: 4
p3_count: 1
target_identity: 'file:/mnt/Fichier/Documents/Projets/Yu-Gi-Oh-Assistant/apps/web/src/App.tsx'
target_fingerprint: 'sha256:043ec097c5e86bf6cf87dcad92cf9bfc3586b15367a24e7f081ab3e3bf4442da'
target_path: /mnt/Fichier/Documents/Projets/Yu-Gi-Oh-Assistant/apps/web/src/App.tsx
timestamp: 2026-09-18T18-15-33Z
slug: apps-web-src-app-tsx
---

Method: dual-agent (A: general · B: general)

## Design Health Score

| #         | Heuristic                           | Score     | Key Issue                                                                                                                                                                        |
| --------- | ----------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status         | 3         | The travelling-light status line and readout are good, but an interrupted or dead turn leaves the last request unanswered with no notice and a stale readout above the composer. |
| 2         | Match Between System and Real World | 4         | "Cards in", "Answered by", "Level is 4 / Race is warrior" are the domain's own words, and the parse rewrite is surfaced as "Searched as".                                        |
| 3         | User Control and Freedom            | 3         | Escape, Cancel, skip link, and focus return are thorough, but a running turn cannot be stopped, and a prior request cannot be edited or resent.                                  |
| 4         | Consistency and Standards           | 4         | One icon set, one radius, one focus treatment, one red. The two amber fills are the sole documented inconsistency.                                                               |
| 5         | Error Prevention                    | 3         | Delete confirms and Send disables, but the destructive action wears the same amber lamp as Save/New/Send, and New instantly creates an untitled conversation with no undo.       |
| 6         | Recognition Rather Than Recall      | 3         | The readout and examples remove recall, but the chosen model truncates at `max-w-40` (`Picker.tsx:38`) and "Searched as" is reveal-on-hover only.                                |
| 7         | Flexibility and Efficiency          | 3         | Enter sends, Shift+Enter newlines, filters are correctable; no shortcut for a new conversation or jumping to the list.                                                           |
| 8         | Aesthetic and Minimalist Design     | 4         | Genuinely restrained; density as craft is real.                                                                                                                                  |
| 9         | Error Recovery                      | 3         | Verbatim alert lines, retry on load failure, and pull guidance, but a dead turn gives no diagnosis or recovery and the empty-result answer names no filter to relax.             |
| 10        | Help and Documentation              | 2         | No help affordance and no explanation of what the tool is; four rotating examples are the whole onboarding.                                                                      |
| **Total** |                                     | **32/40** | **Good (28-35)**                                                                                                                                                                 |

## Design Specificity Verdict

**Start here: partially specific. Strong in the card layer, category-interchangeable in the chat scaffolding.**

**LLM assessment**: The "Duelist's Workbench" genuinely lands where cards and filters live: dark stepped neutrals, one amber, hairlines instead of boxes, printed card proportions, the `EN only` / `FR only` marker (`CardGrid.tsx:115`), the schema-derived editable filter readout (`SearchReadout.tsx`, `filterFields.ts`), and the prompt-docking and card-morph transitions. Roughly 60/40 specific. The surfaces a visitor meets first are the generic grounded-chat template: sidebar conversation list with rename/delete, "You"/"Assistant" history (`MessageHistory.tsx:7-8`), bottom composer, four example sentences. Swap the strings and it is any grounded-chat app, and the distinctive half currently sits below the fold.

**Deterministic scan**: The static source scan of `apps/web/src` was **clean** (`[]`, exit 0). The rendered-URL scan was not: it returned 2 findings, `layout-transition` (`transition: width`) and `low-contrast` on the Send stack. The browser overlay across four surfaces added `cramped-padding`, `clipped-overflow-container`, and `text-overflow`. Of those five rules, **only `layout-transition` survives scrutiny**; the rest are false positives with file evidence (disabled Send is exempt from contrast minimums per WCAG 1.4.3; the title's overflow _is_ `truncate`; the flagged containers use `position: fixed` descendants with no containing-block creator; the shell legitimately has flush children; `body` has no width transition). The important finding is the **divergence**: the static regex path cannot see Tailwind arbitrary utilities, so a clean source scan is not a clean UI.

**Visual overlays**: Injection succeeded. Overlays are visible in the **[Human]** tab in your browser, on the desktop conversation (1280), narrow home (500x844), mobile conversation (390x844 emulated), and desktop home (1280x800). Console groups reported 2-4 `[impeccable]` anti-patterns per surface; the live server was stopped and port 8400 confirmed closed.

## Overall Impression

This is a beautifully constrained app with one genuinely original interaction, wrapped in a chat shell that could belong to anything. The craft is real and mostly in the card layer, which is exactly where the product intent says the bench is. The single biggest opportunity is to make the system's stated POV visible before retrieval succeeds, because right now a failed or dead turn collapses the whole workbench into the most generic possible screen: a prompt and a sentence.

## What's Working

1. **The readout is a real domain object.** `SearchReadout.tsx` renders each filter as an editable fact and hands the exact set to the next turn, while `filterFields.ts` derives operators, values, and numeric bounds from the schema so the controls cannot construct a filter the search rejects. This is the most product-specific interaction in the app.
2. **One voice for absence.** `Notice.tsx` covers empty, loading, missing conversation, and failure with consistent heading discipline, and `ExamplePrompts.tsx` offers requests to press rather than instructions. Calm and coherent.
3. **Keyboard and screen-reader craft above the norm.** The skip link (`ChatFrame.tsx:8-9,31-48`), the two-drawing live regions (`Composer.tsx:24-33`), card-detail focus return (`CardDetail.tsx:154-177`), and the dialog focus trap (`Dialog.tsx:75-101`) would be unusual to find in a single-user tool.

## Priority Issues

1. **[P2] A dead or interrupted turn leaves a stale screen and no recovery.**
   **Why it matters**: when a stream dies or the user leaves mid-turn, `useTurn` keeps the previous interpretation and the composer shows the _previous_ search while an unanswered request sits above it (`ConversationPage.tsx:179-182`, `useTurn.ts:115-119`). The screen implies those filters apply to the question that was never answered. Every live turn ended in the same verbatim "I could not find a card that matches that request. Try broadening it." with no filter named.
   **Fix**: when the last stored message is a user turn with no reply, clear or dim the readout and render a `Notice` or alert line with a retry tied to that request; have the empty answer name the filter most likely responsible.
   **Suggested command**: `$impeccable clarify`

2. **[P2] Small machine facts fail AA contrast.** (A and detector agree the text is faint; the detector's own Send hit is a false positive.)
   **Why it matters**: Dust Grey `oklch(55.6% 0 none)` measures 4.18:1 on Room Black and 3.19:1 on Rail Grey, yet it is used at 12px for readout field names, "Searched as", "No image", and the language marker (`SearchReadout.tsx:35-40`, `MessageHistory.tsx:26`, `CardGrid.tsx:97,116`). The text that explains the search is the least legible text, and it is a **design-system value**, not implementation drift.
   **Fix**: raise Dust Grey to ~62-65% L or set 12px machine facts in Ash Grey, then re-measure on Room Black and Rail Grey.
   **Suggested command**: `$impeccable harden`

3. **[P2] "Searched as" is pointer-only.**
   **Why it matters**: it is `sr-only` and revealed by `group-hover` (`MessageHistory.tsx:24-27`), so a sighted keyboard user cannot see it and a touch user never can, contradicting PRODUCT principle 4 ("claims are checkable").
   **Fix**: also reveal on `group-focus-within`, or render it as a persistent mono line under the request.
   **Suggested command**: `$impeccable polish`

4. **[P2] Two amber fills on the conversation screen.**
   **Why it matters**: sidebar New (`Sidebar.tsx:24`) and composer Send (`PromptSurface.tsx:36`) are both filled amber, which `DESIGN.md:220-231` itself admits is undecided. The One Lamp Rule dies on the screen the user spends the most time on.
   **Fix**: decide and document; one option is a ghost New on a conversation while keeping the fill on home and the folded rail.
   **Suggested command**: `$impeccable distill`

5. **[P3] Dialog initial focus is invisible for pointer users.**
   **Why it matters**: `Dialog.tsx:53-55` focuses the first input/button, but after a mouse click `:focus-visible` does not match, so Cancel/Delete hold focus with no visible ring (verified).
   **Fix**: focus the dialog container with `tabindex=-1` plus an explicit initial-focus style, or show a ring on open independent of `:focus-visible`.
   **Suggested command**: `$impeccable harden`

## Persona Red Flags

**Alex (Power User)**: the chosen model truncates to `max-w-40` (`Picker.tsx:38`), so a long model name reads as `jobautomation/Op...` and identifying the answering model means reopening the picker every time. Every conversation row carries two always-tabbed controls, so traversal costs two stops per row, and the skip link only exists on a conversation address (`ChatFrame.tsx:31`). "Searched as" cannot be read with the keyboard at all.

**Sam (Accessibility)**: Dust Grey 12px facts at 4.18:1 / 3.19:1 (above). Pointer-opened dialogs show no initial focus. The disabled model row (`nomic-embed-text cannot answer`) uses `opacity-50` on a dark panel, so the _reason_ the row is not selectable is effectively unreadable (`Picker.tsx:187`).

**Casey (Mobile, 390px)**: "Searched as" is hover-only, so the parse rewrite is never visible on touch. The conversation title truncates with no `title`, so a long auto-title is unreachable, and `PromptSurface.tsx:89-91` focuses the field on mount, raising the soft keyboard over the example prompts before they are read.

## Minor Observations

- A conversation can hold a title with zero messages; the sidebar/header show the title while the body says "Ask for cards" (`ConversationPage.tsx:188-200`). Observed live.
- The conversation header duplicates the sidebar row text verbatim when the sidebar is open.
- The empty-result answer is identical every time and says "broaden it" without naming the filter that caused the miss.
- The sidebar width transition (`Sidebar.tsx:338`, `transition-[width]`) is the one **real** detector finding: it animates a layout property on every fold. Deliberate in DESIGN.md, but `transform` or `grid-template-rows` would avoid the reflow.
- The native `<select>` in the filter chip editor sits inside a bespoke system; `color-scheme: dark` mitigates but platform rendering will vary.
- Card grid and card detail could not be rendered live (every turn against the running stack returned zero cards), so those components were judged from source only.

## Questions to Consider

1. If the model name is what tells Alex who is answering, why is it the element that gives way first while the decorative brand keeps full width?
2. The readout is the most product-specific surface in the app, yet it never says which request it belongs to and it survives the turn. Should it be anchored to its turn in the history rather than floating above the composer?
3. Amber is "the one lamp", but the conversation screen burns two. Which is actually the action of that screen?
4. Cards are "the objects on the bench", yet before retrieval succeeds the bench shows only a prompt and four sentences. What is the bench when it is empty, and should a failed search leave it empty?
5. Principle 4 says every claim is checkable, but "Searched as" is pointer-only. On a touch device, is the claim checkable at all?

## Run Notes

- Target slug: `apps-web-src-app-tsx`; target resolved to `apps/web/src/App.tsx`.
- Ignore list: `.impeccable/critique/ignore.md` does not exist; nothing dropped.
- Assessment independence: dual isolated sub-agents, run in parallel; A ran before detector findings entered parent synthesis.
- CLI detector: static `apps/web/src` clean (`[]`, exit 0); rendered URL scan exit 2 with `layout-transition` x1 real and `low-contrast` (disabled Send) false positive; sensitivity probe returned exit 2, proving the entrypoint runs.
- Browser visibility: both assessments used chrome-devtools; A inspected wide 1280/1440 and narrow 390; B inspected four surfaces including emulated mobile touch.
- Overlay injection: succeeded on 4 surfaces; live server stopped, PID 380579 gone, port 8400 closed.
- Interference: A observed B's live server and viewport changes (the assessments ran concurrently); A re-established each state before capturing and treated the concurrent findings as unverified leads.
- Side effects: A added probe messages to the one stored conversation through the real API. No source file changed.
- Temp cleanup: `/tmp/opencode/*` only; no project source modified.
