> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Codex app-update and 64/64 reboot handoff — 2026-08-30

This file is the operator-facing summary of the full handoff at:
`C:\Users\scott\Documents\Codex\2026-08-24\rea\CODEX-APP-UPDATE-HANDOFF-2026-08-30.md`

## Required continuation

- Scott authorized changing AMD Adrenalin from **96 GB GPU / 32 GB Windows** to **64 GB GPU / 64 GB Windows**.
- Scott, not an agent, will press the reboot button.
- Both Halo models have been unloaded; `lms ps --json` returned `[]`.
- The Adrenalin setting remains pending because Codex Computer Use failed before enumerating applications with `failed to write kernel assets: path not found`. No blind click or registry workaround was attempted.
- In Adrenalin, select **Performance > Tuning > Variable Graphics Memory > 64 GB**, apply it, and leave the reboot to Scott.

## After reboot

1. Verify approximately 64 GB Windows memory and 64 GB graphics allocation.
2. Load `halo-brain-35b` and `halo-coder-q4km`, both at 32K and `parallel=1`.
3. Confirm completed loads and full GPU offload.
4. Start one CivicCast Sandbox (its active `.wsb` is capped at 16 GB).
5. Check memory/commit/GPU pressure and run one tiny planner and worker response.
6. Use serialized model loading if dual residency does not fit cleanly.

## Durable state pointers

- Full handoff: `C:\Users\scott\Documents\Codex\2026-08-24\rea\CODEX-APP-UPDATE-HANDOFF-2026-08-30.md`
- Halo current configuration: `C:\Users\scott\Desktop\Halo Stack Research\HALO-CURRENT-CONFIGURATION.md`
- Mission Control audit: `C:\Users\scott\Desktop\Halo Stack Research\HALO-MISSION-CONTROL-AUDIT-2026-08-30.md`
- Governing spec: `C:\Users\scott\Desktop\Halo Stack Research\DSH-Strix-Halo-Report-v3.2.md`
- Halo HEAD: `67850b5c`; worktree clean at handoff.
- Hardgate HEAD: `ba39b23`; preserve the expected untracked `templates/read-nag-hook/` and `tests/read_nag_hook_test.py` paths.
- Verified tests: Halo gate 9/9; Hardgate 134/134.

## Quantization/VGM research completed before reboot

- Full report: `C:\Users\scott\Desktop\Halo Stack Research\HALO-STRIX-QUANTIZATION-AND-VGM-COMMUNITY-REVIEW-2026-08-30.md`
- Canonical repository copy: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-STRIX-QUANTIZATION-AND-VGM-COMMUNITY-REVIEW-2026-08-30.md`
- Both copies were verified byte-identical at SHA-256 `35188B2A22AD9652FEAB26245726C102A0456FCB109405D48EC570A8F5508673`.
- Revised conclusion: keep 64/64 and the current Q4/Q4 pair as the known-good baseline, but do not treat Q4_K_M as the final quant verdict. After basic post-reboot validation, run one short mixed-quant experiment with the Q4 brain and a separate Q6 worker candidate. Promote only on better verified time-to-green/first-pass results without paging or material regression.
- Do not change both models to Q6. Their combined weights plus 32K runtime overhead are too close to the 64 GB dedicated ceiling.
