# Halo DSH: consolidated archive report

> Historical retrospective dated October 1, published October 19. Measurements below belong to the cited earlier jobs, not new tests or current-default recommendations. Local evidence links point to retained private records and are not downloadable from GitHub.

Prepared October 1, 2026, from Scott's existing local records. This review ran no new inference benchmark, coding test, audit probe, model load, restart or configuration change. Today's earlier deployment is described separately from the historical evidence.

## Findings that should have been used before today's pilot

The archive already establishes a practical answer: **27B Q6 can complete substantive DSH coding work; its best measured queue result was Medium with a 24,576-token output allowance, 9/9 held-out checks in 19m33s.** High at the same allowance was slower and missed a check. Off worked but missed restore behavior. Thinking with an 8K allowance repeatedly exhausted the response budget before editing. This is not a model that needed another connectivity/effort qualification from scratch. [S18–S19]

For speed, the 35B/30B MoE models have substantial measured advantages in prefill and decode, but they do not automatically finish every coding task sooner. The archived smaller coding tasks already measured their capability. The newly downloaded 35B UD-Q6 has not demonstrated a coding-quality advantage over the existing 35B Q4, so today's deployment must not be described as a proven upgrade. [S01, S03, S11, S13–S15, S28]

**The largest established harness saving is the existing smaller tool catalog.** The Web lean preset reduced 91 schemas to 13, estimated tool tokens from 25,122 to 3,290, and passed the same small repair task in 48.449s rather than 149.366s. One fixture cannot establish a universal speedup, but this is stronger local evidence than adding another model comparison. Today's new Web fast-first preset still sends the full 91-tool catalog; that repeats an already documented overhead. [S22, S29]

Compaction has worked in this archive, and it has also failed and churned. It is wrong to summarize the history as either “never fired” or “works reliably.” Read the whole multi-frame log, identify the exact model/window/preset at the time, and distinguish tool-result pruning from actual summaries. [S06, S09–S10, S26]

There is enough existing evidence for a complete retrospective and an operational recommendation. It is not enough for a statistical claim that one model always wins. No new broad bake-off is needed to make that distinction.

## 1. Archive coverage and evidence rules

The indexed roots are the current repository; Desktop Halo Stack Research; Desktop Halo Old Archive (including its historical working tree and live-deployment/session-artifact records); Tools/model-trial; halo-bench-day3; the September 26 Qwen27 bake-off; September 27 Q4 tuning; Desktop evaluation; and the durable-queue endurance project. Git history was inspected for earlier benchmark/result paths and configuration chronology.

The inventory contains **3,092 eligible text/data files**, with **1,556 distinct content hashes** and **469 duplicate-content groups**. These counts describe indexed files, not independent experiments. The current repo, reading folder, recovery copies and archive frequently contain the same report. Dependencies, Git object stores, upstream source trees, credential/cookie files and generic session directories were excluded from this text inventory. Three specifically relevant compressed sessions were separately decompressed across all frames. The primary-source manifest records the documents and raw result families used for the report. Inventorying 3,092 files is not a claim that every file's prose was individually read.

Numbers below retain their original measurement type: engine decoder counters, streamed estimates, whole-agent task time and cumulative request usage are different quantities. Models listed in a downloaded catalog are not counted as tested models. The 41-model/549GB catalog recorded in August proves inventory, not 41 successful coding benchmarks. Scores from different suites are not combined into a fabricated universal accuracy percentage. [S08]

Evidence strength, in order: saved raw grades/request records; exact session events; measured report tables with limitations; historical operational notes; agent self-reports. A later source or worklog supersedes an older configuration description, but an unverified later claim does not erase an independently reproduced earlier failure.

## 2. Chronology: what was already learned

