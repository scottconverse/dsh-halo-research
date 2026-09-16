---
name: openai-multi-agent
description: Coordinate Scott's development workers using Sol, Terra, and Luna while Codex usage is available, and Ollama DeepSeek 4.1 Flash below 10 percent remaining with Astra only coordinating. Use for requested multi-agent development, usage-aware worker routing, or resuming its task board. LM Studio trials require a separate explicit request.
---

# OpenAI Multi-Agent

Own the requested development outcome using the smallest effective team. Use the quota routing rule first; the Luna-first rules below apply only while main Codex usage is at least 10 percent remaining. Below that threshold, DeepSeek replaces OpenAI execution and review workers, and Astra coordinates only. This skill supplies workflow instructions; it does not install an orchestrator, create machine access, or change the current lead model.

If asked to edit or review the skill itself, perform that task without launching its project workflow. Otherwise use the user's accompanying task and existing project context as the brief. Ask one concise question for the project/problem and source only when these are missing.

## Preserve the selected scope

- Follow Scott's usage-aware routing in [ollama-fallback.md](references/ollama-fallback.md). At 10 percent remaining or more, use Sol, Terra, and Luna workers normally. Below 10 percent in either available main Codex usage window, use Ollama `deepseek-v4.1-flash:cloud` for execution, tests, and review; Astra coordinates only. Keep Claude and Fable outside all delegation, review, and fallback paths. Incorporate ideas the user brings back from private brainstorming without contacting those services.
- Keep LM Studio inactive until the user explicitly requests a local-model trial. Do not inspect, start, configure, download, benchmark, or dispatch to local models during Phase 1. Read [local-trial.md](references/local-trial.md) only after that request.
- Treat the development machine as user-reported context: AMD Halo, Strix-Halo processor, 128 GB unified memory, Windows 11 Pro, latest reported 64 GB system / 64 GB GPU allocation. Do not treat this as a live measurement or assume machine access.
- Prefer the existing native Windows workflow. Run routine commands through available tools; the user prefers graphical interactions and paste-ready requests over operating a terminal. Do not add Docker, WSL, inference servers, SDK orchestration, separately billed model APIs, or global configuration changes merely to make this workflow possible.

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

Use `MODE: SINGLE_AGENT` for straightforward work when delegation adds overhead. Use `MODE: OPEN_MULTI_AGENT` for a bounded implementation or independent review that materially helps. A deliberate initial Luna experiment can justify one suitable real ticket; do not split trivial work to manufacture agent activity.

**This skill explicitly requests spawning subagents, selecting the models below, and parallel agent work when that gate passes**, subject to the host's capabilities and permissions. Begin with the current lead and one Luna worker. Add reviewers or workers only where they help; parallelize independent tasks while the lead does useful work.

| Model target | Preferred assignment |
| --- | --- |
| Astra `gpt-6-astra` | New lead assignments, architecture, hard diagnosis, consequential review |
| Sol `gpt-5.6-sol` | Alternate lead, complex implementation or review |
| Terra `gpt-5.6-terra` | Everyday integration, bounded independent review, ordinary implementation escalation |
| Luna `gpt-5.6-luna` | Initial and default worker for clear, bounded implementation tickets |

Treat routing as user-selected starting preferences, not measured performance guarantees. Preserve the current lead; identify its model only when exposed. Do not claim to switch it by assigning a role. Use a supported stronger child for difficult work when useful.

Inspect runtime agent controls and model-selection support. Follow their actual schema and context rules. Where a model override requires a fresh or limited-history agent, use that supported route with a self-contained ticket. Keep default reasoning unless a task warrants another supported setting. A UI model picker does not prove the same model is callable as a subagent.

Report `DELEGATION: VERIFIED | PARTIAL | UNAVAILABLE`: VERIFIED means the necessary controls are exposed, PARTIAL means some requested model or capability is missing, and UNAVAILABLE means no usable delegation route. Distinguish planned assignments, successful invocations, confirmed model identities, and returned results. Record actual identifiers where exposed; mark unexposed facts unknown.

If Luna cannot be selected, continue with an available listed substitute or the current lead and mark the Luna trial unperformed. Do not simulate agents or label a substitute as Luna. If required independent review cannot occur, keep that acceptance requirement outstanding. Do not invent host configuration keys or tool names to overcome missing capabilities.

## Execute and accept

For multi-agent work, read [coordination.md](references/coordination.md) before dispatch. It defines tickets, file ownership, handoffs, the compact board, and Luna trial evidence. Reuse equivalent project records. For simple single-agent work, avoid creating a board solely for ceremony.

Keep product decisions, interfaces, ticket scope, integration, and final acceptance with the lead. Give Luna suitable real work; do not allocate every useful implementation to stronger models and claim Luna was tested. Delegate difficult work directly to a stronger model when risk or ambiguity makes Luna unsuitable.

Require workers to return usable changes, checks actually run, limitations, and a handoff. Review actual source and diffs against the observable acceptance criteria. Use focused behavioral verification and required project gates; add regression tests for material behavior when needed. Distinguish independently executed checks from reported results. Recheck the integrated state where integration can affect behavior.

Allow focused correction after diagnosing a failure. After two unsuccessful attempts on a ticket, split or revise it, escalate to Terra/Sol as appropriate, or have the lead take over. Preserve the worker's original submission and distinguish ticket/tool failures from implementation failures.

Call lead-only review `SELF_REVIEW`. A fresh session of the same model is separate review but not model diversity. Mark a ticket DONE only after the lead accepts the actual result; retain unmet required review or platform checks as outstanding. Do not stop at a plan when implementation was requested. Continue useful authorized work while another ticket is blocked.

## Continue across sessions

For the first three suitable real tasks, use the read-only analyzer and compact outcome record in [measurement.md](references/measurement.md). Keep retrospective log samples separate from prospective trials, reuse existing evidence records, and review the samples before adding more tooling. Measurement does not require extra agents or synthetic project work.

Use the repository as the source of truth for code and evidence. Resume from the board and relevant lessons, then recheck execution access and models. For a move between Desktop and this workspace, read the handoff guidance in [coordination.md](references/coordination.md). Do not assume conversations, local paths, files, credentials, or agents transfer between them.

Keep authorization tied to the requested project action. Do not add merge, publication, deployment, or person-directed messaging beyond the authorized scope. Preserve user changes and keep secrets out of coordination records.

Start with a compact report of environment/workspace, phase, mode, delegation status, planned roles, and the first observable milestone; then execute. Finish with the outcome, changes, verification and platform limits, actual Luna trial result if any, and only the specific remaining user action.
