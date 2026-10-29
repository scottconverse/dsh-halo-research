# Halo v0.3.11 - Three-role goal recovery and status-wait fixes

The shared three-role plugin now waits after repeated inspection-only automatic
Coordinator rounds instead of consuming the goal budget on unchanged status
checks. Native goal readback exposes activation and rounds, explicit resume
preserves the existing goal and used count, and checkpoint/review handling lets
ready work proceed while unrelated findings remain open.

## Included since v0.3.10

- The shared Web/Desktop three-role plugin, role guidance, installation source
  and previously recorded synthetic acceptance artifacts.
- Goal activation/round readback and explicit active/disarmed resume handling,
  preserving human pause/stop and round-cap enforcement.
- A no-progress guard for two consecutive automatic rounds containing only
  inspection tools or no tools. Input, worker results, goal changes and lifecycle
  events release the wait; the guard does not increase caps or reset goals.
- Checkpoint and ready-work review corrections, content fingerprints that avoid
  review churn from unchanged polling, and external-process ownership guidance.
- Previously committed universal-goal availability, Web connection recovery and
  configuration/recovery documentation since the prior source release. This
  publication does not reapply those changes or alter installed settings.

[Repair and loaded-runtime record](docs/HALO-THREE-ROLE-REPAIR-2026-10-29.md) |
[Plugin behavior](stack/three-role/README.md) |
[Sanitized evidence](evidence/three-role/repair-2026-10-29.json) |
[Work history](docs/HISTORY.md)

## Existing evidence reused - no new tests

Both hosts previously restarted at verified idle and loaded the repaired
canonical plugin. Native Web inventory and Desktop role-guidance readback
confirmed the loaded changes. Existing focused lifecycle, adapter, content
fingerprint and native dispatcher evidence is retained without rerunning it.

One completed, bounded, headless live Web triad run observed two status-only
automatic rounds, then a 36,327-millisecond stable wait at active/armed 2/6 with
no additional goal round. The owner then paused only that new test goal; it
retained 2/6 used rounds and all three test sessions became idle. The original
Verdict goal remained revision 6, blocked/disarmed at 512/512. Protected profiles
and existing projects were unchanged.

The private live receipt remains unmodified, SHA-256
`634cb944f271916b3852285fa7d72df89cb62f3255908e1d3d050f628783ba6c`.
The public evidence summary records its timing, native sequence references and
scope without uploading private conversation journals or recovery files.

No tests, audits, model calls, installations, host restarts or goal mutations
were performed for this publication. Release work consists of documentation,
tagging, publication and remote delivery checks.

## Limits and distribution

The bounded live result establishes the specific status-wait behavior on Web;
it is not a separate Desktop live trial or a full autonomous product-completion
trial. Unknown/action tools conservatively count as progress, waiting turns
remain visibly running, and correct agent judgment is not guaranteed. Existing
role, finding-closure and completion restrictions remain authoritative.

This is **Halo deployment source release v0.3.11**, not a new upstream DSH
application binary or a standalone installer. GitHub source archives contain
the tracked plugin/source, public documentation and already-published evidence.
Previously documented machine paths and runtime dependencies still apply.
Existing models, defaults, settings, goals, integrations and recovery files are
preserved. Private receipts, raw conversations, credentials, runtime state and
rollback copies remain local; existing source-archive exclusions remain in effect.