| Date | Existing work | Practical result |
|---|---|---|
| Aug 17 | Dense Q5 vs 30B coder; Standard vs Code mode | Both passed the small repo repair; coder 41s versus dense 176s. Code mode took 65s. |
| Aug 17 | Manual compaction, retained-memory recall, restart/reboot | Real summary and post-compaction codename recall succeeded; reboot persistence documented. |
| Aug 17–19 | Bare llama-server, MTP, KV precision, mmap, MoE candidates | Tuned LM Studio matched bare server; MTP helped the dense model; quantized KV did not yield the CUDA-like speed gain on that Vulkan build. |
| Aug 19 | 131K dense Q5 capacity/depth | Full window loaded solo; decode 9.02 t/s near 110K, cached follow-up 29.7s; second-copy load had extra memory cost. |
| Aug 23 | Replicated Vulkan vs ROCm | ROCm prefill faster; Vulkan better decode/headroom on the tested runtime. |
| Aug 24 | Context sweep and large TownReporter tasks | All usable 16K–128K canary windows passed; monolithic thinking often emitted no tools. Forced action cadence achieved a 15/15 app build once. |
| Aug 29–30 | 96GB and 64GB VGM operational validation | 35B/30B pair worked; GPT-OSS120B load experiments failed. 64/64 post-reboot canary passed. |
| Sep 15 | Batch, KV, threads, sampling, cache reuse | Model-specific tuning measured; fresh real DSH repair passed for both tuned local models. |
| Sep 15 | Lean Web preset | 91→13 tools; same repair passed with much less prompt overhead. |
| Sep 16 | Cross-model suite; paired brain reasoning tests | Fast cloud/local MoE results documented; brain High fixed this exact counting failure in 6/6 vs Off 2/6. |
| Sep 25 | Long PPR compaction and dashboard monitoring | Summaries happened, but repeated empty/nonshrinking summaries and misleading liveness warnings were real. |
| Sep 26 | Seven Qwen27 quant/effort/cap arms | Medium/24K Q6 achieved 9/9; Off and High each missed restore behavior; 8K thinking arms did not implement. |
| Sep 27 | Smaller Desktop catalog; Q4 MTP comparison; endurance/audit | 92→27 tools; p0.2 did not outperform p0.5 locally; durable-queue audit found correctness failures despite green tests. |
| Oct 1 | Interrupted new pilot and deployment | Baseline 0/2 within a fixed 20-minute workflow; candidate coding trials not run. Engine qualification is not coding proof. |

## 3. The Desktop Q4/Q6 bake-off: all seven saved arms

The benchmark used Desktop DSH 0.1.7-rc.2 composition through isolated benchmark hosts/profiles, with file editing and shell tools. These are real agent-workflow results, not seven one-shot chat completions. They also do not prove every run was driven through the visible native window. Same original queue fixture, external nine-case grader, 131,072 context, one lane and only one resident local model per arm. Each condition has one unseeded run. The recorded per-call cap and actual wire effort matter more than the UI label. [S18–S19]

| Model | Wire effort | Output cap per call | Held-out checks | Agent-turn seconds | Outcome |
|---|---|---|---|---|---|
| Q4_K_M | none | 8,192 | 6/9 | 730.4 | completed |
| Q4_K_M | xhigh | 8,192 | 0/9 | 891.6 | max-tokens |
| Q6_K | none | 8,192 | 8/9 | 1730.9 | completed |
| Q6_K | xhigh | 8,192 | 0/9 | 976.4 | max-tokens |
| Q6_K | medium | 8,192 | 0/9 | 964.5 | max-tokens |
| Q6_K | medium | 24,576 | 9/9 | 1173.3 | completed |
| Q6_K | high | 24,576 | 8/9 | 2232.6 | completed |

Q4 Off (12m10s) failed two queue-draining cases and snapshot configuration retention. Q6 Off (28m51s) repaired draining but still lost restored concurrency. The Medium/24K arm (19m33s) passed all nine checks and its 11 visible tests. High/24K (37m13s) also passed its visible tests but still missed restored concurrency. Visible green output was not full correctness. [S18–S19]

Both xhigh/8K arms and Medium/8K consumed 8,192 tokens in a reasoning-only response before any implementation edit, leaving the initial source hash unchanged. Increasing the context window or having unused GPU RAM does not enlarge the per-response output allowance. The 24K High run actually used 15,966 tokens in one response, demonstrating why the former 8K cap would block that path. Conversely, the successful Medium/24K run's largest response was only 5,736 tokens: its success does not prove exceeding 8K was the cause. The cap changed and the unseeded agent path changed. [S18–S19]

The historical UI `high` selection for the original xhigh arms mapped to literal wire `xhigh`; the later High/24K profile sent literal `high`. The raw proxy records disambiguate this. A backend accepting multiple names does not establish distinct calibrated thinking budgets.

**Recommendation from this dataset:** for a difficult, bounded, single-model local coding assignment, Q6 + Medium + 24,576 is the strongest demonstrated configuration in this exact family. Q4/Off is the demonstrated faster compromise. Neither is a universal winner or a durability guarantee. Do not silently replace Scott's subsequently chosen Desktop Off default merely because one historical Medium task passed.

