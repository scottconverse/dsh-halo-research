# Handoff: reproduce the working SuperGrok OAuth installation

Verified on Scott's Windows Halo machine on September 15, 2026. This is the exact DSH integration that successfully generated a response using SuperGrok OAuth. It is not the separate API-key/OCR/fallback implementation mentioned in another review.

## Scope and proven result

- Host: DeepSeek Harness **0.1.6-alpha.1**.
- Plugin: [MirDie/dsh-xai](https://github.com/MirDie/dsh-xai), package **0.1.0**, pinned to commit **5946301f992b7445d8dcb26bd9c89dc86246832b**.
- Authentication: xAI device-code OAuth, approved by Scott in Chrome. No `XAI_API_KEY`, no Grok CLI credential import, no separately billed fallback.
- DSH provider/model: **xai-oauth / grok-4.6**.
- Actual DSH response: **GROK_SUBSCRIPTION_OK**, followed by a completed turn.
- Session: `session-0cb89eac-2fb1-4c88-aaf2-fcfc6156ffeb`.
- Evidence: [recorded result](evidence/dsh-supergrok-2026-09-15.json).
- Implementation commit: `e554579c2d43f3ccb4d5de727f9bac569b547c73` in Scott's private `scottconverse/dsh-halo-research` repository.

**This is a DSH plugin.** If the destination is another application, its plugin cannot simply be installed there. Reuse the authentication approach only after checking that application's provider interface; do not claim the DSH result proves another application's integration.

The installation already exists on this Halo machine. Another session working here should inspect and reuse it, not install a duplicate or request another login unnecessarily.

## 1. Identify the actual DSH installation

These were the exact paths here. For another machine, resolve its equivalent paths before executing commands. In particular, use the home and profile used by the running DSH, not an accidental new `~/.dsh` installation.

```powershell
$env:DSH_HOME = 'C:\Users\scott\.dsh-stock'
$nodeExe = 'C:\Program Files\nodejs\node.exe'
$deploy = 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh'
$dshCli = Join-Path $deploy 'node_modules\@deepseek-ai\dsh\lib\bin.js'
$webProfile = Join-Path $env:DSH_HOME 'profiles\web'

Get-Content (Join-Path $deploy 'node_modules\@deepseek-ai\dsh\package.json') |
    ConvertFrom-Json | Select-Object name, version
Get-Content (Join-Path $webProfile 'package.json')
```

Back up the target profile's package manifest, lockfile, pnpm configuration and Cordis overlay before changing them. Preserve existing bundles and defaults. Do not copy credentials into backups or the repository.

The original plugin was built against an older DSH interface; our compatibility fix below was verified specifically against 0.1.6-alpha.1. For a different DSH/plugin version, inspect its adapter contract before assuming the same patch applies.

## 2. Install using the existing pinned DSH CLI

```powershell
& $nodeExe $dshCli plugin --profile web add 'github:MirDie/dsh-xai#5946301f992b7445d8dcb26bd9c89dc86246832b'
if ($LASTEXITCODE -ne 0) { throw 'dsh-xai installation failed' }
```

The stock plugin manager added `dsh-xai` to both `dependencies` and `dsh.profile.bundles` in `$DSH_HOME/profiles/web/package.json`. It retained `@deepseek-ai/dsh-base` and `@deepseek-ai/dsh-web-app`.

Our existing web profile uses `nodeLinker: hoisted` and `autoInstallPeers: false`; the plugin resolves the already-installed stock DSH shared packages. No second DSH runtime or custom authentication bridge was added.

## 3. Apply the required alpha compatibility patch

**What failed before the patch:** OAuth login succeeded, but selecting the model returned:

```text
session/model-unavailable
Cannot read properties of undefined (reading 'get')
```

The stock alpha adapter calls `profile.modelErrors.get(model)`. The community plugin omitted `modelErrors` from the profile it constructs. The alpha interface also requires three image-budget fields. We supplied the stock alpha defaults, rather than altering DSH.

Use pnpm's patch mechanism through the DSH plugin command:

```powershell
# Choose a fresh scratch directory; this was the directory used on Halo.
$patchDir = 'C:\Users\scott\Documents\Codex\2026-09-10\gi\work\xai-patch'
& $nodeExe $dshCli plugin --profile web patch dsh-xai --edit-dir $patchDir
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare plugin patch' }
```

In the extracted package, add these four fields immediately after `configuredMaxTokens` in the provider profile in **both** `src/adapter.ts` and **`lib/index.js`**:

```javascript
modelErrors: new Map(),
maxRequestImageBytes: 20 * 1024 * 1024,
requestImagePixelBudget: 2048 * 2048,
requestImageMaxBytes: 1024 * 1024,
```

The shipped runtime is `lib/index.js`; editing only the TypeScript source will not fix this installation. Do not edit the stock DSH adapter. The exact [tested patch](../stack/stock-dsh/web-profile/patches/dsh-xai@0.1.0.patch) is preserved in this repository.

```powershell
& $nodeExe $dshCli plugin --profile web patch-commit $patchDir
if ($LASTEXITCODE -ne 0) { throw 'Could not install plugin patch' }
```

This created:

```yaml
# profiles/web/pnpm-workspace.yaml
patchedDependencies:
  dsh-xai@0.1.0: patches/dsh-xai@0.1.0.patch
```

It also updated the profile lockfile with patch hash `6dc6032e207f37647c7c8a03d0be15f504a2dcf3cc83b8c7229f2acafd505d86`. The repository preserves patch bytes on Windows with `patches/*.patch -text` in the adjacent `.gitattributes`. Do not let CRLF conversion change a locked patch's bytes.

For a restoration of this exact profile, the manifest, lockfile, pnpm settings and patch are under `stack/stock-dsh/web-profile/`. **Do not overwrite another installation's profile wholesale:** it might have additional bundles. For another existing profile, use the add/patch commands above to merge through its package manager.

## 4. Reload DSH through its normal lifecycle

On Halo we used:

```powershell
& (Join-Path $deploy 'Stop-StockDSH.ps1')
& (Join-Path $deploy 'Start-StockDSH.ps1') -NoOpen
```

That stops and restarts DSH, its Wigolo child, and Mission Control, while retaining LM Studio. Another installation should use its own launcher/process owner. Do not run an additional `npx dsh web` alongside the existing service.

In the live plugin inventory, the entry was `include:llm-xai-oauth`, module `dsh-xai`, enabled with phase `active`.

## 5. Sign in through OAuth

First inspect the current login:

```powershell
& $nodeExe $dshCli plugin --profile web exec dsh-xai status
```

The plugin returns exit code 1 when signed out; that alone is not an installation failure. If signed out:

```powershell
& $nodeExe $dshCli plugin --profile web exec dsh-xai login
```

Leave that command running while the user approves. It prints a fresh `https://accounts.x.ai/oauth2/device?...` URL and a device code. Open the actual returned URL in **Chrome**, not Edge. Do not reuse an old code from another session.

Here the page identified the application as **Grok Build**. Scott approved the account authorization. The CLI then reported `signed in; credentials saved` and returned a live account model list. Never print the contents of the credential file.

The GUI alternative is **DSH Settings > xAI Grok > Sign in with SuperGrok**. We used the CLI flow and subsequently verified the GUI displayed **Signed in** and checked account models, including Grok 4.6.

Credential location: `$DSH_HOME/.xai-oauth-auth.json`. This is separate from `~/.grok/auth.json`. We did **not** use `import`, copy refresh tokens between applications, or alter the Grok CLI login. The plugin supplies refresh behavior; refresh-token rotation was not separately tested.

## 6. Verify actual inference, not just login

1. Confirm `status` reports signed in and can fetch the account's live model list.
2. Confirm **Settings > xAI Grok** displays the account models.
3. Start a small DSH session and select **xai-oauth / grok-4.6**, or a text model actually available to the destination account.
4. Send: `Reply with exactly GROK_SUBSCRIPTION_OK. Do not use tools.`
5. Verify the actual response and completed turn. Inspect the recorded message source: it must say provider `xai-oauth` and the selected Grok model. A model's prose claiming it used Grok is not proof.
6. Verify the prior global default remains intact. DSH's model-selection API can update saved defaults; our test preserved and restored the pre-test settings. On Halo these remain `lmstudio / halo-coder-q4km`, default preset `local`.

Our check used the ordinary authenticated DSH session API: `session/create`, `session/selectModel`, `session/rename`, then `session/prompt`. We inspected the durable session events and verified `assistant/message` source `xai-oauth / grok-4.6`, text `GROK_SUBSCRIPTION_OK`, and `turn/end` reason `completed`. The UI method above exercises the same DSH provider and avoids copying our machine's private launch token or test helper.

The test used the stock minimal preset, which still supplied roughly 17.7K input tokens. It was a connection check, not a long evaluation. There is no need to run a research benchmark to prove sign-in and basic inference.

## Failure boundaries and truthful reporting

- Signed in plus a model list is insufficient: some accounts may still receive inference HTTP 403. Report that exact failure. Do not silently substitute the API-key route or claim the subscription works.
- The internal adapter callback is named `resolveApiKey`, but this plugin obtains its value from the OAuth credential store. That variable name does not mean an `XAI_API_KEY` was used.
- We did not build automatic provider fallback, OCR routing, or an Antigravity/other-app integration. Those are separate capabilities, and this successful test does not prove them.
- Image inputs, tool calling, long sessions, compaction, and future refresh were not separately accepted in this integration task.
- Preserve and publish the package patch, configuration and non-secret evidence when finished. Keep OAuth credentials, device codes and private DSH launch tokens out of Git and handoffs.

## Removal

Use **Settings > xAI Grok > Sign out** to remove the DSH credential. Then, if removing the provider itself, run `plugin --profile web remove dsh-xai` through the same pinned DSH CLI and restart normally. Removing the package alone does not remove the saved OAuth credential.
