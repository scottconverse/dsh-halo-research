# Halo parallel-slot review and reconciliation — 2026-08-30

**Status:** accepted correction and follow-up design; no configuration change

**Governing operational decision:** keep the installed daily brain and worker at
`parallel=1`. This is a workload-specific default, not a claim that Strix Halo,
LM Studio, DSH, or Qwen cannot benefit from parallel inference.

## 1. Inputs

Two outside reviews compared Halo's first slot test with public results from
other Strix Halo operators. The exact reviewer inputs were supplied to Codex at:

- `C:\Users\scott\.codex\attachments\bff79e43-b6b1-4db7-9112-55372b73fcc9\pasted-text.txt`
- `C:\Users\scott\.codex\attachments\df9e9b5a-1d9b-4809-b3d1-b5acc6abce2a\pasted-text.txt`

The underlying Halo measurement is:

- `stack\HALO-PARALLEL-SLOT-TEST-2026-08-30.md`
- LM Studio log:
  `C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-30.1.log`

The public comparison sources were checked directly rather than accepted from
the reviewer prose.

## 2. Reconciled findings

### 2.1 What remains established

1. The one-slot and two-slot cells completed accurately: four exact long
   responses and four exact tool calls in each cell.
2. In the single observed run, two slots did not improve the Halo workload:
   single-request latency was tied, the four-request batch was 12.7% slower,
   batch output throughput was 11.3% lower, and the four-tool batch was 25.1%
   slower.
3. The sample size was one run per cell. Those differences are directional,
   not a general performance law.
4. The 96/32 VGM split left very little Windows headroom during the experiment:
   approximately 3.4 GiB minimum available memory at one slot and 2.7 GiB at
   two, with commit near 99%.
5. The current Halo workflow is intentionally serialized. The 35B planner sends
   one bounded unit to the 30B worker and waits for its mechanically verified
   result. More slots cannot help that topology until DSH actually submits two
   requests to the same model concurrently.

### 2.2 Correction: the four-slot cell is invalid

The first report treated the four-slot stall as stronger evidence. That was
wrong. The `lms load` process was interrupted at approximately 98% after `lms
ps` showed the model as idle. Subsequent recovery work proved that this status
can appear before the backend is fully ready. The two-token probe was then sent
while earlier requests could still be outstanding.

The log proves `n_slots = 4` and `n_ctx_slot = 32768`; it does not prove a clean,
ready, uncontended performance cell. Four-slot performance is therefore
unmeasured. The attempt is useful only as a warning about the load/readiness
procedure.

### 2.3 Correction: paging is a hypothesis, not a result

The available-memory and commit data make reclaim or paging pressure plausible,
and other Strix Halo operators have documented severe unified-memory stalls.
Halo did not record hard faults, pagefile I/O, process working sets, or disk
latency in this run. The cause of the bad four-slot state remains unresolved.

### 2.4 Correction: the throughput label

The old label "aggregate decode" was inaccurate. Halo divided completion tokens
by complete batch wall time, which includes prompt processing, queueing, and
scheduling. The report now calls this **batch output throughput**. Pure engine
decode throughput must come from server timing fields.

## 3. What the public evidence adds

Public Linux/RADV `llama.cpp` tests on the same APU show that parallel serving
can scale substantially. One Qwen3.6-35B-A3B Q4_K_M result increased from 58.80
aggregate output tok/s at one request to 96.08 at two and 138.83 at four. A
separate reproducible project measured Qwen3.6-35B-A3B Q4_0 at 178 aggregate
tok/s with 32 clients. Those workloads optimize multi-user serving throughput,
not time to verified software, and do not transfer directly to Windows LM
Studio. They do disprove any hardware-wide claim that Strix Halo cannot scale.

The multi-slot project also found a stack-specific concurrency cliff after
eight requests and found MTP beneficial at one and two clients but harmful at
four or more on its stack. These results reinforce that concurrency and
speculative decoding must be measured together on the actual runtime; neither
is a universal toggle.