## 4. Cross-model and tuned-alias evidence

Claude's model-trial suite contained a log-counting task, a code-generation task with 15 checks, and a three-fact lookup. The following tables are archived observations, not retests on today's runtime. Scores aggregate different task checks and are not coding-only percentages. [S13–S14]

| model | engine | size | load s | T1 log | T2 code | T3 find | score | total s | first word s | tok/s |
|---|---|---|---|---|---|---|---|---|---|---|
| deepseek-v4.1-flash:cloud | ollama | - GB | - | 3/3 (4.42s) | 15/15 (10.05s) | 3/3 (1.87s) | 100% | 16.3 | 1.3 | 176.1 |
| qwen3-coder-30b-a3b-instruct@q4_k_m | lmstudio | 18.6 GB | 10.6 | 1/3 (28.26s) | 14/15 (44.5s) | 3/3 (15.25s) | 86% | 88.0 | 26.7 | 65.7 |
| qwen3-coder-30b-a3b-instruct@q6_k | lmstudio | 25.1 GB | 17.5 | 1/3 (30.65s) | 11/15 (44.12s) | 3/3 (16.31s) | 71% | 91.1 | 27.9 | 52.9 |
| unsloth/qwen3-coder-30b-a3b-instruct | lmstudio | 17.5 GB | 12.7 | 1/3 (28.47s) | 15/15 (40.75s) | 3/3 (14.48s) | 90% | 83.7 | 26.2 | 65.2 |
| qwen/qwen3.6-35b-a3b | lmstudio | 22.1 GB | 18.5 | 3/3 (55.54s) | 15/15 (123.14s) | 3/3 (34.46s) | 100% | 213.1 | 16.9 | 65.1 |
| qwen3.6-35b-a3b-mtp | lmstudio | 18.9 GB | 21.4 | 3/3 (46.49s) | 15/15 (78.86s) | 3/3 (27.28s) | 100% | 152.6 | 18.3 | 84.2 |
| qwen3-vl-30b-a3b-instruct | lmstudio | 19.6 GB | 19.0 | 1/3 (29.61s) | 15/15 (42.38s) | 3/3 (15.79s) | 90% | 87.8 | 26.2 | 64.0 |
| nvidia-nemotron-3.5-lightning-30b-a3b | lmstudio | 24.5 GB | 17.3 | 3/3 (74.51s) | 0/15 (198.24s) | 3/3 (25.82s) | 29% | 298.6 | 12.3 | 49.3 |
| qwen3.8-27b | lmstudio | 21.1 GB | 20.1 | 3/3 (150.2s) | 15/15 (172.62s) | 3/3 (79.73s) | 100% | 402.6 | 64.9 | 16.6 |
| qwen3.8-27b-uncensored | lmstudio | 23.0 GB | 19.8 | 3/3 (197.54s) | 15/15 (625.39s) | 3/3 (110.2s) | 100% | 933.1 | 65.2 | 6.8 |

| model | engine | size | load s | T1 log | T2 code | T3 find | score | total s | first word s | tok/s |
|---|---|---|---|---|---|---|---|---|---|---|
| halo/qwen3.6-35b-a3b | lmstudio | 22.1 GB | 14.1 | 2/3 (19.48s) | 15/15 (29.88s) | 3/3 (15.3s) | 95% | 64.7 | 14.5 | 65.6 |
| halo/qwen3-coder-30b-a3b-q4km | lmstudio | 18.6 GB | 10.4 | 1/3 (21.97s) | 14/15 (26.29s) | 3/3 (11.31s) | 86% | 59.6 | 17.6 | 67.3 |

The standard 35B Q4 and its MTP-packaged variant both passed all 21 checks, with the MTP variant finishing this suite in 152.6s vs 213.1s. These were different files/configurations, not an isolated switch on today's 35B UD-Q6. The tuned 35B alias completed in 64.7s but missed one log answer; do not conflate its fast thinking-Off policy with the untuned model's reasoning behavior. The 30B Q6 coder scored worse than Q4 on this suite, so higher weight precision was already known not to guarantee better agent results. Nemotron's reasoning exhaustion and the uncensored dense model's very long completion are recorded failures/costs, not grounds to erase their runs. DeepSeek is cloud-backed through Ollama, not evidence of local GPU speed. [S13–S17]

