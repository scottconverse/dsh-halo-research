# Prompt-only to-do trial — evidence record (2026-08-30)

## Status

**Incomplete, useful, and not a pass.** The durable DSH log has no
`turn/end`. Its final event is sequence 504, a `pwsh` call to
`Get-ChildItem -Recurse` with no recorded result. DSH was not listening on
port 3080 when this evidence was captured. This record does not infer why the
process stopped.

## What was controlled

- Workspace began as an empty directory:
  `C:\Users\scott\Documents\HaloTodoPromptOnly`.
- No `AGENTS.md` existed in the workspace or its checked parent directories.
- A fresh session used the installed `halo-orchestrator` preset.
- The only direct human message was Scott's prompt, reproduced exactly in the
  session log.
- Codex did not send a follow-up, correction, test contract, fixed port, or
  hidden workspace file during this run.

## What was *not* neutral

This was prompt-only at the user-message layer, but it was **not a raw model or
stock-DSH test**. The installed Halo preset supplied a long system prompt that
instructed the model to plan, delegate exactly once, use a verifier, preserve
unrelated changes, and follow specific tool policies. The exact system prompt
is in `session.decoded.jsonl` at the `request/header` event.

The request header proves the root model was
`halo/qwen3-coder-30b-a3b-q6k`, not the documented 35B planner. The live DSH
default model had been temporarily changed to the Q6 candidate. Although the
system prompt told the root to use `subagent_coder` exactly once, the session
made no `subagent_coder` call and no subagent was observed. It implemented
directly with 11 `write` calls and 9 `pwsh` calls.

## What the run accomplished

- Created a styled Express to-do application and Docker files.
- Installed 100 npm packages with zero reported npm vulnerabilities.
- Tried both `docker-compose` and `docker`; both commands were unavailable on
  the host despite the prompt saying Docker was installed.
- Adapted by starting a local Node server and creating `test-app.js`.
- `node start-server.js` served on port 3000 until DSH's 120-second tool
  timeout terminated the foreground command.
- `node test-app.js` passed its own structural string/file checks.
- Rewrote the README to emphasize the non-Docker fallback.

## Defects visible without changing the result

These are inspection findings, not repaired files:

1. **Persistence requirement is not implemented.** `server.js` and
   `start-server.js` store todos in an in-memory array. The Docker volume maps
   `./data` to `/app/data`, but the application never reads or writes it.
2. **The README falsely claims Docker persistence.** Mounting an unused
   directory does not persist the in-memory array.
3. **The required clean Docker workflow was not proven.** Docker was absent.
4. **Port selection was not performed.** Port 3000 was hard-coded without the
   required pre-use availability check.
5. **Clear-completed is shadowed.** `DELETE /api/todos/:id` is registered
   before `DELETE /api/todos/completed`, so Express matches `completed` as the
   `:id` route first.
6. **The Docker health check is likely broken.** `node:18-alpine` does not
   install `curl`, yet both health checks call it.
7. **The self-test is not behavioral.** It checks file existence and source
   substrings, does not fail on every negative branch, and does not exercise
   CRUD, browser behavior, persistence, restart, Docker build, health, or port
   selection.
8. **The run never completed.** There is no final DSH answer or turn end.

The run still shows useful initiative: after discovering Docker was absent,
the model did not stop immediately; it built a local fallback and attempted to
test its work. That behavior is evidence, but it must not be upgraded into a
successful application verdict.

## Evidence contents

- `session.jsonl.zstd` — exact DSH durable log, SHA-256
  `8792A2F9820990A222B5BBD58D6AC52EF2725FFDBB37F0162B903C085C45AF51`.
- `session.decoded.jsonl` — mechanically decoded 110-frame log, SHA-256
  `B59446D87E824F9966D21918EDE1C314FB51CC085637218003E202A16DED15B7`.
- `live-settings.yaml` — exact DSH settings at the run, including Q6 as the
  default model.
- `live-agent.cordis.yml` — exact installed Halo preset at the run.
- `live-cordis.patch.yml` — exact installed web-profile patch at the run.
- `app-source\` — source snapshot after the final recorded write; deliberately
  excludes `node_modules`.

Original live locations:

- Workspace: `C:\Users\scott\Documents\HaloTodoPromptOnly`
- Session: `C:\Users\scott\.dsh\sessions\--C-Users-scott-Documents-HaloTodoPromptOnly--\session-4dd98f2e-106d-4f4c-9721-d6b4e5b1493d\session.jsonl.zstd`
- Session id: `session-4dd98f2e-106d-4f4c-9721-d6b4e5b1493d`

## Correct interpretation

This is the first preserved trial where Codex supplied only Scott's task
prompt after session creation. It is an authentic sample of the **installed
Halo preset plus its standing system prompt**, running the Q6 coder as root.
It is not evidence of a raw model, stock DSH, the documented 35B-planner/Q6-
worker topology, or an independently verified prompt-to-shipped-app success.
