# Brain defaults to High — September 16, 2026

## Change

The 35B brain uses the stock pi-ai provider entry `lmstudio-brain` (display name **LM Studio brain**) with `reasoning: high`. Its existing model ID is still `halo-brain-35b`; Off maps to `none` and High maps to `high`. The coder stays on `lmstudio`, with the original Off provider default and `reasoningEfforts: false`. The startup model remains the coder.

This provider split is necessary because DSH 0.1.6-alpha.1 applies reasoning defaults per provider and rejects High for a model that does not support it. No upstream DSH source was modified and no plugin was added. Both entries point to `http://127.0.0.1:1234/v1` and keep their 131,072 context, 8,192 output limit and other settings. No LM Studio model definition or Claude harness was changed; the split does not create another loaded model.

The subagent model allowlist names the new brain route. Mission Control recognizes that route as local and indexes its existing alias definition. Its alias-default display describes LM Studio's underlying alias, separately from DSH's per-request High default.

## Verification

- A focused protocol test uses the installed, unmodified stock adapter and its actual HTTP serialization against a temporary loopback receiver. Brain default sends `reasoning_effort: high`; explicit Off sends `none`; coder sends no reasoning field. Model discovery reports High as the brain default and no reasoning control for the coder. Both context limits remain 131,072.
- The same check is run against repository and installed settings. The receiver substitutes only the inference endpoint and a dummy credential; it loads no model and performs no inference.
- Picker checks cover the two local providers while leaving cloud models available.
- Mission Control's installer runs its required reasoning, data, UI and installer suites before promoting the file. Its data checks include matching the new provider to the existing resident identifier.
- Boot-free `dsh --profile web --dump-config` succeeds. This checks profile composition, not a live agent session; the adapter test separately checks settings and requests.

## Installation and use

Canonical configuration: `stack/stock-dsh/settings.yaml`.

Installed configuration: `C:\Users\scott\.dsh-stock\settings.yaml`.

Installed Mission Control: `C:\Users\scott\.dsh-stock\mission-control\mission-control.mjs`.

Installed settings were edited selectively, preserving all other providers and settings. A pre-change settings copy is at `C:\Users\scott\Tools\model-trial\settings-before-brain-provider-20260916.yaml`; the Mission Control installer records its own backup and receipt.

No service restart, model load or inference benchmark was performed. The new configuration is ready for the next normal DSH launch; a running Mission Control uses its updated code after restart. Existing conversation histories were not rewritten. For a conversation saved with the old `lmstudio/halo-brain-35b` route, reselect the brain under **LM Studio brain**; select High if that conversation retained explicit Off. Claude's direct LM Studio connection requires no change.

Recovery copies and their SHA-256 manifest are synchronized under `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration`.
