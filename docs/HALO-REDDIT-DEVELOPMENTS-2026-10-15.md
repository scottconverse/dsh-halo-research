# StrixHalo and DeepSeekHarness developments relevant to Scott's setup

Researched October 15, 2026 using reddit-search v0.1.2. Research only: no models, apps, runtime settings, BIOS settings or installed plugins were changed. No inference or benchmarks ran.

## Scope and evidence

Reviewed the existing Windows 128GB Halo context, installed pixmaate Gufo October3 release with27B Q6/Q4-DFlash choices, and the possible future Linux partition/dedicated Halo. This report describes developments not previously covered in this conversation or adds material qualifications; it cannot establish what Scott has independently read elsewhere.

Reddit RSS and the configured local Redlib at18080 were used. The bundled live Redlib check verified ownership, pinned commit and real subreddit content before research. Discovery covered100 latest StrixHalo RSS records,100 latest Redlib records and100 top-month records:146 unique candidates. DeepSeekHarness discovery covered100 latest RSS and62 top-month records:100 unique candidates. Selected18 Halo and19 DSH thread pages yielded368 comment nodes. OP bodies and selected replies were examined; this is not a claim that every candidate post or every comment was read. Overall coverage is PARTIAL:26 thread pages classified complete,6 partial and5 unknown. Counts exceeding reported Reddit totals are unknown rather than magically complete. Deleted replies and link-only posts limit interpretation.

Anonymous requests were sequential, at least8seconds apart. Early console-output encoding errors happened after three listings had already been successfully saved/parsed; those are not blocked Reddit responses. One Unicode path initially failed URL encoding, then succeeded after encoding was corrected. No rate-limit result was observed in this bounded collection. Primary project pages were checked for the higher-priority candidates. Public claims are not verification on Scott's machine.

## Part 1 — r/StrixHalo

### 1. Cache behavior is the most directly actionable lead for the current Windows setup

Two separate Windows Gufo reports describe opposite failure modes: excessive snapshot RAM growth on pixmaate's October3 build, and a tiny snapshot cache caused by incorrect free-memory detection in another Windows fork. The latter owner reports long-context continuation dropping from40+seconds to2–5seconds after a fork-specific source change. Replies identify live KV reuse, RAM snapshots and disk snapshots as distinct mechanisms. Neither the posted patch nor its claimed16GB budget should be blindly copied into Scott's different binary. The current canonical Start-Gufo.ps1 does not explicitly set a RAM snapshot cap; that is a documented configuration observation, not proof of a leak or an available flag. First practical follow-up would be checking actual cache skips/budget in existing logs, then using a supported cap if that exact build offers one.

