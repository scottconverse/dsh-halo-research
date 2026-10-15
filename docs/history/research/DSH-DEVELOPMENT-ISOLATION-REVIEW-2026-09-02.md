> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Development isolation review — 2026-09-02

Scope: independent read-only review of `dev/prepare-dev.mjs`,
`dev/config-build.mjs`, generated development configuration, production baseline
hashes, and installed Claude SDK integration. Only this report was written.
No services, models, provider logins, production tests or CLI generations ran.

## Verdict

Development paths are separated correctly in the inspected generated files.
All seven production files in `.runtime/evidence/production-baseline.json`
still matched at **2026-09-02 02:20:51 MDT**. This proves those seven files
unchanged; it is not a claim that every file or process on the machine was audited.

Before the official Claude test, distinguish two things: the child has a real
isolated configuration directory, but it does not automatically acquire the
operator's existing login. An empty development auth store is expected to require
its own sign-in or an explicitly chosen credential mechanism.

## Findings in bootstrap and model configuration

- `prepare-dev.mjs` derives destinations from its own repository and writes below
  that clone, principally `.runtime`. Production paths are read sources only.
- It copies the production's uncommitted native-access source into independent
  development files rather than loading the production gate module directly.
- The generated preset's module URL is
  `file:///C:/Users/scott/Desktop/Code/dsh-halo-dev/stack/halo-verified-coder/index.mjs?v=10`.
- Its receipt root is
  `C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\gate-runs`.
- Profile dependencies point to development-local packages/archive. They do not
  point at the production profile's writable package installation.
- The generated profile does not attach the production memory MCP or Research
  Gateway. This prevents accidental writes to the live memory store or consuming
  shared research jobs during startup.
- The copied persona still *describes* those absent research/memory tools. That
  is a documentation/tool-discovery mismatch, not a filesystem isolation breach.
  Label them unavailable in development until intentionally connected.
- `buildDevSettings` retains the local catalog and adds OmniRoute at
  `http://127.0.0.1:20129/v1`. Local `http://127.0.0.1:1234/v1` is intentionally
  shared: configuration isolation does not isolate GPU residency. A cold-model
  request can still cause a JIT load; do not use it without scheduling agreement.
- New OmniRoute settings have an empty model list until discovery populates it;
  this is not proof of any cloud model being available.
- Re-running `prepare-dev.mjs` preserves an existing development settings file,
  but overwrites the generated profile/preset. It should not be treated as an
  innocuous health command once intentional edits are made there.
- Baseline checks reject changed production hashes on a later bootstrap. Since
  Scott is actively using production, a legitimate model-picker update can alter
  `settings.yaml`; investigate provenance rather than restoring it automatically.

## Claude: what CLAUDE_CONFIG_DIR actually controls

Inspected implementation:

1. `C:\Users\scott\.dsh\profiles\web\node_modules\@deepseek-ai\dsh-subagent-claude-code\lib\index.js`
2. `C:\Users\scott\.dsh\profiles\web\node_modules\@anthropic-ai\claude-agent-sdk\sdk.mjs`
3. Agent SDK `package.json`: version **0.3.220**.

The DSH plugin's `claudeQueryOptions` overlays `spec.env` onto the scrubbed parent
environment. Its custom spawn callback forwards the SDK-composed child environment
to DSH's managed subprocess owner. Therefore the generated development
`CLAUDE_CONFIG_DIR` does reach the Claude child; it is not a decorative YAML field.

The SDK implementation has a configuration-root resolver equivalent to:

```js
process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
```

Its `.claude.json` resolver also selects `CLAUDE_CONFIG_DIR` when set. Its resume
helper derives `.credentials.json` and project transcript paths from the selected
configuration root. These are code observations, not live login/refresh evidence.

Secure-storage identity is also directory-sensitive: the inspected SDK constructs
a `Claude Code` credential-service name with a hash suffix for a custom config
directory. **`CLAUDE_SECURESTORAGE_CONFIG_DIR` is a separate override**, and can
override that derivation. Merely changing `HOME` is consequently weaker than
setting the explicit configuration directory.

The DSH plugin sets `persistSession: false`. The SDK translates that to
`--no-session-persistence`. Thus the ordinary DSH one-shot child deliberately does
not retain a normal Claude transcript; DSH's own session/evidence remains the
record. Disabling transcript persistence does not itself disable authentication,
configuration or other runtime files.

### Remaining cautions for the first official-CLI test

- Parent-side SDK helpers can resolve `process.env.CLAUDE_CONFIG_DIR` independently
  of the child `options.env`. Set the same development directory on the DSH
  launcher process as well if all SDK-side state must follow it. Do not claim
  child-only overrides prove every parent-side helper is isolated.
