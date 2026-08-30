# Halo DSH implementation report — 2026-08-27

Completed: 2026-08-27 03:04 MDT  
Updated through: 2026-08-27 15:00 MDT  
DSH: `@deepseek-ai/dsh@0.1.1-rc.2`  
Operator URL: http://127.0.0.1:3080  
LM Studio API: http://127.0.0.1:1234

Definitive configuration record: `HALO-CURRENT-CONFIGURATION.md`.

> **2026-08-29 supersession:** This is the original implementation report.
> The current 96/32 configuration uses the dual-resident
> `halo/qwen3.6-35b-a3b` / `halo/qwen3-coder-30b-a3b-q4km` pair, and the live
> verified-worker path now uses a simplified six-tool direct Coder lane with a
> single-call parent lock and gate-owned scratch. Use
> `HALO-CURRENT-CONFIGURATION.md` and
> `HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md` for current operation; model and
> sequential-residency statements below are historical.
> The final simplified autonomous path was proved on a real Hardgate unit on
> 2026-08-30; see `HALO-SIMPLIFIED-CODER-EVIDENCE-2026-08-30.md`. That proof
> also records the verifier-contract limitation found during independent
> review.

## Result

The Halo DSH stack is running. New sessions use the user-owned `halo-orchestrator` preset, the tuned `halo/qwen3.8-27b` alias is the default cockpit, and the tuned `halo/qwen3-coder-30b-a3b` alias is the bulk implementation worker. Native Codex/Claude subscription-backed delegation works. New Halo sessions default to DSH `danger-full-access`. Anonymous Exa MCP search and fetch are available without a DeepSeek or Exa API key. Stage 1 proved both aliases at one 32K slot through the real DSH JIT path. Stage 2 removed the false `medium` declaration and proved that an effort-less DSH request preserves LM Studio's real boolean `on` default, produces a separated reasoning block, and introduces no conversion warning.

The live DSH catalog contains exactly one provider group, `lmstudio`, with 18 local models and zero catalog failures. No DeepSeek API model group is exposed. Codex and Claude are tools because their native subscription authentication is not an OpenAI-compatible picker provider.

## Live model catalog

1. Qwen3.8 27B Q5_K_XL (Halo cockpit)
2. Qwen3 Coder 30B-A3B Q4_K_S (Halo worker)
3. Qwen3.8 27B Q5_K_M
4. Qwen3.8 27B Uncensored Q6_K
5. Nemotron 3.5 Lightning 30B-A3B Q4_K_S
6. Qwen3.8 27B Q4_K_M
7. Gemma 4 26B-A4B IT Q4_K_S
8. Gemma 4 12B QAT Q4_0
9. Gemma 4 31B QAT Q4_0
10. Gemma 4 12B Coder Fable5 Composer 2.5
11. Qwen3 VL 30B-A3B Instruct Q4_K_M
12. Qwen3 Coder Next 80B Q4_K_M
13. Muse Glimmer 30B Q4_K_XL
14. GPT-OSS 20B MXFP4
15. GPT-OSS 120B MXFP4
16. Qwen3 Coder 30B-A3B Q4_K_M
17. Gemma 4 26B-A4B Q4_K_M
18. Qwen3.6 35B-A3B Q4_K_M

Deliberately excluded:

- `qwen3.5-35b-a3b-ud-layers`: incomplete 10.9 MB artifact.
- `qwen3.8-27b-uncensored@f16`: CLIP vision projection, not a chat LLM.
- `gemma-4-12b-it`: 423M draft/MTP component, not the full 12B model.
- Nomic embedding models.
- Six LM Link remote entries from R71/TinyRyzen7, so a “local” choice cannot silently route to another machine.

LM Studio's default load context is now 32,768. DSH advertises 32K for normal local models, 16K for the 80B Coder Next, and 8K for GPT-OSS 120B to keep the largest models conservative on this box. JIT loading and auto-eviction remain enabled; the current model TTL is one hour. The launcher no longer manually loads or pins the 27B, and no model was resident at the final idle-state check.

The two normal Halo routes now use Halo-owned LM Studio model definitions so
their tuned loader settings survive JIT requests. Runtime evidence showed
`parallel=1`, 32K, 2048/512 batches, Flash Attention, 32 checkpoints, GPU KV
offload, and 27B MTP `n=4 / p=0.5`. The raw model ids remain picker choices,
but are no longer the default cockpit or worker route.

