> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Development CLI-provider integration review

SCOPE: DSH Halo development only. Read-only source and live-state review; no
authentication command, inference, service operation, or production edit.

## Baseline before CLI-provider implementation

Captured **2026-09-02T11:56:41.0020150-06:00**.

- All **7/7** SHA-256 values match
  `.runtime/evidence/production-baseline.json`, captured at
  `2026-09-02T08:18:16.910Z`. Exact protected paths remain listed in that file
  and `dev/ISOLATION-REVIEW.md`.
- Production DSH 3080 and Mission Control 3090: HTTP **200**.
- Development DSH 3180 and OmniRoute 20129: HTTP **200**.
- Correlated read-only `session.list`: production **116 sessions, 0 running**;
  development **3 sessions, 0 running**.
- Development Git HEAD: `092d29c1ee08ca133b3e58b393844b7ff3063b0c`.
- Existing tracked development changes before this review: `.gitignore`,
  `stack/halo-orchestrator/agent.cordis.yml`,
  `stack/halo-verified-coder/README.md`, `stack/halo-verified-coder/index.mjs`,
  `stack/halo-verified-coder/test/plugin.test.mjs`. Diff summary: **5 files,
  85 insertions, 102 deletions**. `AGENTS.md` and `dev/` are untracked. This
  summary does not imply all these changes originated in this implementation
  stage, and Git diff-stat omits untracked-file contents.

No checkpoint commit was made. Working files were not modified by this review
except this new review document. The user has now explicitly authorized using
existing official CLI logins; earlier empty-development-auth-home results are
historical, not an instruction to keep login deliberately disconnected. No
credential copy is required by the proposed integration.

## Minimal provider seam

Source root:
`C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages`.

The inspected source supports an ordinary adapter plugin; no DSH core fork or
OpenAI-compatible HTTP facade is necessary just to put CLI-owned agents in the
model picker:

1. Export a Cordis plugin injecting `llm` and `sessions`.
2. Extend `LlmAdapter` and register distinct routes such as `claude-cli` and
   `codex-cli` through `ctx.llm.registerAdapter(routes, adapter)`.
3. Supply provider names, model listing, and exact-model metadata. Preserve
   the selected model and supported reasoning settings when invoking the CLI.
4. Obtain cwd from `ctx.sessions.get(options.sessionId)?.header.cwd`. Unknown
   sessions or missing cwd must not silently fall back to the launcher's cwd.
5. Run the official CLI in that cwd using the authorized existing login. The
   CLI owns its own tools and full native execution. Keep gateway token replay
   and credential copying out of this path.
6. Map visible CLI output into DSH text blocks, report errors as terminal
   errors, and honor the DSH cancellation signal by terminating the owned CLI
   process tree. Do not change unrelated processes.

Relevant contracts:

- `llm/llm/src/index.ts:191`: `LlmAdapter`; `stream(options)` is the required
  method. Optional `providerInfo`, `listModels`, `resolveModel`, and
  `prepareCall` provide metadata and generation binding.
- `llm/llm/src/index.ts:365`: `registerAdapter`; provider route ownership is
  explicit. `llm/llm-pi-ai/src/index.ts:278` demonstrates ordinary registration.
- `llm/llm/src/types.ts`: `GenerateOptions` includes provider/model, messages,
  system, tool schemas, signal, sessionId, and optional auxiliary `purpose`.
  It does **not** include cwd directly.
- `core/session/src/index.ts:38` declares **`ctx.sessions`** (plural), and
  `:1055` implements `get(id)`.
- `llm/llm/src/types.ts`: stream blocks use `block-start`, `text-delta`,
  `block-end`, optional real usage, and terminal `finish` (`stop`, `error`, or
  `aborted`). Never fabricate token measurements from absent CLI data.

This review inspected the preserved TypeScript source, not a byte-for-byte
comparison of every installed dependency. The live plugin must resolve the
installed `dsh-llm` module and verify these contracts during its mock/load tests.

## Prevent duplicate tool execution

In CLI-owned agent mode, CLI tools have **already executed**. Do not re-emit them
as DSH `tool-call` blocks. Use plain-text activity or separate non-executing
observability records instead.

This is more precise than just emitting `finish: stop`:
`core/agent-loop/src/agent.ts:412-415` finds **any** assembled `tool-call` blocks
and executes them. The no-tool branch at line 413 returns `completed`. A stop
finish with tool-call content would still cause duplicate execution.

The resulting product is an equivalent CLI-owned coding workflow exposed through
DSH's picker, not DSH issuing every CLI-internal tool. Explain this in the picker
description and user documentation. Preserve direct local and gateway routes.