- Inherited API keys, OAuth tokens, custom base URLs, host credential files,
  secure-storage overrides or remote-settings paths can change the intended auth
  route. Examine presence/names, not secret values. At this review's shell,
  `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`,
  `CLAUDE_CODE_OAUTH_TOKEN`, `CLAUDE_CONFIG_DIR`,
  `CLAUDE_SECURESTORAGE_CONFIG_DIR`, `CLAUDE_CODE_HOST_CREDS_FILE`,
  `CLAUDE_CODE_REMOTE_SETTINGS_PATH`, `CODEX_HOME`, `OPENAI_API_KEY` and
  `OPENAI_BASE_URL` were all absent. This does not prove another launcher's
  inherited environment is identical.
- Explicit dev config does not guarantee the SDK's native CLI executable is
  installed, signed in, or entitled to the desired model. Those remain separate
  bounded live checks.
- Project-local Claude instructions/settings can still apply in the selected
  test workspace. Use the development fixture workspace; do not use a production
  project as the test's working directory.

## Production hash verification

PowerShell independently loaded the baseline, ran `Get-FileHash -Algorithm SHA256`
against each recorded path, lowercased the result, and compared it to the recorded
value. Result: **7 matched, 0 mismatched**.

Verified targets:

- `C:\Users\scott\.dsh\settings.yaml`
- `C:\Users\scott\.dsh\profiles\web\cordis.patch.yml`
- `C:\Users\scott\.dsh\profiles\web\package.json`
- `C:\Users\scott\.dsh\.agent-presets\halo-orchestrator\agent.cordis.yml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-orchestrator\agent.cordis.yml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-verified-coder\index.mjs`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Run-HaloCockpit.ps1`

This review did not rerun bootstrap, start DSH/Claude, inspect credential contents,
or alter any access permissions. Native full-user capability remains intentional;
the separation reviewed here is deployment-state isolation, not an OS security
sandbox or protection against deliberately out-of-scope agent actions.

## Live authentication-status correction — 02:28 MDT

An attempted smoke command that would copy the production credential file was
rejected by the execution reviewer **before running**. No credential copy and no
generation occurred. Do not execute the pending smoke helper as written until
that design changes or Scott explicitly approves the copy.

A materially safer subsequent check used only the existing official Claude CLI
**2.1.227** with `auth status --json`, development `CLAUDE_CONFIG_DIR` and `HOME`,
and cleared child API-key/token/base-URL/secure-storage override variables. It
reported `loggedIn: true`, `authMethod: claude.ai`, `apiProvider: firstParty`, and
`subscriptionType: max`. The development config directory had no
`.credentials.json`; it contained only `.claude.json` and backups afterwards.

Therefore the earlier SDK source discussion **does not prove isolated native-CLI
authentication**. The actual CLI can resolve an existing account through another
credential source despite the custom config directory. OS-backed credential
lookup is plausible but was not traced to a specific mechanism. File/session
directory separation and account-credential separation must not be conflated.
No secret value was printed, and no OAuth login/browser or model call ran.

## One authorized no-copy Claude smoke — 02:29 MDT: AUTH BLOCKED

The execution reviewer approved a materially safer command after all credential
copying was removed: use the official CLI with development config/output paths,
no token export, and no production DSH changes. Exact command:

```text
node .runtime/evidence/run-claude-smoke.mjs
```

This made exactly one bounded print-mode request in
`.runtime/workspace/claude-smoke`, asking for a dependency-free Unicode-aware
slugifier, Node tests, and actual test execution. No provider gateway was involved.

The actual approved runner's `auth status` returned `loggedIn: false`,
`authMethod: none`. CLI exit was **1** after **1.57 seconds**, with result:

```text
Not logged in · Please run /login
```

The init frame named `claude-sonnet-5`, `permissionMode: bypassPermissions`, and
`apiKeySource: none`. This establishes the selected model alias resolution, **not
successful model access**. There were **0 created files**, and independent tests
were **not run** because no test file existed. No retry was made.

The earlier standalone auth-status result and this runner differ. That discrepancy
is unresolved invocation-context evidence, not proof the subscription is usable
in the development runner. The `authIsolation` prose field in the raw receipt
describes the intended existing-login approach; `auth` and the error are the
actual outcome. Genuine dev login or Scott's explicit approval of a chosen
credential handoff is needed before another attempt.

Evidence is under `.runtime/evidence/claude-smoke/`: `result.json`,
`auth-summary.json`, `prompt.txt`, `claude.stdout.jsonl`, and `claude.stderr.log`.
The source credential file's SHA-256 was unchanged before/after. No credential
contents were copied or printed; no production DSH file or service was changed.

## Independent development-state recheck — 2026-09-02 02:45 MDT

Read-only checks after development integration work found:

- **7/7 production baseline hashes match**, covering the seven paths listed
  above. This is a scoped integrity check, not a whole-drive assertion.
- HTTP GET of the root pages returned **200** on production DSH **3080**,
  production Mission Control **3090**, development DSH **3180**, and development
  OmniRoute **20129**. A healthy root page is not provider or tool-loop acceptance.
- LM Studio's read-only `/api/v1/models` response showed the existing loaded
  instances `halo-brain-35b` and `halo-coder-q4km`. Both reported context length
  **32768**, **parallel 1**, evaluation batch **2048**, physical batch **512**,
  flash attention enabled, checkpoint count **32**, MTP disabled, and KV cache
  offload enabled. This audit did not load, unload, or generate with either model.
- `git check-ignore` confirms development Codex auth, Claude credentials, DSH
  credential YAML, and OmniRoute database paths under `.runtime` are ignored.
  `git ls-files .runtime` returned no tracked files.

### Official Codex CLI authentication

`codex login status` was invoked with development-only `CODEX_HOME` and `HOME`:

```text
CODEX_HOME=C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\codex
HOME=C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\provider-home
```

It returned **Not logged in**, exit **1**. The initial restricted execution also
reported an inability to create PATH aliases; an approved unrestricted execution
of the same read-only status check removed that warning and still returned
**Not logged in**. No credentials were copied or extracted, no login flow was
started, and no model inference occurred. Codex subscription coding in this
isolated home is therefore **authentication-blocked**, not live-verified.

### Integration-source review and evidence limits

Reviewed `dev/rpc.mjs`, `dev/run-coding-probe.mjs`, `dev/connect-local.mjs`,
`dev/sync-catalog.mjs`, and `dev/catalog.mjs` without executing them. No production
state-write path was found in these files. RPC is restricted to development
port 3180 and checks response correlation and RPC errors. Local connection setup
targets development OmniRoute on 20129; its backend is the shared LM Studio
runtime, so deployment-state isolation does not imply hardware isolation.

Three reporting distinctions remain important:

1. The coding probe's successful exit means DSH emitted a `completed` turn. It
   does **not** independently certify application correctness; a separate test
   run and inspection of the actual request configuration are still required.
2. Catalog `configured` status is derived from setup evidence and a read of
   resident models, not an authenticated cloud generation. The summary's
   `authenticatedCloudProviders: 0` is a literal reporting value, not a live
   discovery mechanism.
3. Catalog enumeration, healthy HTTP pages, and preserved production hashes are
   separate proofs. None substitutes for real model-selected tool execution.

No ongoing model response or result was audited in this pass. No service was
started or stopped, and no production configuration was edited.

## Final independent live snapshot — 2026-09-02 03:04:12 MDT

Repeated independently after the integration probes:

| Read-only check | Observed result |
| --- | --- |
| SHA-256 comparison against `.runtime/evidence/production-baseline.json` | All 7 production paths match; 0 differences |
| Production DSH root, port 3080 | HTTP 200 |
| Production Mission Control root, port 3090 | HTTP 200 |
| Development DSH root, port 3180 | HTTP 200 |
| Development OmniRoute root, port 20129 | HTTP 200 |
| Production `session.list` RPC | 116 returned sessions; 0 `running: true` |
| Development `session.list` RPC | 3 returned sessions; 0 `running: true` |
| LM Studio instance `halo-coder-q4km` | `halo/qwen3-coder-30b-a3b-q4km`; context 32768; parallel 1 |
| LM Studio instance `halo-brain-35b` | `halo/qwen3.6-35b-a3b`; context 32768; parallel 1 |

Method: `Get-FileHash -Algorithm SHA256` for all seven baseline paths;
`Invoke-WebRequest` GET of each HTTP root; read-only `session.list` RPC on 3080
and 3180 with correlated request IDs and successful RPC-envelope checks; and
GET `http://127.0.0.1:1234/api/v1/models` filtered to loaded instance IDs, model
keys, loaded context, and parallel count. Session titles/content were not
published or inspected. Both RPC responses had an `items` array.

Omissions and limits: no inference, auth invocation, model load/unload, service
operation, destructive action, trajectory-content review, whole-repository hash
audit, or browser interaction was performed. Zero running DSH sessions does not
exclude a non-DSH client using the shared LM Studio runtime. HTTP 200 does not
prove provider credentials or coding accuracy. This is a point-in-time snapshot;
a later development-only restart may briefly change 3180 availability.

Post-restart recheck at **03:04:54 MDT**: development 3180 again returned HTTP
200; correlated `session.list` returned 3 sessions and 0 running; the newly
reported development process PID **28344** existed. This confirms availability
and idle session state after the main agent's development-only restart, not just
before it. PID existence alone is not a fresh executable-path ownership proof.