Earlier August direct/harness work also tested Gemma4 26B-A4B, the dense Q5, 35B MoE, 30B coder and load-blocked GPT-OSS120B/Nemotron configurations. Gemma and 35B each passed a small 4/4 repair in ~43s, while dense Q5 completed that particular API-loop task in 25.6s despite slower raw decoding. The 35B decoded 61.74 t/s at ~19.5K and 56.42 at ~30K; Gemma 40.73/31.47. More verbose answers consumed their raw speed advantage. On a different stock DSH task, the 30B coder completed in 41s vs dense Q5 176s. Both observations stand; they are different tasks and harnesses. [S01–S03]

GPT-OSS120B could not load cleanly in the 64GB split, and later 96GB carveout tests also failed because host/system memory or Vulkan allocation became the limit. It is not an available working model merely because a weight file once existed. August Nemotron failed architecture loading; September's updated runtime loaded a Nemotron but its suite result was poor. Runtime evolution matters. [S02–S03, S13, S25]

## 5. Reasoning: why both Off and High findings are real

The clean September 16 same-instance 35B Q4 comparison alternated paired seeds 42–47, explicit sampling and identical hashed fixture/prompt. Off was fully correct 2/6, High 6/6. Median completed responses were 1.6405s vs 33.8005s; Off had zero reasoning, High 1,488–2,255 reasoning tokens. Claude's independent six-repeat run agreed. Matching hashes establish identical inputs; equal token counts alone would not. These were warm repeated direct LM Studio requests, not cold DSH conversations. [S15–S17]

Earlier September coding tests found 35B Off 3/3 on three smaller tasks while two High trials exhausted a 4K allowance before emitting code. That does not contradict the counting result: the tasks and response caps differ. Likewise, the 27B Medium/24K success does not imply Medium cannot choke on a much larger endurance prompt. [S11, S19]

Operational policy should respect these differences: High is justified for careful 35B reading/audit work where silent errors matter; exact counts should come from scripts; Off is a deliberate speed path with independent checks; output caps must leave room for the requested thinking and action. Never label Low as Off. Explicit `none` was verified to disable thinking in the relevant LM Studio requests; omitting effort can preserve a model's thinking default. [S15, S20]

## 6. Already measured tuning and inference behavior

### Batch, cache precision and threads

The September 15 Windows Vulkan 2.38.0 investigation tested actual backend settings. Coder logical/microbatch 2048/2048 gave ~1,147 prompt t/s vs 2048/1024 ~1,078. Increasing logical batch to 4096 added little. For 35B, microbatch 1024 gave ~730 prompt t/s versus ~662 at microbatch 2048; bigger was slower. Threads 8/12/16 gave small differences and 12 was retained. Initial prediction-level thread overrides were invalid comparisons and were rerun with verified load arguments. [S11–S12]

On ~43.8K coder input, Q8 KV reduced elapsed time from 275.5s to 107.5s, but both outputs were wrong. On ~46.5K 35B input, F16/Q8 timings were 62.2/62.9s and neither answer fully correct. Paired coder event tasks passed 1/3 with F16 at either microbatch and 2/3 with Q8 at 2048. This supports Q8's processing benefit for the coder, not a claim that KV quantization raises intelligence. The 35B retained F16. Two fresh real DSH event-repair sessions then passed all eight cases independently with tests unchanged. [S11]

The new October candidate's batch 512 and 64K context are a different bundle, not established improvements over these archived model-specific values. Its larger weight precision has not been isolated from those changes. Do not call it “best tuned” solely because it loads.

### Cache reuse

Real September DSH tool follow-ups processed only 120/108/53/46 new tokens for the coder after an initial ~21K prompt, and 210/55/42 for High 35B after ~19.5K. Reasoning/tool history did not force wholesale prefix recomputation in those sessions. Switching to an unrelated prompt after a large request could still cost ~50s. [S11]

The August bare-server comparison already found tuned LM Studio close to llama-server: cold ~19.5K 108.6s vs 110.0s; cached turn 13.4s vs 15.6s; prose decode 19.7 vs 20.2 t/s. Rebuilding the serving layer was not justified by that measurement. [S02]

### Dense-model MTP and KV

On August's Q5/Linux-independent Windows Vulkan 2.28.2 tests, MTP depth4 increased structured short decode from 9.79 to 15.82 t/s; at ~30K the structured rows were 6.91→19.88. Probe repetition and warmed prefixes can inflate acceptance; these are not guaranteed organic-code speeds. At genuine cold ~30K with MTP off, F16/Q8/Q4 KV decoded 5.81/5.74/5.66 t/s: the NVIDIA-like KV speed gain did not appear on this backend. mmap Off's paired sample loaded in 9.5s vs 14.6 and decoded 20.71 vs 17.23; n=1. [S03]

