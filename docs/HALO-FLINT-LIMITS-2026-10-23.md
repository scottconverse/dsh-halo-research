# Flint context and output correction — October 23, 2026

## Change
Scott authorized Flint-only limits of **262,144 context tokens (256K)** and **32,768 maximum output tokens (32K)** in DSH Web and Desktop. Both installed profiles and both tracked profile mirrors now contain those values for provider `lmstudio-library`, model `flint`.

The Flint-specific LM Studio concrete-model load setting is now 262,144 context, with one parallel prediction and full GPU offload unchanged. Both installed and tracked Desktop catalog refresh scripts retain Flint's new context and output values. Web's existing synchronization copies that catalog row without imposing another Flint cap.

## Reason and evidence
The previous 32K context / 8K output values were conservative short-check settings carried into the normal catalog without establishing the appropriate capacity. They were not Flint's limits.

- [Recursive's model card](https://huggingface.co/RecursiveSI/flint#model-specifications) documents 262,144 total context tokens and recommends at least 32,768 output tokens, including reasoning, for hard problems. Prompt and generated output share the context window; 32K is not a separately documented hard output maximum.
- Installed LM Studio 0.4.26+4 / Vulkan 2.63.0 reports a 262,144-token model maximum for the existing Unsloth UD-Q4_K_XL file.
- Prior read-only `lms load flint --context-length 131072 --parallel 1 --gpu max --estimate-only`: 30.69 GiB GPU memory. At 262144: 37.33 GiB. These are estimates, not successful full-context inference or quality measurements.

## Verification and preservation
All four profiles were parsed and compared against their immediate pre-change versions. Only Flint's two numerical limits changed. All other models, provider settings, chosen defaults, research integrations and permissions are structurally unchanged. DeepSeek 1017 remains the selected default with Low effort and 65,536 maximum output tokens. The saved LM Studio JSON comparison permits only Flint's context value to change; parallelism, GPU offload and prediction settings remain unchanged. The modified refresh script passed PowerShell syntax parsing.

No inference, model loads, app/model restarts, benchmarks or subagents were run for this change. Existing short-response acceptance belongs to the earlier 32K configuration and is not presented as 256K acceptance. Saved limits apply when the profiles are reloaded and Flint is next loaded; an already-running host or resident 32K instance is not claimed to have changed capacity in place.

One staging attempt failed YAML validation because the edit helper used an incorrect JavaScript replacement string. Validation ran before file writes, so no installed files were affected by that failure. The replacement was corrected, and the successful pass validated and read back all eight changed deployment/source files. Existing DSH `!!js` YAML tags produced generic-parser warnings; their exact text was preserved.

## Records and recovery
Sanitized verification: [limits-verification-2026-10-23.json](../stack/lmstudio-models/flint/limits-verification-2026-10-23.json). Private pre-change backups and the one task state record are under `C:/Users/scott/Documents/Codex/2026-10-23/flint-limits`; backups and raw private data are excluded from Git.

Halo Stack Research reading records and a dated recovery snapshot are synchronized, with SHA-256 manifest entries. This is a configuration correction only; no new release tag was requested. No model-job tokens were generated. Codex account-wide token accounting is not exposed by these configuration checks.
