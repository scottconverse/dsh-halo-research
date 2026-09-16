---
name: openai-multi-agent
description: Complete development work using Ollama DeepSeek and tuned local helpers by default, with Astra coordination and selective Sol, Terra, and Luna checks. Use for requested multi-agent development, usage-aware routing, or resuming its task board.
---

# OpenAI Multi-Agent

Own the requested development outcome with the smallest effective team. For implementation and tests, use Ollama `deepseek-v4.1-flash:cloud` and tuned local helpers from the start. Target more than 90% of task work to cloud DeepSeek and local helpers, 1–5% to Astra coordination and bounded high-judgment work, and 6–9% to selective native Sol/Terra/Luna checks. These are workload targets, not guarantees or quota thresholds. This skill supplies workflow instructions; it does not install an orchestrator or change the current lead model.

If asked to edit or review the skill itself, perform that task without launching its project workflow. Otherwise use the user's accompanying task and existing project context as the brief. Ask one concise question for the project/problem and source only when these are missing.

## Preserve the selected scope

- Follow Scott's usage-aware routing in [ollama-fallback.md](references/ollama-fallback.md). Check live quota at the start of substantial work, before dispatch when the reading is older than five minutes, and at task boundaries about every 15 minutes during sustained work. Below 10% remaining in either available main Codex window, do not start new premium OpenAI workers. At 10% or more, selective native workers are available when useful. Missing quota is unknown, not zero. Do not redeem reset credits automatically or use a separately billed OpenAI fallback.
- Keep Claude and Fable outside delegation, review, and fallback paths. Incorporate ideas the user brings back from private brainstorming without contacting those services.
- Use the bounded local `ask_local.py` helper only for its supported one-shot brain or coder tasks. It calls the configured LM Studio instance directly; it is not an autonomous agent and does not run a custom tool loop. See [local-trial.md](references/local-trial.md). Do not tune models or change global settings as part of task routing.
- Treat reported machine and model details as user-reported unless verified live. Avoid treating hardware allocations as free memory.
- Prefer the existing native Windows workflow. Do not add Docker, WSL, inference servers, SDK orchestration, or unrelated global configuration changes merely to make this workflow possible.

## Establish actual access

Inspect the accessible source, applicable `AGENTS.md`, current branch and user changes, execution OS/shell, and available build/test tools. Determine where commands run independently of which app the user is viewing.

| Available environment | Required adaptation |
| --- | --- |
| Verified local Windows checkout | Work in that checkout using the actual shell and existing tooling. |
| Hosted or remote checkout | Work there and identify target-platform verification gaps. Do not claim edits reached the user's PC or remote repository unless the corresponding operation succeeded. |
| Repository connector without executable checkout | Perform supported source operations; distinguish editing from execution and testing. |
| Attachments or conversation without execution tools | Produce useful analysis, code, patches, or a handoff; disclose outstanding execution and integration. |

A Windows path or browser on the user's PC does not establish access. Do not invent contents of an inaccessible project. Complete useful available work before requesting the smallest missing access or source item. A passing portable check does not prove a Windows installer, desktop integration, or GPU path works.

## Choose roles and verify routing

Use `MODE: SINGLE_AGENT` for straightforward work when delegation adds overhead. Use `MODE: OPEN_MULTI_AGENT` for bounded implementation or independent review that materially helps. Keep the team small; do not split trivial work to manufacture agent activity.

| Role | Use |
| --- | --- |
| Ollama `deepseek-v4.1-flash:cloud` | Default implementation, diagnosis, and tests through the packaged `run_ollama_code_worker.py` launcher, which drives the stock Codex CLI tool loop. |
| Tuned local coder helper | Bounded coding drafts, mechanical changes, and other tasks suited to a one-shot answer. |
| Tuned local brain helper | High-reasoning bounded review or analysis. |
| Astra | Coordination and bounded high-judgment work. |
| Sol `gpt-5.6-sol`, Terra `gpt-5.6-terra`, Luna `gpt-5.6-luna` | Selective bounded checks or implementation when quota and task value support them. |

Treat workload targets as starting preferences, not measured performance guarantees. Native subagents are authorized when they materially help, but are not mandatory. Inspect actual runtime controls and model-selection support; use the exposed model ID and a fresh, self-contained brief when required. Preserve the current lead; identify its model only when exposed. Do not claim to switch it by assigning a role. Report `DELEGATION: VERIFIED | PARTIAL | UNAVAILABLE` when relevant, distinguishing planned assignments, successful invocations, confirmed model identities, and returned results. Mark unexposed facts unknown. If required independent review cannot occur, retain it as outstanding.

## Execute and accept

For multi-agent work, read [coordination.md](references/coordination.md) before dispatch. Reuse equivalent project records. For simple single-agent work, avoid creating a board solely for ceremony.

Keep product decisions, interfaces, ticket scope, integration, and final acceptance with the lead. Give each worker or helper a bounded task with a source snapshot and acceptance criteria. Drive code workers through `run_ollama_code_worker.py` and accept only on a receipt with `"success": true`, a nonempty authoritative `--output-last-message` that agrees with any stdout `agent_message`, an actual diff, and executed tests; exit 0 alone is not success. Continue a stopped worker with `--resume <SESSION_ID>` from the receipt rather than replaying the coordinator conversation. Use file-based briefs to reduce repeated lead-context replay. Require actual artifacts, tests/checks that were run, limitations, and a handoff; inspect the returned artifacts and results rather than treating a process exit code as proof of success. Review actual source and diffs against observable acceptance criteria. Use focused behavioral verification and required project gates. Distinguish personally executed checks from reported results.

After two unsuccessful attempts on a bounded task, split or revise it, escalate with the reason, or have the lead take over; do not retry indefinitely. Preserve the original artifact and distinguish ticket/tool failures from implementation failures. Call lead-only review `SELF_REVIEW`. A fresh session of the same model is separate review but not model diversity. Mark a ticket DONE only after the lead accepts the actual result; retain unmet required review or platform checks as outstanding. Continue useful authorized work while another ticket is blocked.

## Continue across sessions

Use the read-only analyzer and compact outcome record in [measurement.md](references/measurement.md) where suitable. Keep retrospective log samples separate from prospective trials, reuse existing evidence records, and review the samples before adding more tooling. Measurement does not require extra agents or synthetic project work.

Use the repository as the source of truth for code and evidence. Resume from the board and relevant lessons, then recheck execution access and models. For a move between Desktop and Work, read the handoff guidance in [coordination.md](references/coordination.md). Do not assume conversations, local paths, files, credentials, or agents transfer between environments.

Keep authorization tied to the requested project action. Do not add merge, publication, deployment, or person-directed messaging beyond the authorized scope. Preserve user changes and keep secrets out of coordination records.

Start with a compact report of environment/workspace, phase, mode, delegation status, planned roles, and the first observable milestone; then execute. Finish with the outcome, changes, verification and platform limits, and only the specific remaining user action.