September 27's Q4 paired seeds42–44 compared continuation probability0.5 and0.2. Median request17.286s vs16.999s; streamed rates29.52 vs29.37. All three paired texts matched and all six failed strict interval requirements. **Retain0.5 for that Q4 recipe** was the recorded decision; no meaningful local benefit supported moving it to0.2. The new 27B Q6 alias using0.2 is a separate recipe, not proof that Q4's comparison was wrong. [S20–S21]

### Vulkan versus ROCm

August runtime2.29.1 repeated measurements: ~1.5K TTFT Vulkan22.600s vsROCm7.715; ~5.7K44.392 vs21.218 (n=4). Decode at ~5.7K was15.35 vs12.23 t/s. Matched GPU allocation at the32KB text rung was29.35 vs46.60GiB; larger ROCm conditions grew much more. Vulkan retained the daily default because decoder/headroom tradeoffs mattered. These are historical runtime-specific results; they are not current ROCm release claims and do not authorize a runtime/driver switch today. KB text rungs are not thousands of tokens. [S07–S08]

## 7. Long context, compaction and the endurance record

The August small-app sweep passed7/7 at every usable16K–128K context. Raw recorded session times range244.6–735.1s; the128K cell passed in582.9s. The8K cell produced no app. Larger configured context did not, by itself, cause the seven-hour spiral: the same128K capacity completed the small task. The large TownReporter task often spent its output budget reasoning without tools. Forced ≤40-line action/test cadence once produced47 tool calls and a15/15 full app build in49.7minutes. Its final self-report still died at the window. The appendix supersedes the earlier interim claim that no prompt-level cadence could work. [S09–S10]

That battery identified the phantom-window error: missing provider `contextWindow` caused the harness to assume262,144, so80% compaction targeted~209.7K while the model really had32K or131K. Declared and loaded context must match. The report originally described this source diagnosis before runtime verification; that limitation should not be erased. Later real logs provide independent compaction evidence. [S10]

Manual compaction/continuity had already succeeded in August: ~15,017 history tokens shadowed, then codename recall without tools, with cold157s→cached13s→post-compaction80s behavior. Compaction changes a prefix and can require re-prefill. [S06]

The three full-frame trajectories inspected for this report show:

| Session | Log events | Prunes | Compaction starts | Summary events | Ends | Interpretation |
|---|---:|---:|---:|---:|---:|---|
| Desktop Q4 durable queue | 1826 | 3 | 4 | 4 | 4 | 0 ends with errors |
| Earlier Desktop Q6 endurance | 435 | 5 | 5 | 3 | 5 | 2 ends with errors |
| Web PPR, multi-turn/model | 5058 | 15 | 135 | 70 | 135 | 65 ends with errors |

The complete PPR log supersedes the early20-cycle snapshot. Its65 errored ends comprise34 empty-summary errors,28 nonshrinking-summary errors and3 explicit input-too-large errors. Successful summary routes include the local35B and later Grok; the whole-session counts must not be attributed to one unchanged local configuration. A summary event proves a produced summary, not retained-task correctness. The DesktopQ4 session's four cycles have no recorded end error; that establishes occurrence, not perfect retention. The earlierQ6 session's two errors are “Request was aborted” and “terminated,” not evidence that all five attempts intrinsically failed.

Current read-only configuration snapshot: Desktop local has70% threshold,8,192 headroom,25% retention; Web fast-first has80% threshold,55% retention and8,192 summary allowance. At131,072,70% is91,750 tokens; at65,536,80% is52,429. These are nominal thresholds; projected request pressure, tool pruning, available shadowable history and headroom handling influence when the plugin actually acts. “Retain25%” is not a guarantee the visible context meter will reset to exactly25%. Today's Web launch has not verified long-session behavior under its new64K bundle.

### Durable-queue correctness

The endurance model produced real code, tests and repeated repairs. The September27 independent Sixdesk-lite audit at the47-test revision still reproduced unawaited completion persistence, failed-start state corruption, replay counter reuse/rollback risk and concurrent duplicate-ID races: **DO NOT SHIP that revision as a durable queue**. Passing47 visible tests was not sufficient. The later worklog now claims52 tests and14 auditor probes passing with further rollback/reservation fixes. This report did not execute new probes; that later self-reported repair is not independently recertified here. The historical47-test verdict must not be asserted as the unchanged state of the later52-test code. [S27; audit history]

