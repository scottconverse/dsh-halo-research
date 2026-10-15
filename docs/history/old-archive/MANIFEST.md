> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Halo Old Archive

**Created:** 2026-08-23 · **Machine:** HALO (AMD Strix Halo, Windows 11)
**Reason:** the `halo-stack` project was retired and its repository wiped to start
over. This folder is the complete local record of everything that existed before
the wipe. Nothing here is needed for day-to-day work; it exists so the old work
can be consulted or recovered if wanted.

## What is here

| Folder | Contents |
|---|---|
| `repo-mirror.git/` | **Complete bare mirror** of the git repository — every branch, tag, ref and all commit history, exactly as it stood. This is the authoritative copy. |
| `repo-working-tree/` | The working directory as it stood at wipe time, including its own `.git`. 512 files. |
| `github/` | GitHub-side records that do **not** live in git. See the full breakdown below — this is the half that git cannot restore. |
| `live-deployment/` | The deployed stack as it was actually running: `.dsh` (the harness home, incl. settings, profiles, sessions, logs), `.lmstudio-scripts` (model loaders), `.agents` (skills). |
| `session-artifacts/` | Working files from the final session, including the full 224-package dsh plugin catalogue that the audit was built from. |

## The `github/` folder in detail

Git carries commits. It carries none of the following, and none of it can be
recovered from `repo-mirror.git`. Every count below was checked against the live
repository after download, and every file was confirmed non-empty.

| Path | Contents | Count |
|---|---|---|
| `pulls/` | Every pull request: metadata, commits, changed files, review comments, issue comments, and reviews — six JSON files each | **37 PRs** |
| `pull-patches/` | The actual code change of each PR as a `.patch` (3.25 MB total) | 37 patches |
| `pulls-index.json` | One-file index of all PRs | — |
| `issues.json` | Every issue, open and closed | 10 |
| `issue-comments/` | Comment bodies per issue (the index only carries counts) | 10 files |
| `workflow-runs-full.json` | **Complete** CI run list | 73 runs |
| `workflow-logs/` | The downloaded log bundle for every run (0.91 MB) | 73 zips |
| `artifacts-index.json` | Metadata for all artifacts, expired ones included | 30 |
| `artifacts/` | Every **unexpired** artifact, downloaded (7.44 MB). These are `github-pages` build outputs — i.e. the built public website | 7 zips |
| `deployments.json` | Deployment records | 67 |
| `environments.json` | Environments (`github-pages`) | 1 |
| `labels.json` | Labels, including the custom `accessibility` one | 10 |
| `releases.json`, `tags.json` | Releases and tags as they stood before deletion | 7 each |
| `repo-metadata.json`, `repo-full.json` | Description, topics, visibility, all settings | — |
| `milestones.json`, `webhooks.json`, `deploy-keys.json`, `collaborators.json` | Confirmed-empty surfaces, recorded so "empty" is evidenced rather than assumed | 0 / 0 / 0 / 1 |

**Why this matters:** the pull requests are the largest body of content in the
whole archive after the git mirror. 36 of the 37 were merged, so between them
they hold the full diff history of the project *and* the review discussion — none
of which survives a git history wipe. An earlier version of this archive did not
contain them.

## Restoring

To get the repository back exactly as it was:

```bash
git clone "C:\Users\scott\Desktop\Halo Old Archive\repo-mirror.git" halo-stack-restored
```

That recovers every commit, branch and tag. The `github/` JSON files hold the
issues and releases, which git does not carry.

## What was NOT changed on this machine

- The **live deployment is still running and untouched** — the cockpit, Mission
  Control and the loaders under `~/.dsh`, `~/.lmstudio`, `~/.agents` were copied
  here, not moved. Nothing was torn down.
- The **GitHub issues were exported but not deleted.** Deleted issues cannot be
  restored, so that step was left for an explicit decision.

## Contains one secret

`live-deployment/.dsh/.env` is the real environment file and holds live values.
It was archived deliberately so the deployment is recoverable, but this folder
should be treated as sensitive and never copied anywhere shared.

(Many files matching `credentials.*` also appear under `live-deployment/.dsh/
profiles/*/node_modules/` — those are third-party library source files, not
secrets.)

## Provenance of the retirement

The project was retired after an audit found that several of its components
duplicated capability the DeepSeek Harness already ships and that the project was
already loading at runtime. The audit is at
`repo-working-tree/docs/design/halo2/PLUGIN-AUDIT.md`; the write-up of the
process failure is `repo-working-tree/ANTHROPIC-ISSUE-REPORT-2026-08-23.md`.
