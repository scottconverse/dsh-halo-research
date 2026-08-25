# 11. Local inference-server comparison

## 11.1 The requirement DSH actually imposes

From `docs/user/guide/providers.md` at the pinned commit, a server is usable by DSH if it:

1. answers OpenAI Chat Completions (`api: openai-completions`), OpenAI Responses, or
   Anthropic Messages;
2. accepts a bearer credential (which may be a dummy for a local server);
3. optionally answers `GET {baseURL}/models` for discovery — and DSH degrades gracefully
   without it ("enter models manually for endpoints that do not provide it").

DSH is explicit that most gateways get something wrong, and it ships two named switches for
the two most common failures:

> "A model that declares reasoning has its system prompt sent as `role: "developer"`, which
> many gateways reject outright, and the output cap is sent as `max_completion_tokens`, which
> a server that only knows `max_tokens` refuses."

**Both were tested against LM Studio on this machine, and both passed:**

| Probe | Result |
|---|---|
| `role: "developer"` accepted | **ACCEPTED** (`finish_reason: length`, 83 tokens) |
| `max_completion_tokens` honoured | **ACCEPTED** (`completion_tokens: 24`) |

**Therefore no `compat` block is required for LM Studio.** This is measured, not assumed.

## 11.2 Candidate comparison

| | **LM Studio** | **llama-server** | **Lemonade** | **Ollama** |
|---|---|---|---|---|
| Installed here | **yes**, serving :1234 | no | no | no |
| OpenAI Chat Completions | **verified on this box** | yes | yes | yes |
| `GET /models` | **verified — 34 models listed** | yes | yes | yes |
| `developer` role | **verified accepted** | UNKNOWN | UNKNOWN | UNKNOWN |
| `max_completion_tokens` | **verified accepted** | UNKNOWN | UNKNOWN | UNKNOWN |
| Vulkan backend on this GPU | **yes, running** | yes | yes | yes |
| ROCm backend for gfx1151 on Windows | **yes — v2.29.1 available** | build-it-yourself | yes | limited |
| Backend switching without rebuild | **yes — `lms runtime select`** | no, separate builds | yes | no |
| Model hot-swap / load / unload | **yes — `lms load`/`unload`** | one model per process | yes | yes |
| Multiple models resident | **yes** | multi-process only | yes | yes |
| Structured output / JSON schema | yes (grammar-based) **[community]** | yes (GBNF grammars) | yes **[community]** | weaker **[community]** |
| Tool calling | yes | yes | yes + MCP | weaker **[community]** |
| Authoritative residency query | **`lms ps --json`** | — | — | — |
| NPU path | no | no | **yes (hybrid)** **[community]** | no |

## 11.3 Recommendation

**Q6 / Q7 — LM Studio is the right choice here, and not merely because it is the easiest.**

The deciding factor is not convenience, it is that **LM Studio can switch the llama.cpp
execution backend without rebuilding anything**. On this machine:

```
llama.cpp-win-x86_64-vulkan-avx2@2.29.1     ← was selected
llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1   ← now installed
llama.cpp-win-x86_64-avx2@2.28.2            ← CPU fallback
```

Two backends at the **identical llama.cpp version**, swappable with one command. On a platform
where the Vulkan-vs-ROCm answer is workload-dependent (§10), that is a structural advantage
that llama-server cannot match without maintaining two builds, and it makes the comparison in
§10 methodologically clean.

Secondary reasons: `lms ps --json` is the only trustworthy residency/quantization readout found
in this investigation, and multiple models can stay resident — which §13's portfolio needs.

**Q8 — Is Lemonade advantageous here?** Not for the primary path today. Its distinguishing
feature is NPU/hybrid execution, and §14 concludes the NPU has no role in the primary LLM
workload. It belongs in the **EXPERIMENTAL LANE**, revisited if AMD's NPU story changes.

**Q9 — Is direct llama-server preferable?** No, for the workstation. It is the right tool for
a *microbenchmark* (`llama-bench` isolates prefill from TTFT far better than an HTTP ladder
can — see §10.4), and installing it for that purpose is recommended. It is not the right thing
for DSH to talk to.

---

# 12. Qwen3.8 analysis

## 12.1 The family, as it actually exists

Established from the Qwen model card and release records. Variants not listed here were not
found, and are not invented.

