> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Where things stand — read this first after a context reset

**Written 2026-08-23**, immediately before the conversation was compacted. If you
are picking this up without the transcript, this page plus `POSTMORTEM.md` is
everything you need.

## State of the world

| | |
|---|---|
| `github.com/scottconverse/halo-stack` | **Deleted.** Repo, 7 releases, all tags and branches, Pages site. |
| here.now sites | **Deleted.** Both `quartz-entry-ptf2` (build log) and `brave-willow-zrcc` (mirror). |
| `C:\Users\scott\Desktop\Code\halo-stack` | **Cleared.** Empty directory entry remains, locked by this session's own shell; it disappears when the session ends. |
| This archive | **1.64 GB, 46,652 files.** Complete and verified against live GitHub before deletion. |
| The machine | **Untouched and running.** Cockpit `:3080` 200, Mission Control `:3090` 200, brain resident as `qwen/qwen3.8-27b` **Q5_K_XL, ctx 131072, parallel 1** — the correct pinned profile. |

Nothing was torn down on the box. Only the repository and the published sites are
gone.

## What is about to happen

Scott is starting over from scratch. The new work will be described after the
reset. **Do not assume it resumes the old design.** The explicit framing was:
rebuild *using existing tools* rather than hand-rolling again.

## The one rule that ends the way the last attempt ended

The old project's spec said "build only what the harness verifiably lacks — and
the verification is now done." **It had never been done.** Six days of work
duplicated shipped, already-mounted platform capability. That single unchecked
sentence is why everything above was deleted.

So, before any code:

1. **Read the inventory.** `session-artifacts/dsh-catalogue.txt` — all 224
   `@deepseek-ai` packages with descriptions.
2. **Check what is actually mounted**, not just what exists:
   `pnpm dlx "@deepseek-ai/dsh@<version>" --profile web --dump-config`.
   A package existing is not the same as it being loaded.
3. **Write the mapping down** — intended capability → shipped package, or
   "genuinely absent" — and only then build the absent ones.
4. **Never write "verified" without naming the artifact that proves it.**

## Three things worth taking from the old build

Everything else was scaffolding for scaffolding. These are not:

- **The LM Studio loaders** — `repo-working-tree/lmstudio/`. The only component
  with no platform equivalent: **zero of 224 packages** mention LM Studio, GGUF,
  quantization or VRAM. Carry them forward, but fix the defect first — their
  verification reads `value == null || value === expected`, so a null reading
  passes silently. A null must mean UNVERIFIED, loudly.
- **The bench data** — real measurements on this hardware: prefill 181 tok/s,
  cached TTFT 13.4 s (8.1×), decode 26.9/19.0 tok/s, plus the KV `q8_0` and MTP
  findings. Hardware truth, independent of the software mistake.
- **A small monitoring view** over `lms ps --json` and OS counters. The old
  Mission Control was 3,270 lines, 2,208 of them a hand-written UI page. The
  useful core is four JSON-returning CLI calls.

## Known trap, carried forward

`Start-DSH.ps1` set `DSH_PERMISSION_MODE=danger-full-access`, which resolves to
`sandbox: danger-full-access, approval: never` for every session. The harness
default is `workspace-write` — confined. Containment is a permission mode, not
something to build. Do not disable it and then write a detector for its absence.

## Finding anything in here

`GUIDE.md` — three ways in. `ARCHIVE.sqlite` searches PR bodies, **diff text**,
issues and commits. `INDEX.md` lists all 37 PRs and 10 issues with paths to their
diffs. `POSTMORTEM.md` is the full record, including 16 numbered mistakes and why
none of them were caught for six days.
