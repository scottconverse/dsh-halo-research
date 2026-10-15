> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# GauntletGate RE-VERIFICATION — UI/UX Designer

Repo: `C:\Users\scott\Desktop\Code\halo-stack`  Branch: `feat/halo2-wp2` vs `master`
Baseline: my original deep-dive (`02-ux.md`) reviewed commit `504a753` (215-line diff on
`mission-control.mjs`). Current HEAD `d631d30` carries 369 lines of diff on the same file.
Fix commits in scope: `d2e4097` (UX-1/2/3), `9e9ccd8` (UX-1,2,4,5,6,7,8,9,11).

## Method

- `git diff 504a753..feat/halo2-wp2 -- mission-control/mission-control.mjs` to isolate exactly
  what changed since my original pass, then read every changed line in context.
- Live re-verification at `http://127.0.0.1:3090#settings` via DOM queries, `getComputedStyle`,
  and controlled event simulation (native-setter `input`/`change` dispatch, a `window.confirm`
  override that records calls and returns a controlled value, and a `window.fetch` override to
  reproduce the two settings-load error paths without touching the real `settings.yaml`).
  Confirmed after each destructive-looking probe that the real API (`curl /api/settings`)
  still reports the untouched live values (131072 / 0.75 / 0.5 / 12288 / 1200000 / 1 / medium)
  and that no new `.mc-bak-*` file was created — **Apply was never clicked, no setting was
  changed.**
- The Browser pane's compositor is unavailable again this session (screenshot times out; this
  time `document.hasFocus()===false` and `document.hidden===true` even after fronting the tab)
  — worse than my original session, where a computed-style focus-ring reading was possible.
  Flagged explicitly below rather than guessed at.
- `node --check` on the repo file, `diff` against the deployed copy in `~/.dsh/mission-control/`,
  and a run of `tests/halo/Test-Settings.mjs`.

## Confirmed fixed (live-reproduced)

**UX-1 (was Major) — FIXED, load-bearing.** `.badge-green{background:#12341f;color:var(--green)}`
now exists (`:1084`, one definition, no dupes). Live: `#set-math .badge` has
`class="badge badge-green"`, `getComputedStyle` returns `color: rgb(95, 227, 154)`,
`background-color: rgb(18, 52, 31)` — matches the commit message's own numbers exactly, and is
visibly distinct from `body{color: rgb(238, 246, 255)}`.

**UX-2 (was Major) — FIXED, load-bearing.** All 7 controls, live-queried: real `id`
(`set-contextWindow` … `set-reasoning`), a `label[for]` resolving to each one, `aria-label`
matching the row's plain-English name, and `type="number"` on the 6 numeric inputs (the
`reasoning` `<select>` correctly has no `type`). Exactly matches the commit's claimed "7 ids, 7
aria-labels, 7 label for, 6 type=number."

**UX-3 (was Major) — FIXED, load-bearing, exercised both directions.** `showTab()` now gates a
tab change on `settingsGather()` pending count. Live: staged 1 change, clicked the real Overview
tab button with `confirm` overridden to return `false` → dialog fired with the exact text
`"Discard 1 unapplied settings change?\n\nThey have NOT been written to settings.yaml."`,
tab stayed on Settings, staged value survived. Re-ran returning `true` → tab actually switched.
Both the tab-button click handler and the `hashchange` listener funnel through this one
`showTab()` chokepoint (confirmed by reading the two listeners at the bottom of the script), so
there's no live bypass via the address bar or back/forward. See New-1 below for a real but
narrower gap this introduces.

**UX-4 (was Minor) — FIXED.** `retainRatio=0.9` (above `thresholdRatio=0.75`) live-produces
`"retain (115.2K) is at or above the compaction point (96K) — there would be nothing left to
summarize"` with a red badge — zero negative numbers (regex-checked against `textContent`). A
half-typed/empty `contextWindow` produces `"enter valid numbers to see the compaction maths"`,
Apply disabled. Reverting restores the original clean state exactly.

**UX-5 (was Minor) — FIXED**, via `aria-label`/`title`/`aria-disabled` rather than my suggested
`aria-describedby` — an equally valid, arguably stronger approach (the reason becomes the
accessible name itself). Live at rest: `title` and `aria-label` both read `"No changes to apply
yet - edit a value first."`, `aria-disabled="true"`. With a refused edit staged:
`"Cannot apply: the change above would re-arm a known failure. See the reasons listed."`

**UX-8 (was Nit) — FIXED.** Both the footer paragraph and the post-Apply success message now
wrap the real path in `<code>scripts\Sync-FromLive.ps1</code>`.

**UX-9 (was Nit) — FIXED at the source level** (not clicked, per the read-only brief).
`settingsApplyInFlight` is checked and set synchronously as the first lines of
`applySettingsChanges()`, disabling the button before the `await` — the correct minimal pattern
to close the race.

**UX-11 (was Nit) — FIXED.** A comment now states the client math is a preview and the server is
authoritative.

## Still open — claims overstated

**UX-6 (Minor) — HALF fixed; the commit's "Both are red now" is false for a third path.**
`loadSettings()` has two failure branches: `if(d.error)` (server responds, file unreadable) and
`catch(e)` (the `fetch()`/`.json()` call itself throws — MC unreachable, network drop, bad JSON).
My original finding cited both by line. Live-reproduced this session by overriding
`window.fetch` (no real file touched, restored and re-verified against the live API afterward):
- `d.error` path: now `<div class="card" style="border-color:var(--red)"><b
  style="color:var(--red)">Settings unavailable:</b> …</div>` — genuinely fixed.
