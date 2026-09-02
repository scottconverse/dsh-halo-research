# Halo startup, unrestricted model catalog, and Bionic cloud investigation

Date: 2026-09-01 MDT (evidence timestamps after 03:00 UTC are 2026-09-02).
Scope: Scott requested finishing the unrestricted local picker and tuned-pair
startup, then investigating reuse of his existing Bionic cloud credits.
This is DSH work, not Gateway development. No new tool/permission restrictions.

## Delivered local behavior

The desktop shortcut `C:\Users\scott\Desktop\Halo Cockpit.lnk` invokes
`C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1`.

On a fresh DSH server launch it:

1. Starts the existing hidden DSH supervisor, preserving its logs.
2. Waits for the settings plugin, not just the web page's HTTP 200.
3. Discovers the local API's advertised LLMs, including available LM Link peers.
4. Adds missing catalog entries using revision-checked DSH settings mutations.
   Existing custom settings, other providers, aliases, and temporarily offline
   entries are retained. Embeddings are not added as chat models.
5. Sets the new-session default to the tuned 35B brain, without modifying
   existing conversations.
6. Preloads the brain and coder sequentially. Reuses correctly loaded instances.
7. Verifies resident quantization, context, and parallel slots before reporting
   success; opens the cockpit. Failure produces a warning and preserved log.

Reopening an already running cockpit refreshes the catalog only. It does not
reset your selection, load the pair over another model, or unload anything.
Concurrent launcher clicks are serialized before starting the server.

| Role | Model key | Resident identifier | Verified envelope |
|---|---|---|---|
| Brain | `halo/qwen3.6-35b-a3b` | `halo-brain-35b` | Q4_K_M, 32768, parallel=1 |
| Coder | `halo/qwen3-coder-30b-a3b-q4km` | `halo-coder-q4km` | Q4_K_M, 32768, parallel=1 |

Both instances report `ttlMs: null`. The existing tuned aliases remain the
source of the other load settings; no model alias or GPU split was changed.
The load command explicitly disables draft MTP. This report does not claim a
fresh runtime measurement of every historical tuning parameter.

## Live evidence, including failures

Evidence directory:
`C:\Users\scott\Desktop\Code\dsh-halo-research\stack\evidence\dsh-repair-2026-09-01`

- `startup-red.txt`: original test-first stub failed 10 of 12 tests.
- `startup-green.txt`: final startup tests 17/17 plus existing picker package
  contract tests 5/5, 22/22 total. These are deterministic contract tests,
  not a model coding benchmark.
- Initial live CLI rejected `alias@q4_k_m`, although `lms ls` advertised that
  variant name. Corrected to the bare alias, with selected quant verification
  before load and actual quant verification after load. No fake successful load.
- The first resident check incorrectly expected `config.parallel`; the installed
  CLI reports top-level `parallel`. Corrected the code and test fixtures against
  actual `lms ps --json`, without reloading the already correct brain.
- First true launcher restart reached HTTP 200 before `settings.describe`
  existed (404). Added bounded plugin-readiness retry; reran the actual launcher.
- `startup-launcher-live.txt`: actual fresh DSH restart through `Launch-Halo.ps1
  -NoBrowser` completed, selected the brain, retained 32 choices, and reused both
  verified resident models. No generation was active before stopping the exact
  owned DSH tree. No other application was stopped.
- `startup-loaded-pair.json`: both actual resident entries, right Q4_K_M,
  32768, one slot, null TTL. Brain load completed around 04:02:14Z; coder around
  04:03:17Z. The successful bare-alias loads took roughly 19 and 12 seconds.
- Browser: opened the actual picker and counted 32 radio choices. Selected the
  Q6 candidate without generating, reopened via the launcher, reloaded the page,
  and observed Q6 remained selected. Restored the tuned 35B afterward.
- `startup-api-smoke.json`: one tiny direct request per DSH-configured alias.
  The brain answered `READY.` and coder `READY`; returned model identifiers
  were the existing `halo-brain-35b` and `halo-coder-q4km`, not duplicate loads.
  This proves route resolution, not coding quality or exact formatting accuracy.
- `startup-loaded-pair-after-smoke.json`: no extra local model instance was
  created. A remote LM Link Qwen3 14B instance also appeared; it is not owned
  or operated by this task and was left untouched.
- Windows available physical memory after both loads was 30.71 GiB. This is
  one observation, not a peak trace or concurrent-workload acceptance test.

Full startup attempt logs remain at
`C:\Users\scott\.dsh\logs\halo-startup-*.log`, including failed attempts.

## Boundaries that must not be overstated

- 32 is the saved catalog count, not independent model files. Aliases, quants,
  offline peer entries, and provider-advertised auxiliary entries can coexist.
  Inventory grew while LM Link peers became discoverable; no new weights were
  downloaded by this task. Discovery does not certify completeness or tool use.
- Raw and remote choices do not automatically inherit the tuned alias settings.
  New entries use a 32K declaration (or smaller native maximum), not the advertised
  256K ceiling. That declaration must match the actual provider load context
  when using a raw/remote route. This task did not load and test every choice.
- Reopening refreshes discovery; merely leaving a tab open does not continuously
  poll for new downloads. Manual custom/offline entries are not automatically pruned.
- The helper can request `lms server start` when the API is unavailable. A fully
  stopped daemon/app path was not tested: successful live proof used Bionic
  already serving the local API. This is not evidence of a full Windows reboot.
