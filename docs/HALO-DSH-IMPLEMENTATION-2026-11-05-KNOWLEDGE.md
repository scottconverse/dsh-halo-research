# Shared knowledge library for DSH Web and Desktop - November 5, 2026

## Installed outcome

Added exactly two native skills, knowledge-ingest and knowledge-query, pointing at
one private folder: `C:/Users/scott/Documents/DSH Knowledge Library`. The canonical
skills are under `stack/stock-dsh/skills`; identical Desktop fallback copies live in
its existing home/skills directory. Existing preset custom roots already include
the canonical directory. No profile, plugin dependency, model/default, goal, service,
scheduled task, hook or additional agent was changed or added. Neither host restarted.
Strata was not started. No existing notes, receipts, transcripts or project trees
were moved, rewritten or bulk imported.

## Use in either host

- "Use knowledge-ingest to add this selected file/article to the shared library."
- "Use knowledge-query: what have we saved about <topic>? Cite the sources."

The native Skills picker can load these names in presets that already provide skill
tools. Existing host filesystem watchers discover bundle additions. If an existing
chat has a stale catalog, use its normal refresh or a new chat; do not interrupt
running work. The library is explicitly referenced by the skills, not injected into
every chat or substituted for DSH/Codex memory.

## Evidence and preservation

The installed rc.5 native FileSystemSkillProvider was exercised in a separate,
short-lived Node process against all seven skill-provider configurations extracted
from the two installed profiles. Both skills were discovered and their full bodies
loaded with model and human invocation enabled. Desktop's fallback copies also
loaded and matched the canonical SHA256 values. This is real native-provider and
filesystem acceptance, not an observed live-host chat or an LLM quality evaluation.
No inspector, host injection, authentication changes or provider requests were used.

One complete public design document was fetched from a pinned Second Brain OS
revision and ingested into the library: an immutable SHA256-named original, source
record, one linked concept, index and log. A read-only query followed index -> source
record -> original and found the actual knowledge/project-layer passages. All seven
authored local links resolve; archive SHA256 matches. Original upstream-relative
links remain unchanged inside the archived source and resolve in its upstream context.

The first link-check implementation incorrectly treated an upstream relative link
inside the untouched archive as a library-owned link. It was corrected to check
authored library pages; no archived content was edited to make the check pass.

All 119 captured pre-existing profile, goal and skill files remained byte-identical.
The four profile files and two goal/project files have full private recovery copies.
Existing notes and immutable receipts were not read or mutated by this installation.
The initial library contains only the selected public setup source and local guides.
No cloud-model call or private-source upload was made for acceptance. One accountable
Codex agent performed the work serially; no subagents. Coordinator token/cost metrics
are not exposed by these filesystem receipts. No broad suite or benchmark was run.

See [sanitized acceptance](evidence/shared-knowledge-2026-11-05/acceptance.json).
Private receipts/recovery/state are under
`C:/Users/scott/Documents/Codex/2026-11-05/dsh-shared-knowledge`.

## Library behavior and boundaries

Ingest archives only explicitly selected ordinary sources, records source paths/URLs,
times, SHA256 and extraction limits, and adds useful source-linked pages. Authoritative
receipts are referenced by original path/hash. Historical evidence is not rewritten
or promoted into current acceptance. Query is read-only and cites pages, distinguishes
claims from observations, and states gaps. Neither skill launches extra agents,
automation, services, provider changes or automatic backfills. Source text is untrusted
data, never executable instructions. No external connector was installed.

The shared folder requires no database, embedding index, Obsidian or large local
model. An ordinary cloud-model chat still sends the context it reads through that
chat's existing provider; local file storage does not make cloud inference local.
Existing session permission controls remain in force. Shared filesystem access has
no automatic merge service: re-read before edits and serialize concurrent writers.
These are model instructions, not an enforcement sandbox or quality guarantee.

## Recovery and removal

Back up the private library as a normal user folder. The versioned
`stack/stock-dsh/knowledge-library-template` supplies an empty-library template and
rules. Restore it only into a NEW folder; never overlay a populated library. The
skills currently name Scott's absolute library path, so another machine must adapt
that path in its own copies. Copy the two skills into each host's already-configured
skill root. No profile edit or host restart is necessary for watched roots.

To disconnect, remove only knowledge-ingest and knowledge-query from the canonical
and Desktop fallback roots; preserve the private library, original sources, receipts
and all other skills. A dated recovery copy and additive manifest entries are kept
in Halo Stack Research/Current Halo Configuration. Public source delivery excludes
private library contents, original profile backups and raw diagnostics. No new
release/tag is part of this task.

Design reference: https://github.com/undefined-ui/second-brain-os (MIT). The DSH skills
are newly written, bounded instructions inspired by its source-linked wiki pattern;
the upstream agent, command, hook and automation collections were not installed.