- `catch(e)` path: still `<div class="mut">settings unavailable: Failed to fetch</div>` —
  **byte-identical** to the pre-fix code at commit `504a753`. `catchPath_hasRedStyle: false`.
The Apply-failure paths in `applySettingsChanges` (refused / network-catch) are both correctly
red. So 2 of 3 gray-error surfaces are fixed; the one specific line my original finding named
(`:1316`, the load-time fetch exception) was missed. Fix: same `style="color:var(--red)"` wrap
on that one remaining `catch` branch.

**UX-7 (Minor) — the client preview was rewritten; the authoritative server message and the
intro copy were not.** Live-verified: the client-side `settingsRecalc()` refusal text for
retain-above-threshold is genuinely plain language with no code suffix (matches the diff).
But `computeSettings()` — the server function whose `refusals` array is what actually gets
displayed after a real (refused) Apply — still ends its retain/threshold and idle-timeout
messages with the literal, un-decoded `(F3)` and `(F2)` (`mission-control.mjs:2832,2836`,
unchanged since `504a753`). The intro paragraph's `"(G5)"`/`(G7)`" is byte-identical to the
original, just renumbered. The one path that matters most — what the operator sees when a real
Apply is actually refused — still shows the jargon this finding flagged.

## New — found during re-verification

**New-1 (Minor) — a cancelled tab-switch desyncs the URL hash from the visible tab, and a
refresh at that point loses the edit anyway.** Live-reproduced: staged an edit, clicked the
Overview tab button with `confirm` forced to `false` (Cancel). The visible panel correctly
stayed on Settings (`settingsPanelActive:true`) — but `location.hash` had already changed to
`#overview` before the guard ran (the click handler sets the hash, *then* `hashchange` invokes
`showTab()`, which returns early on cancel without restoring the hash). An operator who cancels
the dialog to keep editing, then hits browser refresh (a very natural next move, e.g. "let me
reload to be safe") reloads fresh on `#overview` with no JS state — the exact silent data loss
UX-3 exists to prevent, one step downstream of a successful cancel. Fix: in the early-return
branch of `showTab()`, restore `location.hash='#'+currentTab` before `return`.

## Regression check

- **375px mobile**: no regression. `scrollWidth===clientWidth===375`, settings body 327px wide —
  identical to the original measurement.
- **Other six tabs**: no regression. Cycled all 7 tabs (`overview, models, sessions, plugins,
  system, memory, settings`) live; every panel renders real content and gets `.active`.
- **Console**: zero errors across the entire sweep (mutations, mocked fetch failures, confirm
  dialogs, tab cycling).
- **Focus rings**: **could not re-assess.** `document.hasFocus()` is `false` and
  `document.hidden` is `true` even after fronting the tab — worse than my original session,
  where a real computed-style reading was possible. Static check is clean (zero `outline:none|0`
  rules in any stylesheet, unchanged), which is reassuring but not proof of the rendered ring.
  Needs a session with a working compositor.
- **Deploy/live parity**: confirmed. `diff` between the repo file and
  `~/.dsh/mission-control/mission-control.mjs` is empty. `node --check` passes.
  `GET /api/settings` returns 200 with the real, untouched values.
- **Test coverage for these fixes: none.** `tests/halo/Test-Settings.mjs` only loads the code
  between `/*__SETTINGS_FN_START__*/…END__*/` — `computeSettings`/`applySettings`/
  `SETTINGS_WHITELIST` — and never touches the `PAGE` template's HTML/CSS/client-JS. `Run-Tests.ps1`'s
  `MC1` is a boot-smoke test (script parses, server starts) and `H9` is a grep for
  substrings (`/api/settings`, `function loadSettings`, …). Neither exercises `badge-green`,
  the `aria-*`/`label` wiring, the `showTab` confirm guard, or `settingsApplyInFlight` — grepped
  `tests/` for all four and found nothing. Every fix confirmed above was confirmed **by hand,
  live**, not by any gate that runs on the next commit. This was true before the remediation and
  is unchanged by it; the "45 pass / 38 mutations" claim is accurate but proves nothing about
  this tab's UI.

## Could not assess

- Pixel/visual rendering — compositor unavailable, as in the original pass.
- Real screen-reader output (NVDA/Narrator) — DOM inference only.
- The actual double-submit race (UX-9) and post-Apply re-render — Apply was never clicked, per
  the read-only brief.
- Focus-ring computed style this session (see above) — a regression from what my original
  session could measure, environmental not code-caused as best I can tell.

## Summary

**Severity counts, what REMAINS:** Blocker 0, Critical 0, Major 0, Minor 3, Nit 0.

**Confirmed fixed:** UX-1, UX-2, UX-3, UX-4, UX-5, UX-8, UX-9, UX-11 (8 of 11), all live-reproduced.
**Still open:** UX-6 (2 of 3 gray-error paths fixed; the `loadSettings` fetch-`catch` branch is
byte-identical to the original bug — "Both are red now" is false), UX-7 (client preview fixed;
server's authoritative refusal text and the intro copy still carry the exact "(F3)"/"(F2)"/"(G5)"/"(G7)"
shorthand the finding named).
**New:** 1 Minor — cancelling the Settings tab-switch warning leaves the URL hash pointing at the
destination tab; a refresh at that moment loses the edit anyway and lands on the wrong tab.
**Could not assess:** focus-ring rendering (no compositor this session), real screen-reader
behavior, the live double-submit click (out of scope, read-only).
**Systemic:** none of the 8 confirmed UI fixes have automated coverage — verified by hand only.