This history demonstrates a model that can implement and respond to concrete audits but does not reliably discover every persistence invariant alone. A superficial test-count increase cannot substitute for state-transition coverage. The small nine-check bake-off queue and the larger durable-journal endurance project are different artifacts and must not be combined into one score.

## 8. Tool overhead and orchestration: the already working pieces

The existing Web lean13-tool preset supplies files/search/PowerShell/LSP/skills/questions/background-job controls and stock compaction. It deliberately omits exposed browser/MCP/delegation tools; it is not a full pairing replacement. Its91→13 result is the best measured starting point for solo coding. A pairing-capable smaller catalog would need to retain the actual stock spawn/control/trace tools, rather than blindly copying a13-tool solo preset. No such new composition was deployed during this archive review. [S22]

Desktop's later reduction was92→27 schemas,94,981→19,888 compact schema characters, estimated tool tokens~23,750→4,976. Existing conversations retain earlier history. Native web_fetch succeeded; native web_search failed with WEB_PROVIDER_CREDENTIAL_MISSING. Wigolo optional CLI executed but returned thin/degraded generic links: capability execution and search quality are different findings. Removing its startup schemas does not mean it was uninstalled. [S23]

Stock spawn/fork, messaging, roster, workflows and jobs already exist. A pairing skill supplies rules for using them; it does not enforce a dispatcher, heartbeat or mandatory independent review by itself. The archive expressly warns that stock roster/team machinery is not an automatic experiment correctness gate. Separate resident models can receive separate requests, but they share GPU bandwidth; one slot per model does not mean the whole machine has only one slot. Apps under test that call the same occupied single-slot model can block their supervising agent; the old second-model drafting test reduced a414s blocking operation to7.5–8.4s. That use case differs from keeping two coder agents active simultaneously. [S10, S30]

The historical native Codex and Claude subagents worked with native authentication in the August deployment. Their integration existence does not mean every later preset exposed them, or that current OAuth remains authenticated. No accounts, tokens or live external requests were checked for this report. [S05]

## 9. Memory, paging and model identity

The64/64 post-reboot record established working35B/30B Q4 residency and a real gated worker canary. The96/32 record established host-memory limitations on a120B load. Shared GPU memory growth is a memory-envelope warning, not proof of disk paging; current pagefile occupancy is not current page-write traffic. Older archive wording sometimes equates “shared-pool spill” with failure according to that benchmark's acceptance bar; retain the bar as its historical methodology, not a universal Windows law. [S24–S25]

Today's stopped pilot sampled candidate dedicated GPU allocation up to60.81GiB and shared2.13GiB, without sampled page writes/output. It fit, but left far less dedicated margin than a solo model. No page-I/O absence between samples or process-specific attribution is proven. Maintaining both candidate models resident is a memory/performance choice, not a requirement for the parent to do every task.

The archived Q6 bake-off correctly reports weight-file bytes22,430,999,776, while runtime model inventory is~23.36GB because the reported object can include additional assets/metadata. Do not treat different fields as file corruption. DenseQ5, Q4_K_M, Q6_K and35B MoE are distinct model/quant identities; “Qwen27” or a reused alias name is not enough provenance.

## 10. Today's deployment versus what the archive supports

Current Web fast-first:35B UD-Q6 High main,27B Q6 Medium fallback,64K context each, one lane each,16K per-call output,512 batch, both resident. A fresh session returnedREADY with the correct main route/preset. That proves startup and one request. The baseline pilot's two20-minute failures do not negate earlier baseline successes on other tasks, and the first mapper's late recovery is unscored. Candidate coding trials were not run. [S28–S29]

**Three deployment choices are not established as superior by the archive:** the new35B Q6 over the measured35B Q4,512 batch over prior model-specific2048/1024 recipes, and16K fallback output over the27B's demonstrated Medium/24K task configuration. The full91-tool Web catalog is demonstrably costly. These are reasons to describe the deployment honestly, not reasons to restart another sweep.

The archive-supported operational recommendation is:

1. For strongest demonstrated bounded standalone local coding in this tested pair, use27B Q6 Medium with24,576 output allowance; use Off deliberately when speed or thinking exhaustion warrants it, keeping independent checks. Preserve Scott's current Desktop Off choice unless he asks to change it.
2. For fast primary work, prefer the existing measured35B Q4 recipe as the established MoE reference. High is supported for careful reading/audit; it is not a blanket proof of fast coding. The new35B Q6 is an unproven optional alternative, not an evidence-backed mandatory replacement.
3. Start ordinary solo coding with the already measured smaller catalog. Use the full catalog only for the actual browser/research/delegation task, or a deliberately scoped pairing preset. Do not make every new session preload every integration.
4. Break large implementations into bounded deliverables, require the first useful tool action, and verify the actual module rather than a rewritten formula or the model's prose. The archive already showed monolithic thinking stalls and one successful forced-cadence app build.
5. Keep declared/loaded context equal, explicit Off wire mapping and truthful effort names. Record pruning and summaries separately; compaction needs sufficient output headroom and useful history to summarize.
6. Use the existing acceptance fixtures and audit history. Do not run another dozens-of-models screen merely to rediscover connectivity, warm cache, or thinking-budget behavior.

These are recommendations only in this read-only archive review. No current model, preset, process or file outside the report/evidence deliverables was changed by this review.

## 11. What can be published from the records now

A complete retrospective can report Windows/Strix Halo constraints; measured engine tradeoffs; cross-model task observations; the seven Desktop quant/effort arms; prompt-budget failures; lean-tool savings; successful and failed compaction; long-task supervision and audit failures; and the practical settings that actually produced work. It should include failures, capped outputs, contamination/extraction repairs, historical runtime versions and the distinction between engine and agent speed.

It cannot legitimately claim a universal Q6 advantage, calibrated quality deltas at every quant level, zero paging under every workload, reliable automatic pairing/supervision, or successful coding/compaction in today's untested fast-first bundle. These are publication limits, not a demand to perform more tests now. Report existing results with their denominators and finish the article from this evidence.

### Corrections to my approach

I should have used this archive before creating today's pilot. The repeated27B qualification, broad timing preparation and rediscovery of tool overhead were avoidable. Today also changed several variables together, which would not isolate a35B quant advantage even if the candidate task runs had finished. I then deployed a configuration that had startup/engine proof but no new coding proof. Calling that distinction out is necessary; extending the testing spiral is not the remedy Scott asked for.

## 12. Source and evidence map

Links below are local originals; manifest hashes capture the reviewed snapshot. Recovery/reading-folder duplicates are not independent corroboration. Compressed-session event summaries and seven saved arm records are in the adjacent archive-review directory. No raw launcher tokens, credentials or complete private conversation dumps are intended for publication.

