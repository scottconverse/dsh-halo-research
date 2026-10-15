# DSH Halo history and recovered records

Recovered October 15, 2026 from **Halo Stack Research**, **Halo Old Archive**, and this repository. This is a historical documentation recovery, not a deployment change, benchmark run, or certification that every historical claim is correct.

## Start here

- [Current work: Gufo installation, real jobs and corrected speed reporting](../HALO-GUFO-WORK-RECORD-2026-10-15.md).
- [October 1 consolidated retrospective](research/HALO-ARCHIVE-CONSOLIDATED-REPORT-2026-10-01.md): evidence strengths, prior coding/model measurements, tool-catalog overhead, compaction successes and failures, and admitted mistakes. Its recommendations describe that period.
- [Retired project's postmortem](old-archive/POSTMORTEM.md): the August project's failures and retirement, preserved rather than omitted.
- [Retired GitHub PR discussions](retired-github/README.md) and [issues with comments](retired-github/issues.md).
- [Source manifest](source-manifest.json): original relative paths, original hashes, publication paths, transformations and exclusions.
- [Current repository commit index](current-commits.tsv) and [retired mirror commit index](retired-commits.tsv). These are snapshots taken before this recovery commit. The retired mirror's all-ref traversal has 163 commit rows; the historical SQLite export has 125 commit records. They are different inventories, not counts to add together.

## What was recovered

The scoped source inventory contains **302 candidate records**: **143 recovered source records**, **101 exact-content matches already represented in tracked repository files**, and **58 local-only records**. Twenty recovered records are text extractions from Word documents. Duplicated reading/recovery copies are not independent evidence. The recovery also exports narratives for **37 historical PRs**, **10 issues**, release/tag metadata and a compact workflow-run record, plus commit indexes for **177 current-repository** and **163 retired-mirror** commits.

The retired SQLite index was read without modification: it contains 37 PRs, 10 issues, 73 workflow runs, 210 changed-file records and 46,653 archive-file rows. Those rows include dependencies and deployment material; they do not mean 46,653 historical reports were read or uploaded.

Files were inventoried and screened for credential patterns. A second scan of publication files found no matching credential patterns. This is a limited screening check, not a security certification. Private/raw conversation filenames, credential-related files, binary database contents, large raw records and runtime/dependency trees were not published. Original source files remain unchanged. No Git history was rewritten, no historical branches/releases were recreated, and the retired code was not merged into today's runtime.

## Chronology and useful anchors

| Period | Documented work | Read first |
| --- | --- | --- |
| Aug 17–23 | Original Halo design, Mission Control, model/window experiments, pipeline and gate reviews; eventual retirement and false-claim findings | [Postmortem](old-archive/POSTMORTEM.md), [old changelog](old-archive/repo-working-tree/CHANGELOG.md), [PR history](retired-github/README.md) |
| Aug 24–30 | Rebuild designs, runtime evidence, staged audits, memory carveout and model-library work | [Audit baseline](research/AUDIT-BASELINE-2026-08-27.md), [project-state review](research/AUDIT-PROJECT-STATE-REVIEW-2026-08-30.md) |
| Sep 1–2 | Gateway/native access handoffs and isolated development CLI/browser/provider work | [Development copy](research/DSH-DEVELOPMENT-README-2026-09-02.md), [browser acceptance](research/DSH-DEVELOPMENT-BROWSER-ACCEPTANCE-2026-09-02.md) |
| Sep 13–16 | Reddit skill, model/provider recovery, tuning, lean catalogs, cloud routing and Codex delegation | [Sep 13 implementation](research/HALO-DSH-IMPLEMENTATION-2026-09-13.md), [Reddit skill](research/HALO-DSH-IMPLEMENTATION-2026-09-14-REDDIT-SKILL.md), [lean coding](../DSH-LEAN-CODING-2026-09-15.md) |
| Sep 25–Oct 1 | Long-running compaction/endurance history, Q4/Q6 comparisons, picker/catalog work, cleanup and retrospective | [Consolidated archive report](research/HALO-ARCHIVE-CONSOLIDATED-REPORT-2026-10-01.md), [Oct 1 implementation](research/HALO-DSH-IMPLEMENTATION-2026-10-01.md) |
| Oct 2–10 | DSH upgrades, Mission Control/effort catalog fixes, research routing, Windows reinstall recovery and Web Ollama restoration | [Oct 2 upgrade](../HALO-DSH-UPDATE-2026-10-02.md), [Oct 9 recovery](../HALO-DSH-IMPLEMENTATION-2026-10-09-WINDOWS-RECOVERY.md), [Oct 10 Web](../HALO-DSH-IMPLEMENTATION-2026-10-10-WEB-OLLAMA-27B.md) |
| Oct 11 | Missed integration repairs, Desktop retrieval/Reddit schema, transport/compaction, provider catalog and accounting closeout | [Accumulated implementation notes](research/HALO-DSH-IMPLEMENTATION-2026-10-11.md), [closeout](../HALO-DSH-FULL-CLOSEOUT-2026-10-11.md), [saved accounting](../evidence/dsh-integration-repair-2026-10-11/FULL-CLOSEOUT-ACCOUNTING.json) |
| Oct 15 | Windows Gufo with existing Q6, recommended Q4/DFlash2 configuration, short real coding repair and DSH speed-accounting correction | [Complete work record](../HALO-GUFO-WORK-RECORD-2026-10-15.md) |

## How to interpret this archive

Historical configurations may be obsolete. Plans, agent self-reports, green tests, UI observations and actual provider/tool evidence have different strength. Later append-only notes sometimes repeat sections or supersede earlier pending items. They are preserved for provenance; the recovery does not silently turn old pending status into a current defect or erase failures because a later repair passed.

Original documents may retain machine-local links or links to deleted historical sites. Use this inventory and manifest for GitHub navigation. Word extracts preserve body text, not document layout, images or embedded objects. Full private transcripts, original DOCX files, the SQLite search database, binaries, Git object stores, CI ZIPs and raw deployed homes remain local in the two source folders. This is a documented history archive, not a complete machine-restoration image.

## Recovered source inventory


| Source | Original record | Published record |
| --- | --- | --- |
| research | ANTHROPIC-ISSUE-2026-08-26-FINAL.docx | [read](research/ANTHROPIC-ISSUE-2026-08-26-FINAL.docx.md) |
| research | AUDIT-BASELINE-2026-08-27.md | [read](research/AUDIT-BASELINE-2026-08-27.md) |
| research | AUDIT-CITATION-GATE-EVIDENCE-2026-08-27.md | [read](research/AUDIT-CITATION-GATE-EVIDENCE-2026-08-27.md) |
| research | AUDIT-PROJECT-STATE-REVIEW-2026-08-30.md | [read](research/AUDIT-PROJECT-STATE-REVIEW-2026-08-30.md) |
| research | AUDIT-STAGE-1-VERDICT-2026-08-27.md | [read](research/AUDIT-STAGE-1-VERDICT-2026-08-27.md) |
| research | AUDIT-STAGE-2-VERDICT-2026-08-27.md | [read](research/AUDIT-STAGE-2-VERDICT-2026-08-27.md) |
| research | AUDIT-STAGE-3-DESIGN-REVIEW-2026-08-27.md | [read](research/AUDIT-STAGE-3-DESIGN-REVIEW-2026-08-27.md) |
| research | AUDIT-STAGE-3-REVIEW-ADDENDUM-2026-08-27.md | [read](research/AUDIT-STAGE-3-REVIEW-ADDENDUM-2026-08-27.md) |
| research | AUDIT-STAGE-4-VERDICT-2026-08-29.md | [read](research/AUDIT-STAGE-4-VERDICT-2026-08-29.md) |
| research | CLAUDE-AUDITOR-HANDOFF-2026-08-30.md | [read](research/CLAUDE-AUDITOR-HANDOFF-2026-08-30.md) |
| research | Claude-Harness-HALO-Design-v2.md | [read](research/Claude-Harness-HALO-Design-v2.md) |
| research | Claude-Harness-HALO-Design.md | [read](research/Claude-Harness-HALO-Design.md) |
| research | Clean-Room Research Prompt — DeepSeek Harness on AMD Strix Halo - Windows 11.md | [read](research/Clean-Room%20Research%20Prompt%20%E2%80%94%20DeepSeek%20Harness%20on%20AMD%20Strix%20Halo%20-%20Windows%2011.md) |
| research | CODEX-APP-UPDATE-HANDOFF-2026-08-30.md | [read](research/CODEX-APP-UPDATE-HANDOFF-2026-08-30.md) |
| research | CODEX-DEEPSEEK-FINAL-HANDOFF-2026-09-16.md | [read](research/CODEX-DEEPSEEK-FINAL-HANDOFF-2026-09-16.md) |
| research | Codex-Harness-Halo v1.md | [read](research/Codex-Harness-Halo%20v1.md) |
| research | DeepSeek Harness on AMD Strix Halo — Research Report and Build Specification (2026-08-23) rev2.docx | [read](research/DeepSeek%20Harness%20on%20AMD%20Strix%20Halo%20%E2%80%94%20Research%20Report%20and%20Build%20Specification%20%282026-08-23%29%20rev2.docx.md) |
| research | DSH Full plugin list.txt | [read](research/DSH%20Full%20plugin%20list.txt) |
| research | DSH-DEVELOPMENT-BROWSER-ACCEPTANCE-2026-09-02.md | [read](research/DSH-DEVELOPMENT-BROWSER-ACCEPTANCE-2026-09-02.md) |
| research | DSH-DEVELOPMENT-CLI-INTEGRATION-2026-09-02.md | [read](research/DSH-DEVELOPMENT-CLI-INTEGRATION-2026-09-02.md) |
| research | DSH-DEVELOPMENT-CLI-METRICS-2026-09-02.md | [read](research/DSH-DEVELOPMENT-CLI-METRICS-2026-09-02.md) |
| research | DSH-DEVELOPMENT-CLI-REVIEW-2026-09-02.md | [read](research/DSH-DEVELOPMENT-CLI-REVIEW-2026-09-02.md) |
| research | DSH-DEVELOPMENT-CLI-RUNTIME-2026-09-02.md | [read](research/DSH-DEVELOPMENT-CLI-RUNTIME-2026-09-02.md) |
| research | DSH-DEVELOPMENT-ISOLATION-REVIEW-2026-09-02.md | [read](research/DSH-DEVELOPMENT-ISOLATION-REVIEW-2026-09-02.md) |
| research | DSH-DEVELOPMENT-PROVIDER-ACCESS-2026-09-02.md | [read](research/DSH-DEVELOPMENT-PROVIDER-ACCESS-2026-09-02.md) |
| research | DSH-DEVELOPMENT-README-2026-09-02.md | [read](research/DSH-DEVELOPMENT-README-2026-09-02.md) |
| research | DSH-DEVELOPMENT-TESTS-2026-09-02.txt | [read](research/DSH-DEVELOPMENT-TESTS-2026-09-02.txt) |
| research | DSH-HALO-CLOUD-SUBAGENT-INTEGRATION-GUIDE-v1.0.md | [read](research/DSH-HALO-CLOUD-SUBAGENT-INTEGRATION-GUIDE-v1.0.md) |
| research | DSH-Strix-Halo-Report-v2.4.docx | [read](research/DSH-Strix-Halo-Report-v2.4.docx.md) |
| research | DSH-Strix-Halo-Report-v2.5.docx | [read](research/DSH-Strix-Halo-Report-v2.5.docx.md) |
| research | DSH-Strix-Halo-Report-v2.6.docx | [read](research/DSH-Strix-Halo-Report-v2.6.docx.md) |
| research | DSH-Strix-Halo-Report-v2.7.docx | [read](research/DSH-Strix-Halo-Report-v2.7.docx.md) |
| research | DSH-Strix-Halo-Report-v2.8.docx | [read](research/DSH-Strix-Halo-Report-v2.8.docx.md) |
| research | DSH-Strix-Halo-Report-v2.9.docx | [read](research/DSH-Strix-Halo-Report-v2.9.docx.md) |
| research | DSH-Strix-Halo-Report-v3.0.docx | [read](research/DSH-Strix-Halo-Report-v3.0.docx.md) |
| research | DSHStrixHaloReportv2.1.docx | [read](research/DSHStrixHaloReportv2.1.docx.md) |
| research | DSHStrixHaloReportv2.2.1.docx | [read](research/DSHStrixHaloReportv2.2.1.docx.md) |
| research | DSHStrixHaloReportv2.2.docx | [read](research/DSHStrixHaloReportv2.2.docx.md) |
| research | DSHStrixHaloReportv2.3.docx | [read](research/DSHStrixHaloReportv2.3.docx.md) |
| research | DSH_Strix_Halo_v2.2.1_Reconciliation_Handoff.docx | [read](research/DSH_Strix_Halo_v2.2.1_Reconciliation_Handoff.docx.md) |
| research | gptoss-120b-load-memory-20260829.csv | [read](research/gptoss-120b-load-memory-20260829.csv) |
| research | gptoss-120b-load-memory-mmap-20260829.csv | [read](research/gptoss-120b-load-memory-mmap-20260829.csv) |
| research | HALO-ARCHIVE-CONSOLIDATED-REPORT-2026-10-01.md | [read](research/HALO-ARCHIVE-CONSOLIDATED-REPORT-2026-10-01.md) |
| research | HALO-CODEX-WORKER-REPAIR-2026-09-16.md | [read](research/HALO-CODEX-WORKER-REPAIR-2026-09-16.md) |
| research | HALO-CURRENT-CONFIGURATION.md | [read](research/HALO-CURRENT-CONFIGURATION.md) |
| research | HALO-DSH-IMPLEMENTATION-2026-09-13.md | [read](research/HALO-DSH-IMPLEMENTATION-2026-09-13.md) |
| research | HALO-DSH-IMPLEMENTATION-2026-09-14-REDDIT-SKILL.md | [read](research/HALO-DSH-IMPLEMENTATION-2026-09-14-REDDIT-SKILL.md) |
| research | HALO-DSH-IMPLEMENTATION-2026-09-15-128K-TUNING.md | [read](research/HALO-DSH-IMPLEMENTATION-2026-09-15-128K-TUNING.md) |
| research | HALO-DSH-IMPLEMENTATION-2026-09-15-FIVE-INVESTIGATIONS.md | [read](research/HALO-DSH-IMPLEMENTATION-2026-09-15-FIVE-INVESTIGATIONS.md) |
| research | HALO-DSH-IMPLEMENTATION-2026-09-15-SUPERGROK.md | [read](research/HALO-DSH-IMPLEMENTATION-2026-09-15-SUPERGROK.md) |
| research | HALO-DSH-IMPLEMENTATION-2026-09-27-WEB-MODEL-PARITY.md | [read](research/HALO-DSH-IMPLEMENTATION-2026-09-27-WEB-MODEL-PARITY.md) |
| research | HALO-DSH-IMPLEMENTATION-2026-10-01.md | [read](research/HALO-DSH-IMPLEMENTATION-2026-10-01.md) |
| research | HALO-DSH-IMPLEMENTATION-2026-10-11-INTEGRATION-AUDIT.md | [read](research/HALO-DSH-IMPLEMENTATION-2026-10-11-INTEGRATION-AUDIT.md) |
| research | HALO-DSH-IMPLEMENTATION-2026-10-11-TRANSPORT-COMPACTION.md | [read](research/HALO-DSH-IMPLEMENTATION-2026-10-11-TRANSPORT-COMPACTION.md) |
| research | HALO-DSH-IMPLEMENTATION-2026-10-11.md | [read](research/HALO-DSH-IMPLEMENTATION-2026-10-11.md) |
| research | HALO-ROUTER-PLUGIN-SPEC-v0.1.md | [read](research/HALO-ROUTER-PLUGIN-SPEC-v0.1.md) |
| research | HALO-STACK-GUIDE.md | [read](research/HALO-STACK-GUIDE.md) |
| research | halo2.0misc.md | [read](research/halo2.0misc.md) |
| research | HANDOFF-TO-NEXT-AGENT.docx | [read](research/HANDOFF-TO-NEXT-AGENT.docx.md) |
| research | REBOOT-STATE-2026-08-27.md | [read](research/REBOOT-STATE-2026-08-27.md) |
| research | Spec-Gap-Analysis-Session-vs-Report-v2.2.1.docx | [read](research/Spec-Gap-Analysis-Session-vs-Report-v2.2.1.docx.md) |
| research | SPEC.md | [read](research/SPEC.md) |
| research | STAGE-3-HANDOFF-TO-CODEX-2026-08-27.md | [read](research/STAGE-3-HANDOFF-TO-CODEX-2026-08-27.md) |
| research | STAGE-5-HARDGATE-REAL-WORLD-VERDICT-2026-08-29.md | [read](research/STAGE-5-HARDGATE-REAL-WORLD-VERDICT-2026-08-29.md) |
| research | archived research/DeepSeek Harness on AMD Strix Halo — Research Report and Build Specification (2026-08-23).docx | [read](research/archived%20research/DeepSeek%20Harness%20on%20AMD%20Strix%20Halo%20%E2%80%94%20Research%20Report%20and%20Build%20Specification%20%282026-08-23%29.docx.md) |
| research | archived research/deepseek-harness-strix-halo-spec-2026-08-23.docx | [read](research/archived%20research/deepseek-harness-strix-halo-spec-2026-08-23.docx.md) |
| research | archived research/DeepSeek_Harness_AMD_Strix_Halo_Architecture_Report.docx | [read](research/archived%20research/DeepSeek_Harness_AMD_Strix_Halo_Architecture_Report.docx.md) |
| research | archived research/DSH_Strix_Halo_Architecture_Spec_2026-08-23.docx | [read](research/archived%20research/DSH_Strix_Halo_Architecture_Spec_2026-08-23.docx.md) |
| research | HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/POST-HANDOFF-UPDATE-2054.md | [read](research/HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/POST-HANDOFF-UPDATE-2054.md) |
| research | HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/START-HERE.md | [read](research/HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/START-HERE.md) |
| research | HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/evidence/gateway-host-integration.md | [read](research/HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/evidence/gateway-host-integration.md) |
| research | HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/evidence/gateway-skill-limitations.md | [read](research/HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/evidence/gateway-skill-limitations.md) |
| research | HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/evidence/github-cursor-followup.md | [read](research/HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/evidence/github-cursor-followup.md) |
| research | HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/evidence/parallel-dsh-implementation-report.md | [read](research/HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/evidence/parallel-dsh-implementation-report.md) |
| research | HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/pre-repair/README.md | [read](research/HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/pre-repair/README.md) |
| research | HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/pre-repair/operator-docs/MANIFEST-SHA256.txt | [read](research/HANDOFF-2026-09-01-GATEWAY-NATIVE-ACCESS/pre-repair/operator-docs/MANIFEST-SHA256.txt) |
| old-archive | GUIDE.md | [read](old-archive/GUIDE.md) |
| old-archive | INDEX.md | [read](old-archive/INDEX.md) |
| old-archive | MANIFEST.md | [read](old-archive/MANIFEST.md) |
| old-archive | NEXT.md | [read](old-archive/NEXT.md) |
| old-archive | POSTMORTEM.md | [read](old-archive/POSTMORTEM.md) |
| old-archive | repo-working-tree/ANTHROPIC-ISSUE-REPORT-2026-08-23.md | [read](old-archive/repo-working-tree/ANTHROPIC-ISSUE-REPORT-2026-08-23.md) |
| old-archive | repo-working-tree/CHANGELOG.md | [read](old-archive/repo-working-tree/CHANGELOG.md) |
| old-archive | repo-working-tree/README.md | [read](old-archive/repo-working-tree/README.md) |
| old-archive | repo-working-tree/docs/AUDIT-cordis-concepts-2026-08-18.md | [read](old-archive/repo-working-tree/docs/AUDIT-cordis-concepts-2026-08-18.md) |
| old-archive | repo-working-tree/docs/AUDIT-redundancy-2026-08-17.md | [read](old-archive/repo-working-tree/docs/AUDIT-redundancy-2026-08-17.md) |
| old-archive | repo-working-tree/docs/AUDIT-telemetry-2026-08-17.md | [read](old-archive/repo-working-tree/docs/AUDIT-telemetry-2026-08-17.md) |
| old-archive | repo-working-tree/docs/Claude-Harness-HALO-Design-v2.md | [read](old-archive/repo-working-tree/docs/Claude-Harness-HALO-Design-v2.md) |
| old-archive | repo-working-tree/docs/Claude-Harness-HALO-Design.md | [read](old-archive/repo-working-tree/docs/Claude-Harness-HALO-Design.md) |
| old-archive | repo-working-tree/docs/HALO-Stack-Monitor-Prompt.md | [read](old-archive/repo-working-tree/docs/HALO-Stack-Monitor-Prompt.md) |
| old-archive | repo-working-tree/docs/USER-MANUAL.md | [read](old-archive/repo-working-tree/docs/USER-MANUAL.md) |
| old-archive | repo-working-tree/docs/audits/AUDIT-first-run-and-launchers-2026-08-21.md | [read](old-archive/repo-working-tree/docs/audits/AUDIT-first-run-and-launchers-2026-08-21.md) |
| old-archive | repo-working-tree/docs/design/budgeted-emit-dryrun-2026-08-19.md | [read](old-archive/repo-working-tree/docs/design/budgeted-emit-dryrun-2026-08-19.md) |
| old-archive | repo-working-tree/docs/design/budgeted-emit-pipeline-design.md | [read](old-archive/repo-working-tree/docs/design/budgeted-emit-pipeline-design.md) |
| old-archive | repo-working-tree/docs/design/halo2/G1-EVIDENCE.md | [read](old-archive/repo-working-tree/docs/design/halo2/G1-EVIDENCE.md) |
| old-archive | repo-working-tree/docs/design/halo2/IMPLEMENTATION-PLAN.md | [read](old-archive/repo-working-tree/docs/design/halo2/IMPLEMENTATION-PLAN.md) |
| old-archive | repo-working-tree/docs/design/halo2/PLUGIN-AUDIT.md | [read](old-archive/repo-working-tree/docs/design/halo2/PLUGIN-AUDIT.md) |
| old-archive | repo-working-tree/docs/design/halo2/SPEC.md | [read](old-archive/repo-working-tree/docs/design/halo2/SPEC.md) |
| old-archive | repo-working-tree/docs/experiments/creator-mode-2026-08-18.md | [read](old-archive/repo-working-tree/docs/experiments/creator-mode-2026-08-18.md) |
| old-archive | repo-working-tree/docs/phases/bench-day-2-results.md | [read](old-archive/repo-working-tree/docs/phases/bench-day-2-results.md) |
| old-archive | repo-working-tree/docs/phases/bench-day-3-results.md | [read](old-archive/repo-working-tree/docs/phases/bench-day-3-results.md) |
| old-archive | repo-working-tree/docs/phases/bench-window-131k.md | [read](old-archive/repo-working-tree/docs/phases/bench-window-131k.md) |
| old-archive | repo-working-tree/docs/phases/phase2-bench-results.md | [read](old-archive/repo-working-tree/docs/phases/phase2-bench-results.md) |
| old-archive | repo-working-tree/docs/phases/phase3-reach-results.md | [read](old-archive/repo-working-tree/docs/phases/phase3-reach-results.md) |
| old-archive | repo-working-tree/docs/phases/phase4-harden-results.md | [read](old-archive/repo-working-tree/docs/phases/phase4-harden-results.md) |
| old-archive | repo-working-tree/docs/phases/pin-record.txt | [read](old-archive/repo-working-tree/docs/phases/pin-record.txt) |
| old-archive | repo-working-tree/docs/ports/tester-5070ti-bench-2026-08-18.md | [read](old-archive/repo-working-tree/docs/ports/tester-5070ti-bench-2026-08-18.md) |
| old-archive | repo-working-tree/docs/research/strix-halo-deep-dive-2026-08-18.md | [read](old-archive/repo-working-tree/docs/research/strix-halo-deep-dive-2026-08-18.md) |
| old-archive | repo-working-tree/gate-halo-stack-2026-08-21/00-walkthrough.md | [read](old-archive/repo-working-tree/gate-halo-stack-2026-08-21/00-walkthrough.md) |
| old-archive | repo-working-tree/gate-halo-stack-2026-08-21/01-engineering.md | [read](old-archive/repo-working-tree/gate-halo-stack-2026-08-21/01-engineering.md) |
| old-archive | repo-working-tree/gate-halo-stack-2026-08-21/01-lite.md | [read](old-archive/repo-working-tree/gate-halo-stack-2026-08-21/01-lite.md) |
| old-archive | repo-working-tree/gate-halo-stack-2026-08-21/02-ux.md | [read](old-archive/repo-working-tree/gate-halo-stack-2026-08-21/02-ux.md) |
| old-archive | repo-working-tree/gate-halo-stack-2026-08-21/03-docs.md | [read](old-archive/repo-working-tree/gate-halo-stack-2026-08-21/03-docs.md) |
| old-archive | repo-working-tree/gate-halo-stack-2026-08-21/04-test.md | [read](old-archive/repo-working-tree/gate-halo-stack-2026-08-21/04-test.md) |
| old-archive | repo-working-tree/gate-halo-stack-2026-08-21/05-qa.md | [read](old-archive/repo-working-tree/gate-halo-stack-2026-08-21/05-qa.md) |
| old-archive | repo-working-tree/gate-halo-stack-2026-08-21/GATE-REPORT.md | [read](old-archive/repo-working-tree/gate-halo-stack-2026-08-21/GATE-REPORT.md) |
| old-archive | repo-working-tree/gate-halo2-2026-08-22/01-engineering.md | [read](old-archive/repo-working-tree/gate-halo2-2026-08-22/01-engineering.md) |
| old-archive | repo-working-tree/gate-halo2-2026-08-22/02-ux.md | [read](old-archive/repo-working-tree/gate-halo2-2026-08-22/02-ux.md) |
| old-archive | repo-working-tree/gate-halo2-2026-08-22/03-docs.md | [read](old-archive/repo-working-tree/gate-halo2-2026-08-22/03-docs.md) |
| old-archive | repo-working-tree/gate-halo2-2026-08-22/04-tests.md | [read](old-archive/repo-working-tree/gate-halo2-2026-08-22/04-tests.md) |
| old-archive | repo-working-tree/gate-halo2-2026-08-22/05-qa.md | [read](old-archive/repo-working-tree/gate-halo2-2026-08-22/05-qa.md) |
| old-archive | repo-working-tree/gate-halo2-2026-08-22/reverify-docs.md | [read](old-archive/repo-working-tree/gate-halo2-2026-08-22/reverify-docs.md) |
| old-archive | repo-working-tree/gate-halo2-2026-08-22/reverify-engineering.md | [read](old-archive/repo-working-tree/gate-halo2-2026-08-22/reverify-engineering.md) |
| old-archive | repo-working-tree/gate-halo2-2026-08-22/reverify-qa.md | [read](old-archive/repo-working-tree/gate-halo2-2026-08-22/reverify-qa.md) |
| old-archive | repo-working-tree/gate-halo2-2026-08-22/reverify-tests.md | [read](old-archive/repo-working-tree/gate-halo2-2026-08-22/reverify-tests.md) |
| old-archive | repo-working-tree/gate-halo2-2026-08-22/reverify-ux.md | [read](old-archive/repo-working-tree/gate-halo2-2026-08-22/reverify-ux.md) |
| old-archive | repo-working-tree/gate-migration-rc8-2026-08-21/docs.md | [read](old-archive/repo-working-tree/gate-migration-rc8-2026-08-21/docs.md) |
| old-archive | repo-working-tree/gate-migration-rc8-2026-08-21/eng.md | [read](old-archive/repo-working-tree/gate-migration-rc8-2026-08-21/eng.md) |
| old-archive | repo-working-tree/gate-migration-rc8-2026-08-21/qa.md | [read](old-archive/repo-working-tree/gate-migration-rc8-2026-08-21/qa.md) |
| old-archive | repo-working-tree/gate-migration-rc8-2026-08-21/security-perf.md | [read](old-archive/repo-working-tree/gate-migration-rc8-2026-08-21/security-perf.md) |
| old-archive | repo-working-tree/gate-migration-rc8-2026-08-21/test.md | [read](old-archive/repo-working-tree/gate-migration-rc8-2026-08-21/test.md) |
| old-archive | repo-working-tree/machines/README.md | [read](old-archive/repo-working-tree/machines/README.md) |
| old-archive | repo-working-tree/pipeline/README.md | [read](old-archive/repo-working-tree/pipeline/README.md) |
| old-archive | repo-working-tree/pipeline/prompts/emit_chunk.md | [read](old-archive/repo-working-tree/pipeline/prompts/emit_chunk.md) |
| old-archive | repo-working-tree/pipeline/prompts/plan_chunks.md | [read](old-archive/repo-working-tree/pipeline/prompts/plan_chunks.md) |
| old-archive | repo-working-tree/pipeline/prompts/review.md | [read](old-archive/repo-working-tree/pipeline/prompts/review.md) |
| old-archive | repo-working-tree/pipeline/runs/latest/emit-check.txt | [read](old-archive/repo-working-tree/pipeline/runs/latest/emit-check.txt) |
| old-archive | repo-working-tree/pipeline/runs/latest/integrate-report.txt | [read](old-archive/repo-working-tree/pipeline/runs/latest/integrate-report.txt) |
| old-archive | repo-working-tree/pipeline/runs/latest/plan-check.txt | [read](old-archive/repo-working-tree/pipeline/runs/latest/plan-check.txt) |
| old-archive | repo-working-tree/pipeline/runs/latest/review-gate.txt | [read](old-archive/repo-working-tree/pipeline/runs/latest/review-gate.txt) |
| old-archive | repo-working-tree/pipeline/runs/latest/review-input.md | [read](old-archive/repo-working-tree/pipeline/runs/latest/review-input.md) |
| old-archive | repo-working-tree/pipeline/runs/latest/task-brief.md | [read](old-archive/repo-working-tree/pipeline/runs/latest/task-brief.md) |
| old-archive | repo-working-tree/skills/large-job/SKILL.md | [read](old-archive/repo-working-tree/skills/large-job/SKILL.md) |

## Exact duplicates already represented

See `source-manifest.json` rows with `status: already-represented` for their tracked repository paths. They were not republished merely to inflate the archive.

## Recovery method

Read-only source traversal, SHA-256 comparison with tracked text/data, labelled text extraction from Word XML, credential-pattern screening, selected GitHub discussion export and read-only Git/SQLite inventory. Only documentation and historical evidence were written; apps, models, launchers, profiles and current uncommitted code were left untouched.