[pixmaate/gufo + qwen3.8 27b cache takes so much memory](https://www.reddit.com/r/StrixHalo/comments/1wzxop3/pixmaategufo_qwen38_27b_cache_takes_so_much_memory/) (Oct 07 2026, 14:16:05 UTC); [Strix Halo 128GB on Windows: what fixed my local AI setup](https://www.reddit.com/r/StrixHalo/comments/1x0hnpb/strix_halo_128gb_on_windows_what_fixed_my_local/) (Oct 08 2026, 04:28:36 UTC)

### 2. Preserve-thinking mismatches can destroy cache reuse when thinking is enabled

One Hermes/Gufo user traced persistent live-cache misses to the client not echoing reasoning that the engine expected. Enabling Hermes reasoning_echo reportedly restored reuse; another reply showed much higher hits. This is a protocol-consistency lead, not a reason to switch Scott's thinking-off default on. If thinking is later enabled, the engine template and DSH serialization must agree about retained reasoning. Keeping all old reasoning also grows context. The recommended Hermes setting is not automatically a DSH setting.

[TIL: Check your preserve_thinking settings](https://www.reddit.com/r/StrixHalo/comments/1x0m35r/til_check_your_preserve_thinking_settings/) (Oct 08 2026, 09:03:40 UTC)

### 3. Bubo is a newly published native Windows candidate, with meaningful qualifications

Bubo builds on Gufo/pixmaate and targets128GB Halo laptops around70W. It adds a GUI/setup path, disk prompt caching, twin dense decode weights and optional NPU prefill. Its repository confirms a Windows release and describes supported27B models, but its special tuning primarily targets Flash-Next. It defaults to a modified/abliterated model; standard Unsloth use is separately documented. Early thread users report responsiveness and prolonged sessions, but also NPU fallback errors and hard freezes in crowded nested-WSL/container setups. Those causes remain anecdotes, not a proven universal diagnosis. Repository notes say ordinary cached operation is not bit-identical to fresh exact-mode operation. Worth tracking, not an automatic replacement for the working27B engine or a basis for changing carveout/pagefile values now.

[Happy Halowin Season! Bubo: Another opinionated Gufo fork tuned for Windows (especially laptops)](https://www.reddit.com/r/StrixHalo/comments/1x4x8j3/happy_halowin_season_bubo_another_opinionated/) (Oct 13 2026, 13:52:39 UTC)
Primary: https://github.com/haloforge-labs/bubo

### 4. Rulith and additional Windows Gufo GUIs now exist

The older Strix Llama Windows product is now Rulith Inference, with a desktop manager and conversation slots/checkpoints. Its author describes memory-commit warnings and Flash-Next support. A separate thomas9120 Gufo fork is oriented toward a GUI, launch/update scripts and sampler/model selection. These are possible usability improvements; no installed-model compatibility or quality advantage was verified here. Bubo/Rulith are principally interesting for a future Flash-Next trial, not evidence that Scott's current27B weights should be discarded.

[Another day another fork - Gufo for Windows with GUI.](https://www.reddit.com/r/StrixHalo/comments/1wv56sn/another_day_another_fork_gufo_for_windows_with_gui/) (Oct 01 2026, 17:11:35 UTC)
Primary: https://github.com/rulith-dev/rulith-inference

### 5. Linux llama.cpp optimization is still advancing alongside new engines

The asf0 rdna35-perf branch reports21–54% better prompt processing than Vulkan on three Q8 model fixtures, with greater long-context gains against stock ROCm. Decode approximately ties Vulkan on the27B fixture; that is not a general new decode-speed record. Posted top-token agreement is below100%, so the title's same-outputs phrasing must not be read as universal bit identity. A thread reply reports newer Vulkan+MTP beating Gufo+DFlash2 in its27B decode use, while Gufo still wins prefill. That counterexample is a reason to keep llama.cpp/Ollama/LM Studio routes available, not announce a universal engine winner.

[strix-llama new branch: prompt processing +21–54% over Vulkan and up to 2.7× over stock ROCm at 128k, same outputs](https://www.reddit.com/r/StrixHalo/comments/1x3s2t9/strixllama_new_branch_prompt_processing_2154_over/) (Oct 12 2026, 04:06:35 UTC)
Primary branch: https://github.com/asf0/strix-llama.cpp/tree/rdna35-perf

### 6. Slotpin addresses scheduling and liveness, not merely peak speed

Slotpin is an alpha proxy/dashboard: interactive/background lanes, request metrics and a fail-fast facility for engines that remain healthy-looking without progress. With llama-server it also pins conversations and saves/restores KV. In Gufo mode it deliberately leaves caching to Gufo. Its owner reports one cache-restore case improving88seconds to0.7seconds and a separate55-hour healthy-looking stall motivating fail-fast. Those are isolated owner cases. Primary docs say the full monitoring stack is Linux-oriented; the Python proxy is portable, and Windows memory/temperature fields may be absent. Multi-model routing is designed but not built. This is relevant to a second Linux server and the earlier Mission Control/liveness problems, without implying a ready cross-provider residency manager.

[slotpin: cache-maxing scheduler and dashboard for llama-server and Gufo](https://www.reddit.com/r/StrixHalo/comments/1x2ner9/slotpin_cachemaxing_scheduler_and_dashboard_for/) (Oct 10 2026, 19:11:41 UTC)
Primary: https://github.com/headbouyJB/slotpin

### 7. Lemonade is moving toward a common engine endpoint, but the example uses custom glue

A user registered Gufo/Hipfire via Lemonade's cloud-provider mechanism using a Python relay that supplies model discovery, startup and admission. Maintainers linked an OCI backend roadmap. This validates the direction, not turnkey stock Gufo/Hipfire lifecycle support. It might eventually simplify a Linux server with multiple engines; adding that relay today would introduce another component and duplicate some existing routing.

[Lemonade as single endpoint - Gofu, Hipfire, Halogen, etc.](https://www.reddit.com/r/StrixHalo/comments/1x59igm/lemonade_as_single_endpoint_gofu_hipfire_halogen/) (Oct 13 2026, 21:36:35 UTC)
Primary roadmap: https://github.com/lemonade-sdk/lemonade/discussions/3585

### 8. A second Halo helps isolation/concurrency more clearly than it guarantees faster single jobs

In a recent two-box discussion, some owners use the second box for embeddings, speech, image generation or another model rather than combining memory for one model. Others point to llama-halo-hybrid for larger distributed models. Neither path proves a simple2x speedup, transparent pooled VRAM or better answers merely from higher precision. For Scott, a dedicated Linux inference host would preserve the Windows workstation and avoid rebooting into Linux; model sharding is a separate hardware/network project.

[A second Strix Halo](https://www.reddit.com/r/StrixHalo/comments/1x4dk48/a_second_strix_halo/) (Oct 12 2026, 20:50:18 UTC)

### Lower-priority leads and things not to adopt from headlines

- FastFlowLM now advertises27B NPU execution. The thread's1–2tok/s claim links an official table, but that table identifies a Ryzen AI5 340 Kraken Point test machine, not Strix Halo. It cannot establish Halo generation speed. It is an efficiency/specialization lead with no verified performance advantage for Scott's journalism/coding work. [FastFlowLM can now run Qwen3.8 27B on Strix Halo's NPU!](https://www.reddit.com/r/StrixHalo/comments/1wuczmb/fastflowlm_can_now_run_qwen38_27b_on_strix_halos/) (Sep 30 2026, 18:37:45 UTC) Primary: https://fastflowlm.com/docs/benchmarks/qwen3.8_results/
- Linux kernel-performance discussion warns that the18–23% headline does not represent the same gain on Halo; commenters cite a much smaller Halo result. This review did not independently validate the exact kernel improvement. Do not disable IOMMU based on thread suggestions; another commenter reports Wi-Fi/Bluetooth breakage. [AMD Boosting AI/LLM Performance For Radeon iGPUs As Much As 18~23% With Linux 7.4](https://www.reddit.com/r/StrixHalo/comments/1wtl5wb/amd_boosting_aillm_performance_for_radeon_igpus/) (Sep 29 2026, 20:27:24 UTC)
- DCP Proxy performs cross-client pruning/compression, but it rewrites tool evidence and adds another model-summary path. It is not an appropriate blind addition above DSH's existing compactor, especially for source-faithful journalism. [DCP Proxy: A local AI gateway that prunes/compresses context for every client at once (OpenCode, anything OpenAI-compatible) (Windows)](https://www.reddit.com/r/StrixHalo/comments/1wxq0aa/dcp_proxy_a_local_ai_gateway_that/) (Oct 04 2026, 20:40:43 UTC)
- Flash-Next is repeatedly favored in the selected coding discussions, but positive reports coexist with tool-call regressions, gibberish/loading failures and quant/template differences. A three-backend owner comparison changes quantizations and speculation between arms, so it does not isolate engine quality. It suggests a possible capability step beyond27B, not a proven universal replacement. [I tested Qwen3.8-Flash-Next on my Bosgame M5 (128 GB). Here are the numbers across three backends](https://www.reddit.com/r/StrixHalo/comments/1wxf2c2/i_tested_qwen38flashnext_on_my_bosgame_m5_128_gb/) (Oct 04 2026, 12:57:00 UTC) [Qwen 3.8 flash next: does gufo make more errors than llama.cpp?](https://www.reddit.com/r/StrixHalo/comments/1wwz2io/qwen_38_flash_next_does_gufo_make_more_errors/) (Oct 03 2026, 21:53:54 UTC) [Qwen3.8-Flash-Next vs Qwen3.8-27B on 128 GB, is it worth giving up the second model?](https://www.reddit.com/r/StrixHalo/comments/1ww0mt6/qwen38flashnext_vs_qwen3827b_on_128_gb_is_it/) (Oct 02 2026, 18:02:23 UTC)

## Part 2 — r/DeepSeekHarness

### 1. Dynamic tool pruning targets a real bottleneck, but TokenSlash adds policy and providers

TokenSlash advertises tool-schema pruning/recovery, smaller tool results, file skeletons and batched reads. Its implementation also adds Jev triage and can route subagents to other models. This means installing it is not merely a passive performance flag. The README's headline85% savings are calculated with chars/4 from a narrow captured prompt fixture; they are not measured task-level savings or a verified reduction in Scott's requests. In the thread, the author initially used an unofficial desktop build, then posted a0.2rc2 compatibility update. Compatibility with Scott's repaired0.2.1 Web/0.2 Desktop combination remains unverified. The simpler useful principle is preserving a lean tool catalog; this project's own September archive already documents that benefit.

[TokenSlash: Cordis plugin for DSH that slashes 3K–8K prompt tokens per turn with dynamic tool pruning, Jev triage, and tokenslash_peek](https://www.reddit.com/r/DeepSeekHarness/comments/1wt5d27/tokenslash_cordis_plugin_for_dsh_that_slashes/) (Sep 29 2026, 09:17:22 UTC)
Primary: https://github.com/JessenReinhart/dsh-tokenslash

### 2. The circuit-breaker plugin is not a hard token-spending stop

dsh-circuit-breaker compares recent tool calls and caps calls. Crucially, its primary README says denial is not agent termination: a degenerate model can keep generating denied calls and using inference. Counters are process-local, and variants can escape duplicate matching until the call cap. It can limit executed tool damage and log incidents; it must not be sold as solving the entire overnight-token loop. Any true bounded-run capability needs an actual turn/process interruption mechanism authorized by the operator. This research did not add one.

[Agent loops are burning tokens, what are you using to stop them? (And has anyone tried dsh-circuit-breaker?)](https://www.reddit.com/r/DeepSeekHarness/comments/1wmp304/agent_loops_are_burning_tokens_what_are_you_using/) (Sep 21 2026, 20:52:19 UTC)
Primary: https://github.com/pricklywiggles/dsh-circuit-breaker

### 3. Activity view and session tabs are useful, smaller interface changes

dsh-activity-view adds a bell and Needs attention/Working/Today groupings. It improves awareness without replacing Mission Control's engine/system metrics. dsh-session-tabs adds a tab strip, with its author reporting daily use on Desktop0.2.0rc2. These are the most modest usability candidates found. Live rendering on Scott's builds was not tested, and no plugin was installed.

[made a small activity view plugin for deepseek harness (dsh) web ui](https://www.reddit.com/r/DeepSeekHarness/comments/1x4po2s/made_a_small_activity_view_plugin_for_deepseek/) (Oct 13 2026, 06:50:48 UTC) [i made dsh-session-tabs because i hate scrolling large session across many repo](https://www.reddit.com/r/DeepSeekHarness/comments/1x16gtu/i_made_dshsessiontabs_because_i_hate_scrolling/) (Oct 08 2026, 23:46:50 UTC)
Primary: https://github.com/vec715/dsh-activity-view and https://github.com/rifkyazizf/dsh-session-tabs

### 4. An MCP settings GUI may reduce configuration mistakes

cyberofficial/dsh-plugin-mcp-settings advertises add/edit/remove, live phase/retry, persistent enable/disable, stdio and HTTP plus an SSE bridge. That is relevant to maintaining Wigolo and Reddit/Redlib because it exposes real connection status and settings in the UI. It does not prove a server can retrieve content, solve OAuth automatically, or remove the need for secrets handling. The community post names a specific0.1.7 local build minimum; current-version compatibility must not be assumed.

[Updated my plugin panel for MCP Settings now supports SSE](https://www.reddit.com/r/DeepSeekHarness/comments/1x3wjfm/updated_my_plugin_panel_for_mcp_settings_now/) (Oct 12 2026, 08:36:33 UTC)
Primary: https://github.com/cyberofficial/dsh-plugin-mcp-settings

### 5. Feature Map may reduce repeated repository discovery

Feature Map proposes maintained per-feature documentation so an agent can locate relevant files without repeatedly reading/grepping a whole project. It is a coding-workflow candidate, not an inference accelerator. Its primary docs also describe a guard that refuses the first source lookup once until the map is consulted, and opt-in tools that scaffold documentation. Thus it adds a workflow rule, not merely an index. It requires current maps and does not replace inspecting actual source. The retrieved Reddit thread is link-only with no replies; the linked primary repo supplies the product description. Not a community-validated quality gain.

[I've created Feature Map plugin so your agents will have an idea what files to look for and what they are doing](https://www.reddit.com/r/DeepSeekHarness/comments/1x1ospy/ive_created_feature_map_plugin_so_your_agents/) (Oct 09 2026, 15:46:07 UTC)
Primary: https://github.com/megablue/dsh-feature-map

### 6. Context and update reports remain contradictory

One0.2rc2 user reports a three-hour27B session holding up; another reports compaction waiting until overflow, and an October15 user reports worse instruction-following and a successful personal rollback to0.1.7. These are distinct anecdotes, not proof all0.2 builds are defective or stable. The output-limit/Jinja discussion concerns a32K4080 setup and cannot establish the cause of Scott's former70-token reduction. A global-prompt plugin also failed installation for its questioner. Do not change versions, add a second compactor or install a global prompt from these reports alone.

[DSH 0.2.0-rc.2 - Context management great improvement](https://www.reddit.com/r/DeepSeekHarness/comments/1wvsam7/dsh_020rc2_context_management_great_improvement/) (Oct 02 2026, 12:17:41 UTC) [Compactação de contexto do DSH-compact-basic](https://www.reddit.com/r/DeepSeekHarness/comments/1x01le7/compactação_de_contexto_do_dshcompactbasic/) (Oct 07 2026, 16:47:33 UTC) [Anyone else having issues with the new DSH update (0.2.0-rc.2)?](https://www.reddit.com/r/DeepSeekHarness/comments/1x6epq8/anyone_else_having_issues_with_the_new_dsh_update/) (Oct 15 2026, 06:54:27 UTC) [Output token limit reached, Jinja Exception: No user query found in messages](https://www.reddit.com/r/DeepSeekHarness/comments/1wyxump/output_token_limit_reached_jinja_exception_no/) (Oct 06 2026, 09:07:58 UTC) [Is there a good plugin to set personalization prompt (similar to Claude/Codex)](https://www.reddit.com/r/DeepSeekHarness/comments/1x5haqv/is_there_a_good_plugin_to_set_personalization/) (Oct 14 2026, 03:49:23 UTC)

### Other candidates, without a reason to install them now

- Remote-access plugin ds-harness-remote offers relay/P2P access; respondents point out ordinary VPN/SSH alternatives. This is relevant if DSH itself moves to another box; a remote model server alone does not require it. [ds-harness-remote plugin: The most comprehensive remote access solution, as recommended by the community.](https://www.reddit.com/r/DeepSeekHarness/comments/1x1i9bp/dsharnessremote_plugin_the_most_comprehensive/) (Oct 09 2026, 10:53:42 UTC)
- A Zed provider plugin exposes another account route. Scott already has frontier subscriptions and local providers; the thread does not establish a missing capability worth adding. [Zed AI models provider for DSH](https://www.reddit.com/r/DeepSeekHarness/comments/1x4y4fr/zed_ai_models_provider_for_dsh/) (Oct 13 2026, 14:27:35 UTC)
- A web-search gateway plugin moves billing to another provider. It does not replace the existing Wigolo/Reddit/Redlib workflow or make search free. [The built-in web_search spent my whole DeepSeek budget — so I moved it to my own gateway](https://www.reddit.com/r/DeepSeekHarness/comments/1wp6uwq/the_builtin_web_search_spent_my_whole_deepseek/) (Sep 24 2026, 16:48:04 UTC)
- A3090 user reports reduced overthinking with a fixed Qwen template and low effort, explicitly without a timed comparison. This is further evidence to keep template, mode and effort separate; it is not a recommendation to change Scott's currently off default or download another fine-tune. [Less per-turn overthinking in DSH Qwen3.8 Q3 on a 3090](https://www.reddit.com/r/DeepSeekHarness/comments/1ws3q4x/less_perturn_overthinking_in_dsh_qwen38_q3_on_a/) (Sep 28 2026, 03:23:08 UTC)

## Priorities for this setup

1. Existing-log review of cache reuse and RAM-snapshot behavior on the exact installed Gufo build; reasoning/template consistency only when thinking is enabled.
2. Keep a lean DSH tool inventory and usable status/usage display; prefer small interface improvements over layering multiple context-rewriting plugins.
3. For future Linux work, retain Hipfire and the specialized Gufo/NPU fork shortlist, and add rdna35-perf and slotpin as distinct engine/scheduling candidates.
4. Treat Bubo/Rulith as Windows Flash-Next candidates with quantization, memory and reliability qualifications. Keep existing model/default choices intact until a separate approved trial.

These are research recommendations, not authorization or a deployment plan. No benchmark run, installation or automatic guard was created. The strongest new lead is cache/protocol behavior; the strongest cautions are that faster does not prove more accurate, tool denial does not stop inference, and estimated prompt reduction does not prove end-to-end savings.

## Selected thread coverage

Dates below are as reported by the source (UTC). Complete means the adapter's comment-count checks passed; it is not an independent guarantee Reddit exposed every historical reply. `coverage.json` records all candidate titles/URLs and selected-page metadata. Raw RSS, HTML and full normalized comments remain local under `C:\Users\scott\Documents\Codex\2026-10-15\reddit-developments`.

| Community | Thread | Date | Reported/retrieved comments | Coverage |
| --- | --- | --- | --- | --- |
| DeepSeekHarness | [Agent loops are burning tokens, what are you using to stop them? (And has anyone tried dsh-circuit-breaker?) ](https://www.reddit.com/r/DeepSeekHarness/comments/1wmp304/agent_loops_are_burning_tokens_what_are_you_using/) | Sep 21 2026, 20:52:19 UTC | 6/5 | partial |
| DeepSeekHarness | [The built-in web_search spent my whole DeepSeek budget — so I moved it to my own gateway ](https://www.reddit.com/r/DeepSeekHarness/comments/1wp6uwq/the_builtin_web_search_spent_my_whole_deepseek/) | Sep 24 2026, 16:48:04 UTC | 2/2 | complete |
| DeepSeekHarness | [What I learned letting a local 27B run overnight long-horizon coding on my own rig ](https://www.reddit.com/r/DeepSeekHarness/comments/1wq4x58/what_i_learned_letting_a_local_27b_run_overnight/) | Sep 25 2026, 19:06:00 UTC | 0/0 | complete |
| DeepSeekHarness | [Less per-turn overthinking in DSH Qwen3.8 Q3 on a 3090 ](https://www.reddit.com/r/DeepSeekHarness/comments/1ws3q4x/less_perturn_overthinking_in_dsh_qwen38_q3_on_a/) | Sep 28 2026, 03:23:08 UTC | 0/0 | complete |
| DeepSeekHarness | [Hey guys tell me your favorite plugins ](https://www.reddit.com/r/DeepSeekHarness/comments/1wsanil/hey_guys_tell_me_your_favorite_plugins/) | Sep 28 2026, 10:09:40 UTC | 18/18 | complete |
| DeepSeekHarness | [any plugin to take notes? ](https://www.reddit.com/r/DeepSeekHarness/comments/1wsj297/any_plugin_to_take_notes/) | Sep 28 2026, 16:18:28 UTC | 4/4 | complete |
| DeepSeekHarness | [TokenSlash: Cordis plugin for DSH that slashes 3K–8K prompt tokens per turn with dynamic tool pruning, Jev triage, and tokenslash_peek ](https://www.reddit.com/r/DeepSeekHarness/comments/1wt5d27/tokenslash_cordis_plugin_for_dsh_that_slashes/) | Sep 29 2026, 09:17:22 UTC | 7/7 | complete |
| DeepSeekHarness | [DSH 0.2.0-rc.2 - Context management great improvement ](https://www.reddit.com/r/DeepSeekHarness/comments/1wvsam7/dsh_020rc2_context_management_great_improvement/) | Oct 02 2026, 12:17:41 UTC | 9/9 | complete |
| DeepSeekHarness | [Output token limit reached, Jinja Exception: No user query found in messages ](https://www.reddit.com/r/DeepSeekHarness/comments/1wyxump/output_token_limit_reached_jinja_exception_no/) | Oct 06 2026, 09:07:58 UTC | 1/1 | complete |
| DeepSeekHarness | [Compactação de contexto do DSH-compact-basic ](https://www.reddit.com/r/DeepSeekHarness/comments/1x01le7/compactação_de_contexto_do_dshcompactbasic/) | Oct 07 2026, 16:47:33 UTC | 2/2 | complete |
| DeepSeekHarness | [i made dsh-session-tabs because i hate scrolling large session across many repo ](https://www.reddit.com/r/DeepSeekHarness/comments/1x16gtu/i_made_dshsessiontabs_because_i_hate_scrolling/) | Oct 08 2026, 23:46:50 UTC | 0/0 | complete |
| DeepSeekHarness | [ds-harness-remote plugin: The most comprehensive remote access solution, as recommended by the community. ](https://www.reddit.com/r/DeepSeekHarness/comments/1x1i9bp/dsharnessremote_plugin_the_most_comprehensive/) | Oct 09 2026, 10:53:42 UTC | 4/3 | partial |
| DeepSeekHarness | [I've created Feature Map plugin so your agents will have an idea what files to look for and what they are doing ](https://www.reddit.com/r/DeepSeekHarness/comments/1x1ospy/ive_created_feature_map_plugin_so_your_agents/) | Oct 09 2026, 15:46:07 UTC | 0/0 | complete |
| DeepSeekHarness | [Updated my plugin panel for MCP Settings now supports SSE ](https://www.reddit.com/r/DeepSeekHarness/comments/1x3wjfm/updated_my_plugin_panel_for_mcp_settings_now/) | Oct 12 2026, 08:36:33 UTC | 0/0 | complete |
| DeepSeekHarness | [made a small activity view plugin for deepseek harness (dsh) web ui ](https://www.reddit.com/r/DeepSeekHarness/comments/1x4po2s/made_a_small_activity_view_plugin_for_deepseek/) | Oct 13 2026, 06:50:48 UTC | 1/1 | complete |
| DeepSeekHarness | [Zed AI models provider for DSH ](https://www.reddit.com/r/DeepSeekHarness/comments/1x4y4fr/zed_ai_models_provider_for_dsh/) | Oct 13 2026, 14:27:35 UTC | 2/2 | complete |
| DeepSeekHarness | [Is there a good plugin to set personalization prompt (similar to Claude/Codex) ](https://www.reddit.com/r/DeepSeekHarness/comments/1x5haqv/is_there_a_good_plugin_to_set_personalization/) | Oct 14 2026, 03:49:23 UTC | 2/2 | complete |
| DeepSeekHarness | [Anyone else having issues with the new DSH update (0.2.0-rc.2)? ](https://www.reddit.com/r/DeepSeekHarness/comments/1x6epq8/anyone_else_having_issues_with_the_new_dsh_update/) | Oct 15 2026, 06:54:27 UTC | 5/5 | complete |
| DeepSeekHarness | [Forking at random points ](https://www.reddit.com/r/DeepSeekHarness/comments/1x6f6qz/forking_at_random_points/) | Oct 15 2026, 07:24:50 UTC | 0/0 | complete |
| StrixHalo | [AMD Boosting AI/LLM Performance For Radeon iGPUs As Much As 18~23% With Linux 7.4 ](https://www.reddit.com/r/StrixHalo/comments/1wtl5wb/amd_boosting_aillm_performance_for_radeon_igpus/) | Sep 29 2026, 20:27:24 UTC | 13/13 | complete |
| StrixHalo | [FastFlowLM can now run Qwen3.8 27B on Strix Halo's NPU! ](https://www.reddit.com/r/StrixHalo/comments/1wuczmb/fastflowlm_can_now_run_qwen38_27b_on_strix_halos/) | Sep 30 2026, 18:37:45 UTC | 20/21 | unknown |
| StrixHalo | [Another day another fork - Gufo for Windows with GUI. ](https://www.reddit.com/r/StrixHalo/comments/1wv56sn/another_day_another_fork_gufo_for_windows_with_gui/) | Oct 01 2026, 17:11:35 UTC | 14/15 | unknown |
| StrixHalo | [Qwen3.8-Flash-Next vs Qwen3.8-27B on 128 GB, is it worth giving up the second model? ](https://www.reddit.com/r/StrixHalo/comments/1ww0mt6/qwen38flashnext_vs_qwen3827b_on_128_gb_is_it/) | Oct 02 2026, 18:02:23 UTC | 77/81 | unknown |
| StrixHalo | [Qwen 3.8 flash next: does gufo make more errors than llama.cpp? ](https://www.reddit.com/r/StrixHalo/comments/1wwz2io/qwen_38_flash_next_does_gufo_make_more_errors/) | Oct 03 2026, 21:53:54 UTC | 17/17 | complete |
| StrixHalo | [I tested Qwen3.8-Flash-Next on my Bosgame M5 (128 GB). Here are the numbers across three backends ](https://www.reddit.com/r/StrixHalo/comments/1wxf2c2/i_tested_qwen38flashnext_on_my_bosgame_m5_128_gb/) | Oct 04 2026, 12:57:00 UTC | 40/38 | partial |
| StrixHalo | [Daily driving Qwen 3.8 Flash instead of Claude. ](https://www.reddit.com/r/StrixHalo/comments/1wxn9eq/daily_driving_qwen_38_flash_instead_of_claude/) | Oct 04 2026, 18:48:00 UTC | 0/0 | complete |
| StrixHalo | [DCP Proxy: A local AI gateway that prunes/compresses context for every client at once (OpenCode, anything OpenAI-compatible) (Windows) ](https://www.reddit.com/r/StrixHalo/comments/1wxq0aa/dcp_proxy_a_local_ai_gateway_that/) | Oct 04 2026, 20:40:43 UTC | 1/1 | complete |
| StrixHalo | [pixmaate/gufo + qwen3.8 27b cache takes so much memory ](https://www.reddit.com/r/StrixHalo/comments/1wzxop3/pixmaategufo_qwen38_27b_cache_takes_so_much_memory/) | Oct 07 2026, 14:16:05 UTC | 7/9 | unknown |
| StrixHalo | [Strix Halo 128GB on Windows: what fixed my local AI setup ](https://www.reddit.com/r/StrixHalo/comments/1x0hnpb/strix_halo_128gb_on_windows_what_fixed_my_local/) | Oct 08 2026, 04:28:36 UTC | 16/15 | partial |
| StrixHalo | [TIL: Check your preserve_thinking settings ](https://www.reddit.com/r/StrixHalo/comments/1x0m35r/til_check_your_preserve_thinking_settings/) | Oct 08 2026, 09:03:40 UTC | 7/7 | complete |
| StrixHalo | [Qwen3.8-27B: 159 tok/s on R9700, 64 tok/s on Strix Halo ](https://www.reddit.com/r/StrixHalo/comments/1x1apcc/qwen3827b_159_toks_on_r9700_64_toks_on_strix_halo/) | Oct 09 2026, 03:18:12 UTC | 0/0 | complete |
| StrixHalo | [slotpin: cache-maxing scheduler and dashboard for llama-server and Gufo ](https://www.reddit.com/r/StrixHalo/comments/1x2ner9/slotpin_cachemaxing_scheduler_and_dashboard_for/) | Oct 10 2026, 19:11:41 UTC | 5/4 | partial |
| StrixHalo | [strix-llama new branch: prompt processing +21–54% over Vulkan and up to 2.7× over stock ROCm at 128k, same outputs ](https://www.reddit.com/r/StrixHalo/comments/1x3s2t9/strixllama_new_branch_prompt_processing_2154_over/) | Oct 12 2026, 04:06:35 UTC | 9/9 | complete |
| StrixHalo | [A second Strix Halo ](https://www.reddit.com/r/StrixHalo/comments/1x4dk48/a_second_strix_halo/) | Oct 12 2026, 20:50:18 UTC | 24/24 | complete |
| StrixHalo | [What's the best model you guys are running on Strix Halo right now? ](https://www.reddit.com/r/StrixHalo/comments/1x4l1t5/whats_the_best_model_you_guys_are_running_on/) | Oct 13 2026, 02:31:53 UTC | 25/26 | unknown |
| StrixHalo | [Happy Halowin Season! Bubo: Another opinionated Gufo fork tuned for Windows (especially laptops) ](https://www.reddit.com/r/StrixHalo/comments/1x4x8j3/happy_halowin_season_bubo_another_opinionated/) | Oct 13 2026, 13:52:39 UTC | 16/15 | partial |
| StrixHalo | [Lemonade as single endpoint - Gofu, Hipfire, Halogen, etc. ](https://www.reddit.com/r/StrixHalo/comments/1x59igm/lemonade_as_single_endpoint_gofu_hipfire_halogen/) | Oct 13 2026, 21:36:35 UTC | 12/12 | complete |

## Publication and boundaries

The report and coverage metadata are intended for the DSH Halo repository and the Halo Stack Research reading folder. Public thread bodies/comments are not republished as a bulk dump. No unrelated dirty repository changes are included. Local retrieval helpers are task evidence, not a newly installed research service or product.