- **S01** — [phase2-bench-results.md](<C:/Users/scott/Desktop/Halo Old Archive/repo-working-tree/docs/phases/phase2-bench-results.md>)
- **S02** — [bench-day-2-results.md](<C:/Users/scott/Desktop/Halo Old Archive/repo-working-tree/docs/phases/bench-day-2-results.md>)
- **S03** — [bench-day-3-results.md](<C:/Users/scott/Desktop/Halo Old Archive/repo-working-tree/docs/phases/bench-day-3-results.md>)
- **S04** — [bench-window-131k.md](<C:/Users/scott/Desktop/Halo Old Archive/repo-working-tree/docs/phases/bench-window-131k.md>)
- **S05** — [phase3-reach-results.md](<C:/Users/scott/Desktop/Halo Old Archive/repo-working-tree/docs/phases/phase3-reach-results.md>)
- **S06** — [phase4-harden-results.md](<C:/Users/scott/Desktop/Halo Old Archive/repo-working-tree/docs/phases/phase4-harden-results.md>)
- **S07** — [DSH-Strix-Halo-Report-v2.7.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/DSH-Strix-Halo-Report-v2.7.md>)
- **S08** — [README.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/evidence/README.md>)
- **S09** — [HANDOFF.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/tuning/HANDOFF.md>)
- **S10** — [TC-FINAL-REPORT.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/tuning/tc/TC-FINAL-REPORT.md>)
- **S11** — [WINDOWS-TUNING-FIVE-INVESTIGATIONS-2026-09-15.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/docs/WINDOWS-TUNING-FIVE-INVESTIGATIONS-2026-09-15.md>)
- **S12** — [windows-tuning-five-2026-09-15.json](<C:/Users/scott/Desktop/Code/dsh-halo-research/docs/evidence/windows-tuning-five-2026-09-15.json>)
- **S13** — [summary.md](<C:/Users/scott/Tools/model-trial/run/summary.md>)
- **S14** — [summary.md](<C:/Users/scott/Tools/model-trial/run-halo/summary.md>)
- **S15** — [BRAIN-REASONING-COMPARISON-2026-09-16.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/docs/BRAIN-REASONING-COMPARISON-2026-09-16.md>)
- **S16** — [reasoning_effort_results.json](<C:/Users/scott/Tools/model-trial/reasoning_effort_results.json>)
- **S17** — [SETUP-local-models-for-another-agent-2026-09-16.md](<C:/Users/scott/Tools/model-trial/SETUP-local-models-for-another-agent-2026-09-16.md>)
- **S18** — [REPORT.md](<C:/Users/scott/Documents/Codex/2026-09-26/qwen27-bakeoff/REPORT.md>)
- **S19** — [MEDIUM-FOLLOWUP.md](<C:/Users/scott/Documents/Codex/2026-09-26/qwen27-bakeoff/MEDIUM-FOLLOWUP.md>)
- **S20** — [HALO-DSH-IMPLEMENTATION-2026-09-27-Q4-TUNING.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/docs/HALO-DSH-IMPLEMENTATION-2026-09-27-Q4-TUNING.md>)
- **S21** — [comparison.json](<C:/Users/scott/Desktop/Code/dsh-halo-research/stack/desktop-tuning/evidence/q4-final-tuning/comparison.json>)
- **S22** — [DSH-LEAN-CODING-2026-09-15.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/docs/DSH-LEAN-CODING-2026-09-15.md>)
- **S23** — [HALO-DSH-IMPLEMENTATION-2026-09-27-DESKTOP-SMALL-CATALOG.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/docs/HALO-DSH-IMPLEMENTATION-2026-09-27-DESKTOP-SMALL-CATALOG.md>)
- **S24** — [HALO-64GB-POST-REBOOT-VALIDATION-2026-08-30.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/stack/HALO-64GB-POST-REBOOT-VALIDATION-2026-08-30.md>)
- **S25** — [HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/stack/HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md>)
- **S26** — [DSH-MISSION-CONTROL-COMPACTION-HANDOFF-2026-09-25.md](<C:/Users/scott/Documents/Codex/2026-09-10/gi/work/DSH-MISSION-CONTROL-COMPACTION-HANDOFF-2026-09-25.md>)
- **S27** — [WORKLOG.md](<C:/Users/scott/Documents/Codex/2026-09-26/dsh-q6-endurance/WORKLOG.md>)
- **S28** — [pilot-summary.json](<C:/Users/scott/Documents/Codex/2026-10-01/dsh-windows-study/pilot-summary.json>)
- **S29** — [deployment-verification.json](<C:/Users/scott/Documents/Codex/2026-10-01/dsh-windows-study/deployment-verification.json>)
- **S30** — [DSH-STOCK-CAPABILITY-REUSE-REVIEW-2026-09-15.md](<C:/Users/scott/Desktop/Code/dsh-halo-research/docs/DSH-STOCK-CAPABILITY-REUSE-REVIEW-2026-09-15.md>)

Additional raw evidence:

- [inventory.json](<C:/Users/scott/Documents/Codex/2026-10-01/dsh-windows-study/archive-review/inventory.json>)
- [primary-source-manifest.json](<C:/Users/scott/Documents/Codex/2026-10-01/dsh-windows-study/archive-review/primary-source-manifest.json>)
- [desktop-bakeoff-records.json](<C:/Users/scott/Documents/Codex/2026-10-01/dsh-windows-study/archive-review/desktop-bakeoff-records.json>)
- [session-57ab7bb4-c92f-405b-96a2-52a53704cfd7.json](<C:/Users/scott/Documents/Codex/2026-10-01/dsh-windows-study/archive-review/session-57ab7bb4-c92f-405b-96a2-52a53704cfd7.json>)
- [session-6af389c3-af8c-4fb3-aefc-f73af07eebdd.json](<C:/Users/scott/Documents/Codex/2026-10-01/dsh-windows-study/archive-review/session-6af389c3-af8c-4fb3-aefc-f73af07eebdd.json>)
- [session-5062eea1-77c6-4285-8c9d-41d43c32ae11.json](<C:/Users/scott/Documents/Codex/2026-10-01/dsh-windows-study/archive-review/session-5062eea1-77c6-4285-8c9d-41d43c32ae11.json>)

Audit history source: the stored Sixdesk-lite report/turn at September27 18:21 Mountain, summarized in the local history registry. It is explicitly revision-specific; latest52-test worklog remains a self-report in this review.