| Model | Released | Params | Type | Context | Licence |
|---|---|---|---|---|---|
| **Qwen3.8-27B** | **2026-08-14** | 27.78 B | **dense**, hybrid attention | **262,144** native, extensible to 1 M | **Apache 2.0** |
| Qwen3.8-2.4T-A95B | 2026-08-12 | 2.4 T total / ~95 B active | sparse MoE | — | open weights |
| Qwen3.8-Max | GA 2026-08-03 | undisclosed | hosted | 1 M | proprietary, hosted |

Only **Qwen3.8-27B** is relevant to this machine. The 2.4T-A95B is far beyond 128 GB at any
useful quantization, and Max is a hosted API.

## 12.2 Architecture — why this model suits this machine

> "64 layers … 16 × (3 × (Gated DeltaNet → FFN) → 1 × (Gated Attention → FFN))"

Three-quarters of the layers are **Gated DeltaNet** — linear attention with constant-size
state. Only 16 of 64 layers accumulate a growing KV cache.

Consequences, measured in §8.4:

- **KV cache at 131,072 context is ~5.6 GB**, against roughly 34 GB for a hypothetical
  conventional 27B with 64 full-attention layers.
- Long context is affordable *in memory* on a 128 GB box, and the constraint moves to prefill
  **time** rather than prefill **space**.
- It is a **native vision-language model** — text, images and video — under Apache 2.0.

## 12.3 The configuration on this machine

`lms ps --json`, the authoritative source:

```json
{ "identifier": "qwen/qwen3.8-27b",
  "path": "unsloth/Qwen3.8-27B-GGUF/Qwen3.8-27B-UD-Q5_K_XL.gguf",
  "sizeBytes": 21145786112, "architecture": "qwen35",
  "quantization": { "name": "Q5_K_XL", "bits": 5 },
  "contextLength": 131072, "maxContextLength": 262144,
  "vision": true, "trainedForToolUse": true, "parallel": 1 }
```

**Q21 — which quantization is the best compromise?** **Q5_K_XL**, and the current setting is
already right. At 21.15 GB it leaves the entire rest of a 64 GB carve-out free, decodes at the
speed measured in §10, and sits above the Q4 range where quality loss becomes visible in
code generation. Q6/Q8 would cost bandwidth — the binding constraint on this part — for a
smaller quality gain than Q4→Q5 delivers. The box also holds `q3_k_xl`, `q4_k_xl` and a `q6_k`
variant, so this is verifiable rather than theoretical.

**Q22 — what context length is actually useful?** **131,072 is the right operating setting**,
against a 262,144 maximum. Reasons: §8.4 shows the memory cost is affordable; §10 shows the
*time* cost of prefill is the real limit — a 45 K-token prompt already takes minutes. Raising
the window does not make long prompts affordable, it just permits them.

**Q23 — KV cache at 32 K / 64 K / 128 K / 256 K?** Measured total at 131 K is ~5.6 GB of
KV + compute buffers. Because 48 of 64 layers are constant-state, the growth is roughly linear
in the 16 attention layers only. A precise per-window table was **not** established — the
benchmark reached ~45 K tokens, not 256 K — and §20 lists the fill-the-window test that would
settle it. **Stated as UNKNOWN rather than extrapolated.**

## 12.4 Speculative decoding is already active — measured

A non-streaming request returned:

```json
"stats": { "total_draft_tokens_count": 5,
           "accepted_draft_tokens_count": 5,
           "rejected_draft_tokens_count": 0 }
```

**Q25 — does MTP/speculative decoding materially improve this workload? Yes, measurably.**
A 21.15 GB model on a ~256 GB/s bus has a hard decode ceiling near **12 tok/s** if every token
requires a full weight sweep. Measured decode on the accepted Vulkan runs is **14.8–16.4 tok/s**
(§10) — above that ceiling, which is only possible because multiple tokens are produced per
weight sweep. Draft acceptance was 5/5 on the sample observed.

This is important for the architecture: **the decode figure for this model is not
bandwidth-bound in the naive way**, and any capacity planning that assumes `bandwidth ÷ model
size` will understate it.

## 12.5 Agent-suitability notes