- The local API probes were not new autonomous DSH coding or delegation tests.
  Historical guided runs keep their previous evidence boundary.
- Native full-access permission, optional verified-coder behavior, Gateway,
  Ollama, CivicCast, Sandbox ownership, and OpenClaw were not changed.

## Bionic: what is real, and what remains to connect

Installed Bionic: `C:\Program Files\Bionic\Bionic.exe`, version `1.1.1+5`.
Its UI owns the LM Studio cloud account and credits. The billing UI inspected
in this session showed $84.42 available; that is a point-in-time balance, not
a promise of free or unlimited inference. No cloud inference or purchase was
made in this investigation.

The picker offered nine hosted choices: DeepSeek V4 Flash, DeepSeek V4 Pro,
DeepSeek V4 Pro 0813, GLM 5.2, GLM 5.3, GLM 5.3 Flash, Kimi K2.6,
Kimi K2.7 Code, and Kimi K3. Official account documentation explicitly says
cloud inference consumes personal/organization LM Studio credits.

Bionic's Library uses `C:\Users\scott\.lmstudio\models`. Its local API at
1234 serves the local/LM Link models to DSH. The nine cloud choices were not
advertised by that API. A local LM Studio API token is therefore not evidence
of a usable cloud-provider credential. Direct DeepSeek/OpenRouter accounts
would not spend Scott's existing LM Studio credit balance.

### Installed-code findings, not just missing documentation

Read-only inspected bundle:
`C:\Program Files\Bionic\resources\app\.webpack-bionic\main\index.js`

SHA-256: `720FC4461C53ACFE1F785C14501700BC1FA5B86F13608FA70AC3449B9862A904`.
Only literal string-table lookup/rotation was evaluated in an isolated JS
context to read the bundle; the application code was not executed or modified.
No user authentication material was read or copied.

The code contains:

- `LMStudioCloudInternalAPIProvider`, namespace `cloudBackend`.
- `cloudInferenceNGLLMDev`, a streaming channel accepting model, inference
  configuration, and context; it forwards updates and a final message and
  accepts a stop request. Its current handler explicitly rejects image parts.
- The handler obtains the account-backed model using `getCloudInferenceNGLLM`.
- The source supplies `createSignatureHeaders` and the account's billing context.
- Remote cloud inference uses `/api/v1/cloud-inference/ng2` and the configured
  production LM Studio host. This is a signed cloud protocol, not a plain
  DeepSeek API-key endpoint.
- `cloudBackend` belongs to the internal namespace list. The separate external
  SDK namespace list is llm, embedding, system, diagnostics, retrieval, files,
  plugins, repository, runtime; cloudBackend is absent.

Reproducible inspection helper and selected excerpts are in the evidence
directory (`inspect-bionic-cloud.cjs`, `bionic-cloud-installed-code.txt`). The
helper resolves only bound string-lookup aliases; it is not a full decompiler.
These observations identify a possible seam, not proof an external client can
authenticate to it or that Bionic supports third-party use of that interface.

### Practical route forward

1. Immediately usable: use those credits inside Bionic's own cloud picker.
   DSH can remain open and use Bionic's local runtime at the same time. Do not
   run the separate LM Studio desktop application alongside Bionic.
2. Preferred DSH integration: obtain LM Studio's supported external cloud API
   or documented local bridge, if available for this account. Current official
   docs reviewed do not document one. That needs vendor confirmation, not a
   different provider subscription.
3. Possible custom integration: a DSH provider adapter talking to an authenticated
   local Bionic bridge, translating messages, streaming, tool calls, cancellation,
   and errors while Bionic keeps account signing/billing. The internal channel
   is a concrete feasibility lead. First prove authorized external connectivity
   without extracting account secrets; then one tiny cloud request, then a tool
   round trip. If it requires modifying Bionic or copying account credentials,
   stop and present that scope/maintenance tradeoff before implementation.

No bridge has been implemented or live-tested here. No nonfunctional cloud
entries have been added to the DSH picker. It would be dishonest to call
the cloud part connected, or to call it impossible merely because the API
does not list those models.

Official references checked:

- https://lmstudio.ai/docs/bionic/models
- https://lmstudio.ai/docs/bionic/accounts-plans-and-billing/credits-and-usage
- https://lmstudio.ai/pricing
- https://lmstudio.ai/docs/app
- https://lmstudio.ai/blog/introducing-lm-studio-bionic

## Files, rollback, and ownership

New helper: `stack\startup\halo-startup.mjs`.
Tests: `stack\startup\test\startup.test.mjs`.
Changed operator entry: `stack\Launch-Halo.ps1`.
Live settings: `C:\Users\scott\.dsh\settings.yaml`; canonical copy:
`stack\halo-settings.yaml`.
Pre-change settings backup:
`C:\Users\scott\.dsh\backups\startup-catalog-20260901\settings.yaml`.

For rollback, stop only idle, proven-owned DSH; restore the pre-change launcher
and the settings backup (or selectively remove this helper invocation/catalog
changes if later user choices must survive). Restart DSH. The helper does not
alter GGUFs or model alias files. Loaded models can remain resident or be
unloaded explicitly by the operator. Never replace a newer settings file with
this backup blindly: it contains the previous catalog and selection.

This task's files are kept separate from the other task's uncommitted native
access changes. Research-folder copies and the recovery manifest accompany
the implementation; this report does not authorize a GitHub push.
