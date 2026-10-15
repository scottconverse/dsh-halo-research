# Historical PR #1: Harden Start-DSH.ps1: no silent failures, brain check on every launch

Source URL: https://github.com/scottconverse/halo-stack/pull/1

Created: 2026-08-19T05:39:55Z · State: closed · Merged: 2026-08-19T05:49:16Z

## Original description

Four launcher fixes, all from failures observed while porting the stack to a second machine (RTX 5070 Ti 16GB / CUDA — full record in `TESTER-5070ti-bench.md` on branch `tester/5070ti`). The bugs are latent on HALO: they only fire on cold starts, after model eviction, or under federation, which HALO's always-warm 128GB single-box setup rarely exercises.

1. **Wait for LM Studio's API before loading** — poll `/v1/models` up to 60s. Observed: on a cold icon-click the loader raced the just-started server, failed to connect, and `| Out-Null` swallowed the error, leaving a cockpit with no model behind it.
2. **Run the brain-resident check even when :3080 is already up** — the old early-exit path (`already running? just open the page`) skipped the model check entirely, so an evicted brain stayed dead behind a working-looking cockpit.
3. **No silent failures** — loader output goes to `~\.dsh\launcher.log`, one retry, and the log opens in Notepad if both attempts fail.
4. **Federation-safe brain check** — requires `deviceIdentifier` null, so a federated remote device publishing the same model identity can't satisfy the check (on the 5070Ti box, HALO itself shows up in `lms ps` and satisfied the naive check, so the local brain never loaded).

Also deliberately ASCII-only: PowerShell 5.1 misparses BOM-less UTF-8 punctuation (an em-dash in a comment produced a parse error during testing).

**Verification state:** both new paths (API-wait on cold start, evicted-brain reload with :3080 up) exercised end-to-end on the 5070Ti box. **Needs one smoke run on HALO before merge** — cold boot via desktop icon, then a second icon-click with the cockpit already up.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## reviews

### 2026-08-19T05:42:26Z — COMMENTED


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `210aa5a2e2`
    

<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.




Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".
            
</details>

## review-comments

### 2026-08-19T05:42:26Z — comment

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Preserve UTF-8 when appending loader output**

On the explicitly targeted Windows PowerShell 5.1, `*>>` uses the redirection/`Out-File` default encoding (UTF-16LE) and does not adopt the existing file's encoding. Because line 19 creates this log as UTF-8, every brain-load attempt appends UTF-16LE bytes to a UTF-8 file; when loading fails and Notepad opens the log, the diagnostic output this hardening is meant to expose is corrupted or unreadable. Merge the streams and append them with an explicit UTF-8 encoding instead.

Useful? React with 👍 / 👎.