- `trainedForToolUse: true` and `vision: true` are asserted by the model metadata.
- **Thinking mode is on by default.** In a probe with `max_tokens: 8`, the response content was
  **empty** and `completion_tokens_details.reasoning_tokens` was **8** — the reasoning trace
  consumed the entire output budget. **Any DSH tool-calling configuration must budget output
  tokens well above the expected answer length, or tool calls will be truncated before they are
  emitted.** This is a concrete, measured failure mode.
- Qwen's own recommended sampling differs by mode: thinking `temperature=1.0, top_p=0.95,
  top_k=20`; instruct `temperature=0.7, top_p=0.80, top_k=20`. The benchmarks in §10 used
  `temperature=0` deliberately for reproducibility — that is a benchmark setting, **not** a
  recommended agent setting.
- Qwen documents max output of 262,144 tokens for reasoning content and 131,072 for the final
  response — far above anything a harness should actually allow.

---

# 18. DSH configuration for this machine

Config lives in `$DSH_HOME` (default `~/.dsh`): hand-written settings in
`$DSH_HOME/settings.yaml`, secrets in `$DSH_HOME/.credentials.yaml`. Model changes take effect
on the next request without restarting the server.

## 18.1 The provider block

Verified against `docs/user/guide/providers.md` and the two live compat probes in §11.1.

```yaml
llm-pi-ai:
  providers:
    lmstudio:
      # LM Studio ignores the value but pi-ai requires a credential to exist.
      apiKeyEnv: LMSTUDIO_API_KEY
      api: openai-completions
      baseURL: http://127.0.0.1:1234/v1
      models:
        # Qwen3.8-27B is a native vision-language model, but a hand-entered
        # model is treated as text-only until it says otherwise. Without this
        # line, attaching an image is refused before it is ever sent.
        - id: qwen/qwen3.8-27b
          input: [text, image]
```

Set `LMSTUDIO_API_KEY` to any non-empty string.

**No `compat:` block is needed.** §11.1 proves LM Studio accepts both `role: "developer"` and
`max_completion_tokens`. Add one only if a *different* server is introduced.

## 18.2 Containment

Leave the sandbox alone. The stock default is already `workspace-write`, resolved as
`process.env.DSH_PERMISSION_MODE ?? 'workspace-write'`.

**Do not set `DSH_PERMISSION_MODE=danger-full-access`.** Per
`docs/subsystems/sandbox.md`, that mode does not narrow confinement — it *bypasses* it
entirely: "A `danger-full-access` consumer spawns its original argv and does not call
`ctx.sandbox`." One environment variable silently disables every file-effect boundary for every
session, and nothing in the UI is obviously different afterwards.

**Known limitation, from upstream's own documentation:** on Windows the ACL runner reports
**`partial`** enforcement, not `full` — "the Windows ACL runner grants no explicit writable root
and reports partial enforcement for its ambient ACL gaps", with "Everyone/hard-link boundaries"
named as the current gaps. Windows containment here is real and worth having, but it is **not**
an absolute boundary and should not be treated as one.

## 18.3 The shell seam — leave it alone

**No patch is required here.** An earlier draft of this report instructed disabling `tool-bash`
and `bash-sandbox`; that instruction was based on a false finding and is **withdrawn**. See
§6.5.

Both rows carry `disabled: !!js process.platform === 'win32'` in the base bundle, the web-app
bundle disables the host-level rows outright, and the agent presets deployed on this machine
repeat the same gate. On Windows the agent receives **`tool-pwsh` backed by `pwsh-sandbox`**,
and no bash tool. Adding a user patch to disable something already disabled would only add a
row to maintain.

**Verify rather than assume**, using the same method that caught the original error — read the
row, not the package name:

```bash
pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --profile web --dump-config
```

Then confirm `tool-bash` carries a `disabled` key and `tool-pwsh` is the active shell row.

## 18.4 Verify the model is actually local

The stock composition sets a **cloud** default:

```yaml
- id: agent-default-model
  config:
    provider: deepseek-official
    model: deepseek-v4-flash
```

A workstation can therefore appear to work perfectly while doing none of its work locally.
After configuring, confirm with both of:

```bash
lms ps --json
```

```bash
pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --profile web --dump-config
```

The first proves which model is resident and at what quantization; the second proves what the
composed profile will actually use. **Neither can be replaced by looking at the UI.**