## Halo Orchestrator tools

- `subagent_coder`: Halo-owned DSH composite around the tuned local Qwen3 Coder. It creates a detached staging worktree and synthetic `workspace-write` parent, allows two bounded worker rounds, rejects protected/out-of-scope changes, verifies in an independent baseline worktree, and promotes with compare-and-swap plus post-promotion rollback. It remains foreground-only and is not the shipped PTC/Code preset.
- `subagent_codex`: native Codex 0.147.0 payload, normal signed-in Codex account, `dangerously-bypass-approvals-and-sandbox`.
- `subagent_claude_build`: native Claude Code Agent SDK/CLI payload, normal signed-in Claude Max account, `bypassPermissions`.
- `subagent_claude_plan`: same native Claude account in read-only plan mode.

The old global persona and false “Coder in Code Mode” claim were removed. The new routing prompt is scoped only to the Halo preset and accurately describes the local worker as inheriting the Standard-derived Halo composition rather than the shipped PTC/Code preset. It requires parent-side verification and preserves unrelated changes. As requested later on 2026-08-27, the launcher and saved future-session default now select `danger-full-access` (`approval: never`). DSH propagates that explicit policy to in-process children; the native Codex and Claude Build plugins receive their equivalent provider-specific full-access modes. Claude Plan remains intentionally read-only. Existing sessions retain the permission preset they were created with.

## Sequential model residency

Halo now leaves local model residency entirely to LM Studio JIT. The intended
and verified lifecycle is 27B planning, exclusive Coder implementation, then
27B review. `subagent_coder` is foreground-only so the parent cannot resume and
reload the 27B while the Coder is still working. A live DSH test observed only
the 27B, then only the Coder, then only the 27B; the child returned `CODER_OK`
and the resumed parent returned `PARENT_OK`.

## Web and research

The active web profile mounts DSH's Streamable HTTP MCP client against the
public endpoint `https://mcp.exa.ai/mcp`. New Halo sessions receive
`mcp__exa__web_search_exa` and `mcp__exa__web_fetch_exa`. A real 27B DSH
session invoked Exa search without an account or key and retrieved the
official DeepSeek Harness GitHub repository.

The bundled DeepSeek search route remains disabled because this installation
has no DeepSeek API key. DSH's bundled direct HTTP fetch remains disabled
because its upstream implementation does not adequately protect private
network targets on a full-machine agent. The installed DSH-visible
`reddit-search` skill remains the Reddit path. The Codex-side Crawl4AI skill is
not automatically a DSH capability, and the partial Halo Research Gateway is
not deployed.

## End-to-end evidence

All checks were executed through the live DSH HTTP API, not inferred from configuration:

- Live roster: `halo-orchestrator` is the default and has no broken reason.
- Live catalog: one `lmstudio` group, 18 models, zero failures.
- Local cockpit: session `session-af49b60a-463f-4b13-b647-4fc3168acbf3` returned `HALO_LOCAL_OK`.
- Codex tool returned `CODEX_CHILD_OK`, `isError: false`.
- Claude Plan returned `CLAUDE_PLAN_OK`, `isError: false`.
- Claude Build returned `CLAUDE_BUILD_OK`, `isError: false`.
- Local Coder tool returned `CODER_CHILD_OK`, `isError: false`.
- Picker regression: session `session-beff31db-bf7a-471d-915d-1c81baa82df8` selected `unsloth/qwen3-coder-30b-a3b-instruct`, DSH reported that exact current selection, and the selected model returned `PICKER_SWITCH_OK`.
- Anonymous Exa MCP regression: the 27B emitted a real `mcp__exa__web_search_exa` tool call and returned the official DeepSeek Harness GitHub URL.
- Sequential-residency regression: a real `subagent_coder` call produced exclusive 27B -> Coder -> 27B residency and completed with `CODER_OK` / `PARENT_OK`.
- Stage 1 tuned-alias regression: fresh session `session-halo-stage1-20260827-1209` loaded `halo/qwen3.8-27b` at one 32K slot, child `7180b96d-f8aa-465f-a601-9589f8ed00c1` loaded `halo/qwen3-coder-30b-a3b` at one 32K slot and returned `HALO-STAGE1-WORKER-OK`, then the parent reloaded the tuned 27B and ended normally.
- Stage 1 receipt: `STAGE-1-RUNTIME-EVIDENCE-2026-08-27.md`.
- Stage 2 reasoning regression: session `session-halo-stage2-20260827-1454`
  recorded no `reasoningEffort` in its durable request header, LM Studio
  advertised `[on]` with default `on`, DSH persisted a distinct reasoning
  block, and the visible response was exactly
  `HALO-STAGE2-REASONING-OK: 12193`.
