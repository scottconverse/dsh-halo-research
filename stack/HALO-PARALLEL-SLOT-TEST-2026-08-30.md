# Halo parallel-slot test — 2026-08-30

## Outcome

Keep the daily 35B planner and 30B coder at **one parallel slot each**.

The 96 GB GPU allocation made two and four 32K slots technically loadable, but
this short test did not show a throughput benefit. Two slots produced similar
single-request speed and modestly worse concurrent results in one sample. The
four-slot cell entered a bad operational state, but it is **invalid as a clean
performance measurement**: the `lms load` command was interrupted at about 98%
after the model appeared idle in `lms ps`, and the later two-token probe ran
while earlier requests could still be outstanding. The normal one-slot pair was
restored only after an authoritative 100% load completion and was smoke-tested.

This is a quick operational decision, not a statistically conclusive benchmark.
The two-slot differences could include run variance. The defensible claim is
that additional slots **failed to demonstrate a benefit** on this workload and
reduced host-memory headroom; it is not that two slots can never help any
workload. No conclusion about four-slot performance is supported by this run.

## Test shape

- Model: `halo/qwen3.6-35b-a3b`, Q4_K_M, MTP off
- Context: 32,768 tokens per slot
- Cells: `parallel=1`, `parallel=2`, `parallel=4`
- Workload per completed cell:
  - one warm-up
  - one prompt of about 9,960 input tokens
  - four simultaneous prompts of the same size, each with a deterministic
    64-integer JSON response contract
  - four simultaneous structured tool calls with exact-argument validation
- Safety cutoff: abort active requests below 1.5 GiB available Windows memory
  or above 99.8% committed memory
- Normal coder was unloaded for the comparable one- and two-slot cells.

The first draft of the benchmark used a larger response contract and a tool
request shape LM Studio rejected. It is excluded from the comparison. Only the
corrected, exact-pass workload below is used.

## Results

| Metric | 1 slot | 2 slots | 4 slots |
|---|---:|---:|---:|
| Single long request | 14.105 s | 13.895 s | not accepted |
| Four-request batch wall time | 32.751 s | 36.924 s | invalid; unresolved requests |
| Batch output throughput | 36.98 output tok/s | 32.80 output tok/s | invalid cell |
| Exact long responses | 4/4 | 4/4 | invalid cell |
| Four-tool batch wall time | 8.123 s | 10.161 s | not measured validly |
| Exact tool calls | 4/4 | 4/4 | not measured validly |
| Minimum Windows available memory | 3,492 MiB | 2,738 MiB | severe pressure observed |
| Maximum committed memory | 98.986% | 99.335% | bounded run became unresponsive |
| Maximum dedicated GPU memory | 28.160 GiB | 28.202 GiB | context allocated; readiness unproved |

For the completed one- and two-slot cells, the two-slot sample was about 13%
slower on the four-request batch, about 11% lower in batch output throughput,
and about 25% slower on the tool-call batch. Those are directionally negative,
but one run per cell is not enough to call the modest differences universal.

Here, "batch output throughput" means total completion tokens divided by batch
wall-clock time. It includes prompt processing, queueing, and scheduler delay;
it is not a pure llama.cpp decode-speed measurement.

## Four-slot validity correction

The original report overstated the four-slot cell. LM Studio's engine log proves
that four 32K contexts were allocated, but it does not prove that the server was
ready for a valid benchmark:

1. The `lms load` command was interrupted at approximately 98% after `lms ps`
   prematurely showed the model as idle.
2. Later recovery work independently established that `lms ps` can report idle
   before the backend health handshake is complete. The safe rule is to wait for
   the load command itself to finish successfully.
3. The four-request batch remained unresolved when the separate two-token probe
   was sent, so that probe was not an uncontended single-request measurement.
4. Page faults, pagefile I/O, process working sets, and disk latency were not
   recorded. Memory pressure is plausible, but paging was not proved as the
   cause.

The four-slot cell therefore records an unsuccessful operational attempt, not a
comparative performance result. It is excluded from the slot decision.

## Runtime proof

LM Studio's 2026-08-30 engine log records the tested slot counts at 32K:

- line 15224: `n_slots = 1, n_ctx_slot = 32768`
- line 15933: `n_slots = 2, n_ctx_slot = 32768`
- line 17311: `n_slots = 4, n_ctx_slot = 32768`
- line 19553: restored brain, `n_slots = 1, n_ctx_slot = 32768`

Source log:
`C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-30.1.log`

These lines prove context allocation only. For the four-slot cell, they do not
supersede the incomplete authoritative load described above.

## Restored state

After the experiment, the load command was allowed to reach its authoritative
100% completion rather than relying on the prematurely optimistic `lms ps`
state. Final checks:

- `halo-brain-35b`: Q4_K_M, 32K, `parallel=1`, short API smoke in 1.79 s
- `halo-coder-q4km`: Q4_K_M, 32K, `parallel=1`, short API smoke in 1.30 s
- DSH: HTTP 200 on `127.0.0.1:3080`

## Dashboard interpretation

Mission Control's **models generating now** number is an instantaneous sampled
count of active inference, not a count of resident models or model loads. At
about 11:06, LM Studio was in a cold-load/between-request interval, so `0` was
consistent with the test. The displayed `90.2 decode t/s` was explicitly the
last completed run, not a claim that a model was generating at that instant.
One-minute sampling can also miss short bursts between samples.

## Memory-split implication

The current daily pair uses roughly 49 GiB of dedicated GPU memory, while this
test repeatedly left only about 3–5 GiB of Windows memory free and pushed
commit close to 100%. Since GPT-OSS 120B remains load-blocked, the current
96/32 split is no longer automatically the best daily operating point.

Do not change the split as part of this result. Make it a separate reversible
decision: prefer an 80/48 option if the driver exposes one; otherwise compare
64/64 against 96/32 for the actual dual-resident Halo pair. The goal is enough
GPU allocation for both daily models while returning staging, reload, and
application headroom to Windows.

## Decision

- Daily configuration remains `parallel=1` for both models.
- DSH continues to serialize planner and worker generation.
- `parallel=2` did not earn promotion in this one-run sample.
- `parallel=4` is unmeasured because its cell was invalid.
- Revisit only for a genuinely concurrent multi-user/multi-agent workload. A
  proper retest must use authoritative completed loads, repeated and alternated
  trials, more Windows headroom, page-pressure telemetry, fixed-total-context
  and fixed-per-slot-context cells, and an end-to-end DSH comparison measured by
  time to two independently verified green units.
