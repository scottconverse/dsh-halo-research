# DSH Halo Stage 2 Reasoning-Contract Evidence — 2026-09-01

Scope: DeepSeek Harness (DSH) Halo only. This evidence does not cover the Halo Research Gateway or OpenClaw.

## Outcome

PASS. DSH no longer advertises or edits fictional graded reasoning levels for the hand-declared Halo LM Studio routes. Mission Control now separates three different facts:

1. the currently configured DSH model route;
2. whether DSH settings explicitly configure a named reasoning effort; and
3. the exact model alias contract, when one exists.

An absent `reasoningEffort` is reported as `none — adapter/provider resolves at request time`. It is not reported as `off`, `medium`, `high`, or `not sent` based only on static settings.

## Versioned changes

- `stack/mission-control/mission-control.mjs`
  - removes the stale low/medium/high/xhigh editor;
  - removes reasoning from the writable settings whitelist;
  - parses the configured DSH route;
  - resolves Boolean LM Studio alias defaults without relabeling them as graded efforts;
  - distinguishes the current raw-model contract from the daily 35B alias reference.
- `stack/mission-control/test/reasoning-contract.test.mjs`
  - 11 deterministic contract tests.
- `stack/mission-control/Install-HaloMissionControl.ps1`
  - syntax-checks and tests before install;
  - stages, hashes, backs up, and atomically installs Mission Control;
  - records whether tests ran, their result, and the test command;
  - is idempotent.
- `stack/halo-settings.yaml`
  - comments now describe operator-controlled model selection and provider-owned/Boolean reasoning honestly.

The live `C:\Users\scott\.dsh\settings.yaml` comments were corrected without changing Scott's selected route. The versioned recovery baseline remains `lmstudio/halo/qwen3.6-35b-a3b`; the live selection is intentionally `lmstudio/unsloth/qwen3.8-27b`.

## Deterministic evidence

Commands:

```powershell
node --check C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\mission-control.mjs
node --test C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\test\reasoning-contract.test.mjs
```

Result: 11 passed, 0 failed, 0 skipped.

Second installer invocation:

```text
Action: NoOp
RestartRequired: false
TestsRan: true
TestResult: Passed
```

## Deployment evidence

- Canonical Mission Control SHA-256: `A47A2BCD62E7D6FC0057E0CE9CAB8201C6D34E881899C30A82E45711EF64591E`
- Installed Mission Control SHA-256: `A47A2BCD62E7D6FC0057E0CE9CAB8201C6D34E881899C30A82E45711EF64591E`
- Install receipt: `C:\Users\scott\.dsh\mission-control\backups\install-20260901-173523-484-d6451c14.json`
- Receipt SHA-256: `6C52CB076A46F4F22F5107372FCD1A271C00BCE90BAB1F12A05F37D3EBC11A5B`
- Previous installed source backup: `C:\Users\scott\.dsh\mission-control\backups\mission-control-20260901-173523-484-d6451c14.mjs`
- Mission Control restarted as PID 31500 from the canonical file.
- HTTP checks after restart: DSH `http://127.0.0.1:3080/` = 200; Mission Control `http://127.0.0.1:3090/` = 200.

The live browser rendered all of the following:

```text
Current DSH default model: lmstudio/unsloth/qwen3.8-27b
Configured DSH reasoning effort: none — adapter/provider resolves at request time
Current model reasoning contract: provider-owned — unknown from static DSH configuration; no exact alias contract is declared for this route
Daily brain alias reasoning default: off — LM Studio enableThinking default=false
Worker alias reasoning default: off — model declares reasoning=false
```

The rendered page contained neither `not sent (provider-owned)` nor `xhigh`.

## Real DSH field evidence

Fresh DSH session:

`C:\Users\scott\.dsh\sessions\--C-Users-scott-Desktop-Code--\session-b59212a5-3bac-42a8-a2b9-e86703056671\session.jsonl.zstd`

Session SHA-256 after completion:

`3DFD64864EAB663904D784D5B27B1F2C7C5359CE36676C40B1B6279B7A9C4F56`

The durable `request/header` config was exactly:

```json
{
  "provider": "lmstudio",
  "model": "unsloth/qwen3.8-27b"
}
```

Its keys were exactly `provider` and `model`. Neither `reasoningEffort` nor `reasoning` was present.

The model response contained:

- 276 characters of provider-returned reasoning;
- exact visible text `HALO_REASONING_REQUEST_OK`;
- stop reason `stop`;
- provider `lmstudio`;
- model `unsloth/qwen3.8-27b`.

This proves provider-default thinking occurred even though DSH did not inject a named effort. It does not prove a graded effort exists.

## Performance observation, not a contract failure

The fresh field turn reported:

- 17.3K input tokens;
- 67 output tokens;
- 125-second TTFT;
- 22 decode tokens/second;
- 2 minutes 8 seconds total;
- 0% cache hit.

That cold, prompt-heavy latency is a separate model/routing performance finding. It does not invalidate the reasoning contract, and no tuning conclusion is promoted from this single turn.

## Known boundary

The live and versioned settings files intentionally have different selected models. Their comments and schema are aligned; their model values are not forcibly synchronized because the live value is an operator selection, not configuration drift to overwrite silently.