- Stage 2 warning deltas: zero new `medium`, conversion, or fallback warnings.
- Stage 2 receipt: `STAGE-2-RUNTIME-EVIDENCE-2026-08-27.md`.
- Stage 3 zero-model gate and wrapper: 8/8 Node tests passed, including honest
  promotion, protected-test cheating, verifier timeout, and verifier launch
  crash. A real `session.create` through DSH mounted the replacement tool in
  the `halo-orchestrator` preset. See
  `STAGE-3-IMPLEMENTATION-EVIDENCE-2026-08-27.md` for the explicit boundary:
  the live Coder canary awaits the coordinated LM Studio memory window.
- DSH's process tree contained no lingering Codex or Claude child after the completed calls.
- The complete 18-model catalog and picker switch were validated. The other 16 large models were not individually loaded and generated through; doing that would create hours of churn without improving the picker/configuration proof.

## Installed and changed paths

Live configuration:

- `C:\Users\scott\.dsh\settings.yaml`
- `C:\Users\scott\.dsh\profiles\web\package.json`
- `C:\Users\scott\.dsh\profiles\web\pnpm-lock.yaml`
- `C:\Users\scott\.dsh\profiles\web\cordis.patch.yml`
- `C:\Users\scott\.dsh\.agent-presets\halo-orchestrator\preset.yml`
- `C:\Users\scott\.dsh\.agent-presets\halo-orchestrator\agent.cordis.yml`
- `C:\Users\scott\.lmstudio\settings.json`
- `C:\Users\scott\.lmstudio\hub\models\halo\qwen3.8-27b\model.yaml`
- `C:\Users\scott\.lmstudio\hub\models\halo\qwen3-coder-30b-a3b\model.yaml`

Reproducible repo copies:

- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-settings.yaml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\web-cockpit.patch.yml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-orchestrator\preset.yml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-orchestrator\agent.cordis.yml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\lmstudio-models\halo\qwen3.8-27b\model.yaml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\lmstudio-models\halo\qwen3-coder-30b-a3b\model.yaml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\STAGE-1-RUNTIME-EVIDENCE-2026-08-27.md`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\STAGE-2-RUNTIME-EVIDENCE-2026-08-27.md`

Pre-change backup:

- `C:\Users\scott\.dsh\backups\halo-orchestrator-20260827-024426`
- Complete pre-Stage-2 backup, including LM Studio Halo aliases:
  `C:\Users\scott\.dsh\backups\halo-stage2-20260827-144812`

Key SHA-256 values:

- settings.yaml: `4C1FEBF7D17705A7177A76B90E012153EC6512EDCA5EDCAA8EFECAA25B1029D1`
- profile package.json: `6CDD70EDBD660AD338E141D7579D9EE4A40B0780E5FC2AD88FE120B3DA374542`
- profile pnpm-lock.yaml: `DAD3BC6FE62909266AA59A553A356D36D695C2807F9B3E9C2DC7C4B86482D789`
- profile cordis.patch.yml: `7EF0D9E67A7DB2D59ACA2EE54ADAD7A120602527577CC64E7102F3C9CBAC85D5`
- Halo agent.cordis.yml: `4C268021E90A88A350B472AB31EF283F0F042A097021236F2608B63163E1640E`
- Launch-Halo.ps1: `F4985FBED3ED1C1F9DE9C3057386FCD48427E0036F1336308F80A8F141281F68`

## Operation

DSH and LM Studio are running now. The existing desktop shortcut is valid:

`C:\Users\scott\Desktop\Halo Cockpit.lnk`

It launches:

`C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1`

The launcher is idempotent: it leaves model residency to LM Studio JIT, starts DSH only when the service is absent, and opens http://127.0.0.1:3080.

## Preserved unrelated work

No unrelated work was reset or overwritten. The existing modified `stack/gateway-conductor/LEDGER.csv` and untracked `stack/gateway-conductor/runs/B8a-char-budget-0826-164621/` remain untouched. No commit or push was performed.
