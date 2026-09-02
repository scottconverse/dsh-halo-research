# Development-only searchable DSH picker

This is a small UI overlay on `@deepseek-ai/dsh-client-ui-model-selection` rc.2. It adds search to the composer model menu while retaining the same directory, provider/model identifiers, selection RPC, reasoning selector, load errors, and every catalog entry. Search is a display filter, not an allowlist. Clearing it restores all models; typing does not select anything.

The input matches all typed words, case-insensitively, across provider name/ID and model name/ID/description. It is literal text, not a regular expression. An accessible label, match count, no-results message, automatic input focus, and Arrow Up/Down navigation are included. The original root/effort menu and Escape/back behavior remain.

## Scope and provenance

- All modified files and the artifact are under `C:\Users\scott\Desktop\Code\dsh-halo-dev\dev\picker`.
- Source was copied from the existing Halo upstream `packages/client/ui-model-selection/src/client` tree, which already contains Halo's unrestricted picker fix.
- The server half, declarations, and MIT license were copied from the installed development profile package before changes. `package/lib/index.js` and `package/lib/invariant.js` remain byte-identical to that installed package.
- No installed/hardlinked package file was edited. No service was restarted, no profile was installed, and no inference request was made by this workstream.
- `tests-upstream` is a provenance copy of the existing upstream tests, **not claimed as executed**. The tests actually executed here are the `.test.mjs` files described below.

## Build and test

Run from this directory after the parent development tools install is present:

```powershell
node build.mjs
node capture-test.mjs opening-green
tar -czf deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2-halo-dev-search.3.tgz package
```

`build.mjs` uses the existing development tools' esbuild (no new dependency installation). It bundles the copied TSX source into DSH's normal `window.__ModuleLoader__.load({id,factory})` contract, keeps React and DSH runtime identities external, and bundles clsx. CSS class names receive a development-only prefix and styles are injected once per plugin factory. The original server code is not rebuilt.

## Consumption — development profile ONLY

The parent implementer must serialize the change with any active development coding run. Do not edit the production profile.

1. Set `dependencies["@deepseek-ai/dsh-client-ui-model-selection"]` in `C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\dsh\profiles\web\package.json` to:

   `file:C:/Users/scott/Desktop/Code/dsh-halo-dev/dev/picker/deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2-halo-dev-search.3.tgz`

2. Run `pnpm install --ignore-scripts` in that development profile directory. The parent should also preserve this override in its development profile generator, so a later prepare step does not restore the older tarball.
3. Restart only the proven-owned development DSH on 3180 using its existing dev launcher. Hard refresh the development browser tab.
4. Browser acceptance: search `Claude`, `DeepSeek`, `Kimi`, `GLM`, and a local model; confirm count and row identities, no-match state, clear/reset, keyboard focus, effort selection, desktop/mobile layout, and browser console. Select a route and verify DSH's session model before a coding request. Catalog visibility is not proof that a provider has credentials.

The artifact was **built and component-logic tested, not installed or browser-accepted by this workstream**. Browser acceptance belongs to the parent after the serial install/restart window.

## Evidence and limitations

Version `search.3` adds an opening-screen “New conversation model” dock through the existing additive `shell.overlay` slot. It disappears when the session composer takes over. It reads the full `llm.models` catalog and `agent-default-model` settings; selection saves the exact provider/model/optional effort through `settings.replace({ns, section})`. No session is created and no inference occurs merely to populate the opening picker. Save failures preserve the prior selection and remain visible; missing defaults do not hide repair choices. Settings/provider events and reconnect refresh the directory. No local-storage route replay or silent fallback is introduced.

Opening-specific RED is preserved in `evidence/opening-red.txt`: 17 tests, 11 pass, 6 assertion failures. The final complete output is `evidence/opening-green.txt`. Additional falsification found and fixed a missing-default empty-catalog defect; a late initial read cannot overwrite a newly saved selection. These deterministic tests fake the API, not a live service restart.

**Separate existing-session limitation:** stock host `api-proxy.ts` stores a selection made without another turn only in an agent WeakMap and the global default. After restart an old session's logged request header takes precedence over that default. This UI artifact does not fix that host persistence gap. Do not claim that opening-default persistence proves existing-session/no-turn persistence; the parent is addressing it separately. Browser acceptance must include no-session opening, exact saved route, fresh blank session, restart, visible failures, and existing conversation continuity separately.

Version `search.2` addresses clipping observed by the parent in the installed development browser: the menu is now 520px wide at most (viewport minus 32px on smaller screens), model names and descriptions wrap without a line clamp, and buttons cannot grow wider than their container. Each row's native tooltip includes provider, full model name, and description. The parent must recheck the new layout after installation; this workstream has not rendered the new version in a real browser.

- Before the change, the installed bundle passed the exact-ID selection baseline: `node --test component.test.mjs` reported tests 1 / pass 1 / fail 0 / skipped 0.
- `evidence/red.txt` preserves the full expected failing run: 8 tests, 2 pass, 6 fail, 0 skipped. Failures are assertion failures for the missing search/filter, not missing imports.
- `evidence/green.txt` preserves the latest full test output and exact command. Tests cover pure filtering, 3,000-entry completeness, input strings resembling regex/markup, actual built component handlers, exact route submission, keyboard navigation, and visibility of failure evidence.
- The component harness executes the real emitted component with controlled hooks and the module-loader contract. It is **not** a real React/DOM/browser accessibility test; it does not establish viewport layout or console health.
- All choices are still rendered when the search is empty. No paging cap, capability restriction, or provider exclusions were introduced.
- Existing locale wording is preserved; new labels are English and Simplified Chinese.
- No commits, publication, or production deployment were performed.

## Security / maintenance

- Search is local-only and sends no input to a network endpoint. No new endpoints/auth changes.
- Display text stays in React text nodes. No `innerHTML`, eval, credential data, or new provider calls.
- The build-time VM test evaluates only this locally built artifact; it is not exposed to user strings.
- No new dependency was introduced. This work did not perform an independent vulnerability audit of already-installed esbuild/clsx.
- Rebase this small source overlay when DSH changes its picker module contract. Do not replace installed files in-place; build a fresh development package.
