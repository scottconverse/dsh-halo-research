# 24. Community and upstream evidence

## 24.1 Real-world DSH + Strix Halo evidence — the honest position

The directive asks for this to be separated into three categories and never blurred.

**Category A — directly demonstrated DSH on Strix Halo.**
**None found.** No firsthand report was located of DeepSeek Harness driven by a local model on
Ryzen AI Max / Radeon 8060S hardware. Given DSH is **nine days old** at the time of writing,
this is expected rather than surprising. It should not be papered over: **this report's
end-to-end architecture is not something the community has already validated.**

**Category B — demonstrated components that compose.**
This is where most of the evidence sits, and it is strong:
- DSH's OpenAI-compatible provider seam is verified **in source** and its two documented
  gateway incompatibilities were **tested live against LM Studio and both passed** (§11.1).
- llama.cpp on gfx1151 under both Vulkan and ROCm is verified **on this machine** (§10).
- Qwen3.8-27B at Q5_K_XL / 131 K context is verified resident and serving **on this machine**.

**Category C — architectural hypothesis.**
The MoE-worker argument in §13.2 and the `gpt-oss-120b` reasoning role in §13.2 are reasoned
from measured bandwidth behaviour but **not yet measured** (T-1, T-2).

## 24.2 Upstream project signals

Read from the repository and its Discussions on 2026-08-23.

| Signal | Finding |
|---|---|
| **Issues are disabled** | `has_issues: false`. There is **no public bug tracker**. All reports go through Discussions (4,117 of them, 816 watchers). |
| Release cadence | 4 releases in 6 days, all prereleases |
| Community plugin ecosystem | Already active — `dsh-session-export`, `dsh-local-ai` (an Ollama adapter), `dsh-budget`, `dsh-click` ("Windows first"), `dsh-fast`, migration tools from Claude Code / Codex / OpenCode |

The absence of an issue tracker matters for a workstation build: **when something breaks, there
is no canonical place to check whether it is known.** Discussions search is the substitute.

## 24.3 Upstream-reported defects relevant to this build

These were found in Discussions and are reported here with their status **verified against the
pinned commit where possible**, rather than repeated as-is.

| Report | Relevance | Status at `b150a551` |
|---|---|---|
| **Subagents use the model snapshotted at parent-agent creation, not the currently selected model** — 7 subagents failed with `UNKNOWN_MODEL` naming a provider/model never configured (discussion 3377) | **Direct.** A local-provider setup plus subagents can fail this way. | **Not verified as fixed.** Treat as live — see §21.7 |
| **All `POST /api/*` return 403** — trust-fence compared `new URL(origin).host` against the Host header, and WHATWG drops default ports (discussion 2009) | Would break the whole UI | **Appears FIXED.** `packages/client/connection/src/api-request-trust.ts` at the pinned commit uses canonical-authority comparison with explicit port semantics, not the naive `.host` equality |
| **Orphaned `dsh web` process holds port 3080; no stop/restart subcommand** (discussion 2933) | Operational friction; blocks restart | **Live.** The CLI at the pinned commit exposes no `--stop`/`--restart` |
| `sandbox-windows-acl` gates on `resolvePwshPath` but launches literal `pwsh`, "so escape-regression tests silently never run" | **Direct** — bears on §18.2's `partial` enforcement | Reported upstream; not independently verified here |
| Hook bridge suites mount `LocalBashExecutor` unconditionally, "testing a shell no Windows host runs hooks through" | A **test-coverage** gap, not a runtime one — it is consistent with §6.5, where the runtime rows are correctly `win32`-gated but the suites do not model that | Reported upstream |
| `DSH_SNAPSHOT=refresh` writes literal cwd paths on Windows | Windows path handling | Reported upstream |

## 24.4 Community benchmark evidence, and why this report measured its own

Community reports on Strix Halo backends, recorded with their claims **[community]**:

- ROCm ≈ **+20.6 % prompt processing** and ≈ **−24.6 % generation** versus Vulkan.
- ROCm with rocWMMA Flash Attention holds throughput "with almost no drop-off" past 8 K
  context, "while using less memory than Vulkan".
- `GGML_HIP_NO_VMM=ON` is described as necessary because HIP VMM misbehaves on this GPU.
- Dense 70B ≈ 5 tok/s; 7–13B ≈ 30–45 tok/s; 30B-A3B MoE ≈ 70–100 tok/s.

**Methodology warning, per the directive.** These figures come from different models,
quantizations, context lengths, llama.cpp versions and operating systems, and several do not
state whether they measured Linux or Windows. They are **not** directly comparable to each
other, and they are not comparable to §10 — which used one model, one quantization, one
llama.cpp version (2.29.1), one OS, and one machine, changing **only** the backend.

Where §10 and community evidence **agree**: ROCm wins prefill, Vulkan wins decode.

Where §10 and community evidence **disagree**: the claim that ROCm "uses less memory than
Vulkan" is **contradicted on this machine** — see §10.4. The likely explanation is that the
community claim concerns Linux, where AMD's GTT-based memory model applies; this box is
Windows, where §8.2 shows the memory model is materially different. **This is exactly the
substitution the directive warns against, and it is why the measurement was repeated locally.**
