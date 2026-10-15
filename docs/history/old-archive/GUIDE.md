> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# How to find anything in this archive

Three ways in, easiest first.

1. **`INDEX.md`** — browse. Every PR and issue by number and title, with the path
   to its diff. Start here if you half-remember a name.
2. **`ARCHIVE.sqlite`** — search. Full text across PR titles and bodies, **the
   diffs themselves**, issues, and commit messages. Start here if you remember a
   phrase but not where it was.
3. **`repo-mirror.git`** — the code. Clone it and use normal git.

---

## 1. Search the database

Any SQLite tool works. From PowerShell with Python:

```powershell
python -c "import sqlite3;d=sqlite3.connect(r'C:\Users\scott\Desktop\Halo Old Archive\ARCHIVE.sqlite');[print(k,'|',r,'|',t[:80]) for k,r,t in d.execute(\"SELECT kind,ref,title FROM search WHERE search MATCH 'sandbox' LIMIT 20\")]"
```

**What is searchable:** `kind` is one of `pull`, `patch` (the actual diff text),
`issue`, or `commit`.

### Queries worth knowing

```sql
-- Where was a phrase ever mentioned, in any form?
SELECT kind, ref, title FROM search WHERE search MATCH 'containment';

-- Which change actually touched a file?
SELECT DISTINCT p.number, p.title, p.patch_file
FROM pull_files f JOIN pulls p ON p.number = f.pr
WHERE f.filename LIKE '%Halo-Coverage%';

-- The files that churned most (where the pain was)
SELECT filename, COUNT(*) prs FROM pull_files GROUP BY filename ORDER BY prs DESC LIMIT 20;

-- Everything that shipped, newest first
SELECT number, title, merged_at FROM pulls WHERE merged=1 ORDER BY merged_at DESC;

-- Issues that were never closed
SELECT number, title, created_at FROM issues WHERE state='OPEN';

-- CI runs that failed, and where their logs are
SELECT id, name, conclusion, log_file FROM runs WHERE conclusion NOT IN ('success') ;

-- Is a file in this archive at all, and how big?
SELECT path, bytes FROM archive_files WHERE path LIKE '%SPEC%';

-- What was checked and found empty (so you do not re-check it)
SELECT * FROM empty_surfaces;
```

### Tables

| Table | Rows | What it holds |
|---|---|---|
| `pulls` | 37 | Every PR: title, state, branches, SHAs, body, path to its diff |
| `pull_files` | 210 | Which files each PR changed, with line counts |
| `issues` | 10 | Every issue, open and closed, with body and labels |
| `commits` | 125 | Every non-merge commit in the mirror: sha, date, author, message |
| `releases` | 7 | The deleted releases (tag, title, date) |
| `runs` | 73 | Every CI run, its outcome, and the path to its log zip |
| `archive_files` | 46,651 | Every file in this archive, with size |
| `empty_surfaces` | 20 | Things confirmed to contain nothing |
| `search` | FTS5 | Full text: PR titles/bodies, **diff contents**, issues, commit messages |

---

## 2. Get the code back

```powershell
git clone "C:\Users\scott\Desktop\Halo Old Archive\repo-mirror.git" halo-restored
```

That gives you every branch and tag. The mirror also holds **`refs/github/pull/*`**
— the 37 pull-request refs fetched from GitHub itself, so PR commits survive even
though the branches were deleted. To see one:

```powershell
git -C halo-restored fetch "C:\Users\scott\Desktop\Halo Old Archive\repo-mirror.git" "refs/github/pull/47/head"
git -C halo-restored log FETCH_HEAD
```

To read a change without cloning anything, just open
`github/pull-patches/pr-47.patch` — it is a plain text diff.

---

## 3. Folder map

| Folder | What |
|---|---|
| `repo-mirror.git/` | All history, all branches, all tags, all PR refs. The authority. |
| `repo-working-tree/` | The files exactly as they last stood on disk. |
| `github/pulls/` | Six JSON files per PR: detail, commits, files, review comments, comments, reviews. |
| `github/pull-patches/` | One `.patch` per PR — the actual code change, readable. |
| `github/timelines/` | Event history for all 47 issues and PRs (labels, closes, references). |
| `github/issue-comments/` | Comment bodies per issue. |
| `github/workflow-logs/` | 73 CI log bundles. |
| `github/artifacts/` | 7 zips — the built public website as it was published. |
| `github/unchecked/` | Responses proving the empty surfaces really are empty. |
| `live-deployment/` | The stack as it was actually running: `.dsh`, loaders, skills. |
| `session-artifacts/` | Working files, including the full 224-package dsh plugin catalogue. |

---

## Known holes

Two things are genuinely not here, both lost before the archive was completed:

- **Release note bodies.** Only tag, title and date were captured before the 7
  releases were deleted. The substance is in `CHANGELOG.md` inside the mirror,
  because that is where they were generated from.
- **23 expired CI artifacts.** They expired on GitHub before any of this began.

Everything else that GitHub held has been pulled in and count-verified against the
live repository.