AMD's VGM guidance confirms the underlying trade: VGM is subtracted from
CPU-visible system RAM. The 96 GB setting exists to fit very large models, but
can reduce system performance when the workload does not need that allocation.
Halo's retained daily pair uses roughly 49 GiB dedicated, so VGM choice should
be reevaluated separately from slot count if concurrency becomes a product
goal.

DSH's source supports independent sibling tool-call execution through
`maxParallelToolCalls`; setting it to one serializes dispatch. That capability
does not change Halo's current one-worker gate contract. A future fan-out mode
must add explicit admission control and isolated workspaces rather than merely
raising the LM Studio slot number.

## 4. Accepted operational profiles

### 4.1 Installed daily profile

- Brain: Qwen3.6 35B-A3B Q4_K_M, 32K, `parallel=1`
- Worker: Qwen3 Coder 30B-A3B Q4_K_M, 32K, `parallel=1`
- Both resident when headroom permits
- One model generating at a time
- One gated worker unit per planner decision
- This is the only accepted and installed profile

### 4.2 Proposed optional fan-out profile — not installed

The useful concurrency target is not "make every model parallel." It is a
separate coder-only profile for two genuinely independent implementation units:

- planner remains `parallel=1`;
- coder candidate uses `parallel=2`;
- DSH admits at most two sibling coder units;
- units have disjoint worktrees and editable scopes;
- each receives an independent mechanical verdict;
- the planner integrates only passing units;
- failure in one unit cannot promote, overwrite, or certify the other.

This profile is experimental until the end-to-end test below passes. It must
not silently replace the daily alias.

## 5. Bounded retest contract

A future retest should take roughly 20–30 minutes after any required reboot,
not become another soak campaign.

1. Give Windows more headroom first and verify it independently. Prefer an
   available intermediate VGM profile; otherwise compare 64/64 with the current
   96/32 split as a separate reversible decision.
2. Leave the planner at one slot. Change only a disposable coder candidate.
3. Wait for every `lms load` command to report successful 100% completion.
4. Run at least three short repetitions in alternating order.
5. Run two context designs:
   - fixed total context: `1x32K` versus `2x16K`;
   - production context: `1x32K` versus `2x32K`.
6. Record server prompt/decode timings, client TTFT, per-request latency, batch
   output throughput, exact tool-call accuracy, Windows available memory,
   commit, hard faults, pagefile I/O, and disk activity.
7. Do not change KV precision in the same experiment. F16 KV is the accepted
   coding-reliability baseline; a Q8 experiment needs its own correctness gate.
8. If the direct two-slot candidate is promising, run the only product-relevant
   comparison: two independent gated coding units serialized versus concurrent.
   The metric is time to **two independently verified green units**, not raw
   aggregate tokens per second.

## 6. Revised conclusion

Keep `parallel=1` for daily Halo because the installed workflow is serial and
the one completed two-slot sample failed to earn promotion. Do not cite the
four-slot attempt as comparative evidence. External results justify a future
coder-only two-worker profile, but only with adequate Windows headroom,
authoritative load completion, repeated measurements, and a real DSH gate test.

## 7. Primary sources

- AMD, Variable Graphics Memory FAQ and system-RAM trade-off:
  https://www.amd.com/en/blogs/2025/faqs-amd-variable-graphics-memory-vram-ai-model-sizes-quantization-mcp-more.html
- `strix-halo-guide`, server concurrency shootout:
  https://github.com/hogeheer499-commits/strix-halo-guide/blob/main/SERVER_SHOOTOUT.md
- `botAGI/strix-halo-multislot`, methodology and raw-result repository:
  https://github.com/botAGI/strix-halo-multislot
- LucRoot Strix Halo memory-pressure and mmap pitfalls:
  https://github.com/LucRoot/Strix-Halo-Linux-Llama_cpp-ROCm/blob/main/docs/PITFALLS.md
- DeepSeek Harness parallel tool-call execution design:
  https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/feature/2026-07-10-parallel-tool-call-execution.md
- DeepSeek Harness agent-loop documentation:
  https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/agent-loop/README.md
- LM Studio Windows Strix Halo allocation report, issue 1790 (one open report,
  not a confirmed universal ceiling):
  https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/1790
