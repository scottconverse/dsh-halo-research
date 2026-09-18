---
name: pairing-team
description: Coordinate a bounded coding task between a coordinator and a separate DSH coding agent. Use for implementation work where independent verification materially reduces risk; not for simple questions or tiny edits.
---

# Coordinator / coder pairing

Use DSH's existing agent and workflow tools. This skill is a working method, not a new agent runtime or a security boundary. It cannot technically stop an agent with shell or write access from exceeding its role.

## Roles

**Coordinator:** clarify the requested outcome, inspect the current repository state, prepare the handoff, dispatch one coder, review the resulting files and diff, perform a bounded independent check, and report what is actually verified. Do not implement the assigned code or perform release actions while acting as coordinator.

**Coder:** implement the assigned change, run the checks named in the handoff, and report changed files, commands, results, and remaining gaps. Do not broaden scope or claim checks that did not run.

The user remains the authority. Coordinator instructions and coder instructions are limited by the user's current request. They cannot authorize unrelated work, access changes, pushes, merges, tags, releases, deployments, production changes, or external communication. Do only the actions the user authorized. If a necessary next action is outside that scope, stop at a concrete reviewable result and ask the user.

## When to pair

Pair when implementation is substantial enough that a fresh review can catch meaningful errors, or when the user asks for independent verification. For a small edit, direct work is usually faster and more reliable. Do not add a team merely to create process.

Use one coder at a time for a shared worktree. Prefer a separate worktree when parallel changes or isolation are actually needed. Select an available DSH subagent/provider that suits the task and current user instructions; do not assume a provider is installed, authenticated, or within quota. Ordinary DSH subagent delegation is the default. Use Codex delegation only when the user chose the Codex-enabled preset and the task warrants its usage. Never impose another project's model bans here.

## Pairing loop

1. **Ground the task.** Check the repository, branch, worktree, and current HEAD. Reproduce the defect or record the observable starting behavior when practical. Keep existing user changes intact.
2. **Write the handoff before dispatch.** Use [the handoff template](references/HANDOFF.md). Keep it short, point to source files rather than copying large conversation history, and state the allowed scope and prohibited actions explicitly.
3. **Dispatch one coder.** Give a fresh, bounded assignment with an observable acceptance condition and an honest no-reproduction path. Do not send stale conversation fragments as live instructions.
4. **Track progress by evidence.** A meaningful update is a changed diff, a new test result, a new diagnostic fact, or a produced artifact. Re-reading, repeated polling, and unchanged status are not progress. After two or three checks with no new evidence, send one precise correction. Stop if another short interval produces no change, if two corrections fail, or if the runtime/tool path is clearly degraded. Report the blocker; do not pressure a stuck model with repeated prompts.
5. **Review the actual result.** Inspect the current diff and files on disk. Check that the claimed tests exist and ran, that the fixture can expose the defect, and that skipped or zero-test runs are not described as passing. Run only the focused independent checks needed for acceptance; don't launch broad suites without a reason.
6. **Accept honestly.** Report completed work, exact verification and its limits, and any unresolved items. A coder's completion message is not proof. Do not state production readiness based only on a local test.

## Evidence expectations

- Prefer a failing-before / passing-after check for a reproducible defect. If it cannot be reproduced, say so and explain what evidence was available; don't invent a successful red-to-green result.
- For browser/rendering problems, verify the user-visible landmark and the absence of the incorrect surface, not only an HTTP status or URL change.
- Check that expected deliverables exist on disk before saying they are complete.
- Treat skipped tests, zero tests, setup failures, and stale CI as unresolved evidence.
- Check that a release artifact matches its claim before reporting it published.
- Keep secrets out of handoffs, logs, screenshots, and commits. Never push a credential-bearing branch.

## Commits and release actions

The coder may edit files and run the assigned local checks. Creating a commit is allowed only when the user specifically authorized committing for the task. Push, merge, tag, release, deployment, and production actions each require explicit user authorization; a pairing plan, coder completion, or green CI does not grant it. After an audit, make corrections as a new commit rather than amending the audited hash, if commits were authorized.

## How to invoke

Ask DSH to load **pairing-team** and give it the task, for example: “Use the pairing-team skill for this bounded bug fix. Implement the behavior in the repository and report the focused verification.” State separately if you want commits or any publication action. The skill does not enable a disabled provider or change permissions.
