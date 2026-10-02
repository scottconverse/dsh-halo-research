# LM Studio effort catalog correction — activated 2026-10-02

Both Web and Desktop DSH now expose LM Studio reasoning capabilities, discovered from the non-generating `/api/v1/models` endpoint alongside the existing `lms ls` inventory. Authenticated running catalogs were checked after restart: both contain Orca Off/Medium, all local providers plus signed-in Claude/Codex routes, and zero catalog failures. Existing verified Qwen mappings, five curated cloud models and current selections were preserved. Desktop remains selected on Orca; Web remains web-fast High.

Orca uses 131,072 context and 24,576 maximum output tokens, matching the Q6 route's output budget. This is a request budget change, not a quantization or load-tuning change. The installed 15,676,553,472-byte Orca file is mixed precision OrcaSAQ2, with GGUF file_type 30 (IQ4_XS); it is not a standard Q6 file. Its tensor headers include higher precision types.

Binary reasoning metadata says Off/On. Chat Completions uses none/medium. Stock DSH's config schema accepts off/minimal/low/medium/high/xhigh/max but rejects `on` as a menu key. The candidate On mapping was rejected at activation; it was corrected to `off: none, medium: medium` before completion. Thus the visible menu is Off/Medium; Medium enables thinking and is a transport label, not proof of a graduated Medium budget. No extra effort levels were invented. Models without reasoning capability metadata keep no controls.

Two bounded serial requests addressed the existing resident Orca identifier, without loading/unloading models: none returned OK, zero reasoning tokens; medium returned OK, 26 reasoning tokens. Both stopped normally within a 256-token cap. This verifies the LM Studio wire toggle, not a resumed DSH coding benchmark. Authenticated DSH catalogs separately verify the exposed controls. Detailed evidence is in HALO-LMSTUDIO-EFFORT-EVIDENCE-2026-10-02.json.

Orca's preceding blind coding test ended at max-tokens after 8,192 output tokens without editing code or executing tests. It was not resumed. Increasing its budget is not evidence that it will now solve the challenge.

Canonical generator: stack/desktop-tuning/Refresh-Desktop-Model-Catalog.ps1, also deployed to C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval. Active profiles: that directory's home/profiles/desktop/cordis.patch.yml and C:\Users\scott\.dsh-stock\profiles/web/cordis.patch.yml. Regeneration retains the corrected controls and Orca budget. Canonical snapshots and Halo Stack Research recovery copies have been synchronized. Activation backups and probe records live in C:\Users\scott\Documents\Codex\2026-10-02\lmstudio-effort-catalog.

Only idle DSH hosts were restarted, using the Desktop executable with its existing DSH_HOME and a host-only Web launch. No model loading, unloading, LM Studio tuning, challenge edits or test resumption occurred.