## Three correctness traps to address before live coding

### Auxiliary requests must not become new coding jobs

`GenerateOptions.purpose` can be `compaction` or `session-title`. These are not
user coding requests. Route them to a side-effect-free bounded text operation,
or explicitly report unsupported behavior until implemented. Never launch the
full coding workflow from an auxiliary title/compaction request. This limit
concerns internal operation semantics, not the user's coding agent permissions.

### Avoid automatic repetition of side-effectful agent work

`llm/llm/src/retry-policy.ts` defaults to five retries for failures including
TIMEOUT and TRANSPORT. An entire CLI agent may already have changed files before
its final failure. Supply a resolved provider retry policy with `mode: normal`,
`maxRetries: 0` for this route, or implement a proven idempotent resume mechanism.
Do not silently run the same complete coding job again after transport failure.

### Preserve continuity without replaying old instructions as new commands

Either bind a genuine CLI session/thread ID to DSH session + provider/model and
resume with only the new user input, or construct clearly delimited conversation
history for a fresh invocation. A model switch must not accidentally resume the
wrong provider's CLI session. Historical tool activity is evidence, not a new
instruction to execute again. Native CLI stderr/exit/error results must be
reported honestly even if partial text was streamed.

## Required small proof set

- Mock exact model/effort propagation, cwd lookup, cancellation, nonzero exit,
  and no DSH tool-call blocks for CLI-executed work.
- Mock auxiliary purposes and no hidden retry of side-effectful work.
- One disclosed real coding prompt through each authorized official-login
  picker route, with independent tests and runtime-selected-model evidence.
- One second user turn to verify continuity, not only first-turn chat.
- Recheck the seven production hashes and production HTTP availability after
  the development-only restart and test.

This review did not call auth status, initiate any login, inspect secret values,
send inference, review live model outputs, or modify source. HTTP availability
and source feasibility are not live subscription acceptance.

## Review of initial CLI provider and runtime implementation

Read-only review of `dev/cli-provider.mjs`, `dev/cli-runtime.mjs`, and provider
tests after their initial implementation. Findings were sent to the main agent
before its live test. They describe that inspected version; subsequent fixes
need their own test evidence.

1. **Iterator cleanup:** `finally { await work; }` does not cancel the native
   process when the consumer closes the stream without aborting the incoming
   signal. Use an invocation-owned AbortController, forward incoming abort,
   abort owned work during cleanup, remove listeners, then await bounded runner
   cleanup. Also test return while a `next()` is pending: JavaScript async
   generator `return()` queues behind the pending await, so a strong immediate
   return guarantee can require a custom iterator wrapper which aborts before
   forwarding return, not only a generator finally block.
2. **Inherited auth routes:** initial environment cleanup removes API-key
   variables but retains alternate token/base-URL variables such as
   `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, and `OPENAI_BASE_URL`. Those can
   change an existing-login official-provider request into a different auth or
   proxy route. Clear conflicting child-only environment overrides; do not
   mutate stored personal configuration. Stored CLI provider configuration may
   itself still choose another backend and must be described honestly.
3. **Reasoning metadata:** runner effort support alone does not expose the DSH
   effort picker. `resolveModel` must advertise verified effort metadata before
   DSH accepts an explicit effort. Otherwise clearly defer that control.
4. **Auxiliary synthesis:** Codex compaction is explicitly unsupported rather
   than accidentally launching a coding job. Claude `--tools ''` must be checked
   against configured MCP tools/hooks before describing it as incapable of
   side effects. Mock tests alone do not prove native auxiliary isolation.
5. **No duplicate tools found:** initial adapter only emits text blocks and
   terminal outcomes for native CLI activity; it does not emit executable DSH
   tool-call content. Automatic route retries are set to zero.

### No-turn picker persistence

The source `host/apiproxy/src/api-proxy.ts:1095-1121` keeps an explicit picker
selection in a process-local closure, falling back to the session's last real
request/header and then the live global default. `:2194-2222` changes that local
selection and saves the global default; it does not durably save a no-turn
per-session selection.

A host plugin can intercept `ctx.apiProxy.sessions.selectModel`, persist a
successful selection under development state, and restore it before model
queries/prompts. But simply calling original selectModel during restoration
also changes the global default, which is a separate correctness defect. Do
not fabricate request/header events as a workaround. A small development-only
package/source overlay can add a durable per-session selection tier directly;
a wrapper alternative needs explicit default-preservation and concurrency tests.
This secondary issue must not be called fixed solely because the latest global
default happens to match one session after restart.
